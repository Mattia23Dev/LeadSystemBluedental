/**
 * Reminder appuntamenti + conferma (flusso richiesto da Bludental, agosto 2026).
 *
 * Due job separati:
 *
 *  1) INVIO (default ogni ora)
 *     Legge dal MIRROR LOCALE (Lead.appuntamento, tenuto allineato da
 *     scripts/nexus-agenda-sync.js) tutti gli appuntamenti che cadono nelle prossime
 *     72 ore e chiede al qualificatore di mandare il template WhatsApp
 *     ("Ci sarai?" -> Si / No).
 *     La finestra e' "entro 72h", non "esattamente a 3 giorni": un appuntamento
 *     fissato o spostato con meno di 3 giorni di preavviso riceve comunque il
 *     reminder al primo giro utile, invece di essere saltato per sempre.
 *     Non reinvia due volte per lo stesso orario; se l'appuntamento viene spostato
 *     (reminder.perDataOra != data/ora corrente) il reminder riparte.
 *     Salta gli appuntamenti spariti dall'agenda Nexus (disdette).
 *
 *  2) CHIUSURA NON RISPOSTE (default ogni ora)
 *     Chi non ha risposto entro CUTOFF ore dall'appuntamento viene marcato
 *     NO-CONFERMA su Nexus (campo stato_conferma), come da documento funzionale.
 *     Si aspettano comunque ATTESA ore dall'invio prima di dichiarare il silenzio,
 *     cosi' un reminder partito tardi non viene chiuso subito.
 *
 * Env:
 *   REMINDER_ENABLED             abilita i cron (default false: si accende quando il
 *                                qualificatore e' collegato e i test sono ok)
 *   REMINDER_DRY_RUN             true = nessun invio, nessuna scrittura (default true)
 *   REMINDER_FINESTRA_ORE        quanto prima dell'appuntamento si puo' inviare (default 72)
 *   REMINDER_MIN_ORE             sotto queste ore dall'appuntamento non si invia piu'
 *                                (default 3: un reminder a ridosso e' inutile)
 *   REMINDER_CUTOFF_ORE          ore prima dell'appuntamento oltre le quali la mancata
 *                                risposta diventa NO-CONFERMA (default 24)
 *   REMINDER_ATTESA_ORE          ore minime di attesa dall'invio prima di dichiarare
 *                                "nessuna risposta" (default 6)
 *   REMINDER_CRON                cron invio (default '5 * * * *')
 *   REMINDER_CLOSE_CRON          cron chiusura (default '35 * * * *')
 *   REMINDER_MAX_PER_RUN         tetto di sicurezza sugli invii per esecuzione (default 300)
 *   + le REMINDER_API_* di helpers/qualificatore.js
 *
 * Uso manuale (fase di test, con i cron spenti):
 *   node server/scripts/reminder-appuntamenti.js invio
 *     -> dry run su tutti gli appuntamenti in finestra, non invia nulla
 *   node server/scripts/reminder-appuntamenti.js invio --tel 3891884224 --live
 *     -> invio REALE alla sola lead con quel numero (--lead <idMongo> per l'id Mongo)
 *   node server/scripts/reminder-appuntamenti.js invio --limit 1 --live
 *     -> invio REALE al primo appuntamento in finestra
 *   --force  rimanda anche se il reminder per quell'orario e' gia' partito
 *   --live   e' rifiutato senza un filtro (--tel/--lead/--limit): niente invii di massa per errore
 *
 *   node server/scripts/reminder-appuntamenti.js chiusura
 */
// path esplicito: cosi' l'uso manuale funziona anche lanciato dalla root del repo
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');
const { inviaReminder, isConfigurato } = require('../helpers/qualificatore');
const { applicaConferma } = require('../helpers/statoConferma');

const ENABLED = String(process.env.REMINDER_ENABLED || 'false').toLowerCase() === 'true';
const DRY_RUN = String(process.env.REMINDER_DRY_RUN || 'true').toLowerCase() === 'true';
const FINESTRA_ORE = Number(process.env.REMINDER_FINESTRA_ORE || 72);
const MIN_ORE = Number(process.env.REMINDER_MIN_ORE || 3);
const CUTOFF_ORE = Number(process.env.REMINDER_CUTOFF_ORE || 24);
const ATTESA_ORE = Number(process.env.REMINDER_ATTESA_ORE || 6);
const CRON_INVIO = process.env.REMINDER_CRON || '5 * * * *';
const CRON_CHIUSURA = process.env.REMINDER_CLOSE_CRON || '35 * * * *';
const MAX_PER_RUN = Number(process.env.REMINDER_MAX_PER_RUN || 300);

let runningInvio = false;
let runningChiusura = false;

async function connetti() {
  if (mongoose.connection.readyState === 1) return false;
  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');
  await mongoose.connect(uri);
  return true;
}

async function log(doc) {
  try {
    await DeepagentLog.create(doc);
  } catch (e) {
    console.error('[Reminder] log fallito:', e?.message || e);
  }
}

/**
 * Appuntamenti da servire, letti dal mirror locale: tutti quelli che cadono fra
 * MIN_ORE e FINESTRA_ORE da adesso e che risultano ancora in agenda su Nexus.
 */
async function appuntamentiInFinestra(finestraOre = FINESTRA_ORE, minOre = MIN_ORE) {
  const ora = Date.now();
  const da = new Date(ora + minOre * 3600 * 1000);
  const a = new Date(ora + finestraOre * 3600 * 1000);

  return Lead.find({
    'appuntamento.dataOraTs': { $gte: da, $lte: a },
    // Appuntamento sparito dall'agenda Nexus = disdetto: niente reminder.
    'appuntamento.dataOraSparitaAt': null,
  })
    .sort({ 'appuntamento.dataOraTs': 1 })
    .limit(2000);
}

/** Il reminder per questo preciso orario e' gia' stato gestito? */
function giaGestito(lead) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  if (rem.perDataOra !== app.dataOra) return false; // orario nuovo o spostato: si rimanda
  if (rem.esitoInvio === 'ok') return true;
  if (rem.risposta) return true;
  return false;
}

/** Ultime 10 cifre del numero: unico confronto affidabile fra i formati in DB. */
function last10(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Restringe i candidati a quelli scelti a mano dalla CLI. Serve per le prove:
 * senza filtro un invio "live" partirebbe verso tutti gli appuntamenti in finestra.
 */
function applicaFiltri(candidati, opts) {
  let out = candidati;
  if (opts.leadId) out = out.filter((l) => String(l._id) === String(opts.leadId));
  if (opts.tel) {
    const t = last10(opts.tel);
    out = out.filter((l) => last10(l.numeroTelefono) === t);
  }
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

// ============================ 1) INVIO REMINDER ============================
/**
 * @param {object} opts  filtri della modalita' manuale:
 *   tel     invia solo alla lead con questo numero
 *   leadId  invia solo a questa lead (_id Mongo)
 *   limit   tetto sui candidati di questo giro
 *   force   ignora il dedup (rimanda anche se il reminder e' gia' partito)
 *   live    forza dryRun=false, ammesso solo con un filtro esplicito
 */
async function invioOnce(opts = {}) {
  if (runningInvio) return console.log('[Reminder invio] Skip: gia in esecuzione');
  runningInvio = true;
  const didConnect = await connetti().catch((e) => { throw e; });

  const filtrato = !!(opts.tel || opts.leadId || opts.limit);
  // --live senza filtro sarebbe un invio di massa: si rifiuta.
  if (opts.live && !filtrato) {
    runningInvio = false;
    if (didConnect) await mongoose.disconnect().catch(() => {});
    throw new Error('--live richiede un filtro esplicito (--tel, --lead o --limit)');
  }
  const dryRun = opts.live ? false : DRY_RUN;

  try {
    const inFinestra = await appuntamentiInFinestra();
    const candidati = filtrato ? applicaFiltri(inFinestra, opts) : inFinestra;
    console.log(`[Reminder invio] finestra ${MIN_ORE}h-${FINESTRA_ORE}h | appuntamenti in agenda=${inFinestra.length}${filtrato ? ` | dopo filtri=${candidati.length}` : ''} | dryRun=${dryRun} | qualificatore=${isConfigurato() ? 'configurato' : 'NON configurato'}`);

    if (filtrato && candidati.length === 0) {
      console.log('[Reminder invio] Nessuna lead corrisponde ai filtri. Appuntamenti attualmente in finestra:');
      for (const l of inFinestra.slice(0, 20)) {
        console.log(`   ${l._id} | ${l.numeroTelefono || '-'} | ${l?.appuntamento?.dataOra || '-'} | ${l.nome || '-'}`);
      }
    }

    let inviati = 0, saltati = 0, falliti = 0, senzaTelefono = 0;

    for (const lead of candidati) {
      if (inviati + falliti >= MAX_PER_RUN) {
        console.log(`[Reminder invio] Stop: raggiunto MAX_PER_RUN=${MAX_PER_RUN} (i rimanenti partono al giro successivo)`);
        break;
      }

      const app = lead.appuntamento || {};
      const rem = app.reminder || {};

      if (!opts.force && giaGestito(lead)) { saltati++; continue; }

      const telefono = lead.numeroTelefono;
      if (!telefono) {
        senzaTelefono++;
        await log({ endpoint: 'cron:reminder-invio', source: 'reminder-appuntamento', matchedLeadId: lead._id, matchedIdNexus: lead.idNexus, payload: { dataOra: app.dataOra }, outcome: 'telefono_mancante' });
        continue;
      }

      if (dryRun) {
        console.log(`[Reminder invio][DRY_RUN] lead=${lead._id} tel=${telefono} app=${app.dataOra}`);
        inviati++;
        continue;
      }

      const res = await inviaReminder({
        lead,
        dataOra: app.dataOra,
        nome: lead.nome,
        telefono,
        centro: lead.luogo,
        citta: lead.città,
        idNexus: lead.idNexus,
      });

      const stessoOrario = rem.perDataOra === app.dataOra;
      lead.appuntamento.reminder = {
        ...rem,
        inviatoAt: new Date(),
        perDataOra: app.dataOra,
        canale: 'whatsapp',
        esitoInvio: res.ok ? 'ok' : (res.skipped ? 'skipped' : 'failed'),
        errore: res.ok ? null : JSON.stringify(res.error).slice(0, 500),
        tentativi: (rem.tentativi || 0) + 1,
        // Appuntamento spostato: la risposta data per il vecchio orario non vale piu'.
        risposta: stessoOrario ? rem.risposta : null,
        rispostaAt: stessoOrario ? rem.rispostaAt : null,
        statoConferma: stessoOrario ? rem.statoConferma : null,
      };
      await lead.save();

      if (res.ok) inviati++; else falliti++;

      await log({
        endpoint: 'cron:reminder-invio',
        source: 'reminder-appuntamento',
        payload: { dataOra: app.dataOra, spostato: !stessoOrario },
        userPhone: telefono,
        matchedLeadId: lead._id,
        matchedIdNexus: lead.idNexus,
        nexusPayload: res.payload,
        nexusResponse: res.data,
        nexusError: res.error,
        outcome: res.ok ? 'reminder_inviato' : (res.skipped ? 'reminder_non_configurato' : 'reminder_fallito'),
      });
    }

    console.log(`[Reminder invio] Fine | inviati=${inviati} saltati=${saltati} falliti=${falliti} senzaTelefono=${senzaTelefono}`);
  } catch (e) {
    console.error('[Reminder invio] FAILED:', e?.response?.data || e.message || e);
  } finally {
    if (didConnect) await mongoose.disconnect().catch(() => {});
    runningInvio = false;
  }
}

// ====================== 2) CHIUSURA NON RISPOSTE ==========================
async function chiusuraOnce() {
  if (runningChiusura) return console.log('[Reminder chiusura] Skip: gia in esecuzione');
  runningChiusura = true;
  const didConnect = await connetti().catch((e) => { throw e; });

  try {
    const ora = new Date();
    const limite = new Date(ora.getTime() + CUTOFF_ORE * 3600 * 1000);
    // Il reminder deve essere partito da almeno ATTESA_ORE: un invio tardivo
    // (appuntamento fissato a ridosso) non va chiuso a NO-CONFERMA all'istante.
    const inviatoEntro = new Date(ora.getTime() - ATTESA_ORE * 3600 * 1000);

    // Appuntamenti futuri entro il cutoff, reminder inviato, nessuna risposta e
    // nessuno stato_conferma gia' scritto.
    const candidati = await Lead.find({
      'appuntamento.dataOraTs': { $gte: ora, $lte: limite },
      'appuntamento.dataOraSparitaAt': null,
      'appuntamento.reminder.esitoInvio': 'ok',
      'appuntamento.reminder.inviatoAt': { $lte: inviatoEntro },
      'appuntamento.reminder.risposta': { $in: [null, ''] },
      'appuntamento.reminder.statoConferma': { $in: [null, ''] },
    }).limit(MAX_PER_RUN);

    console.log(`[Reminder chiusura] candidati=${candidati.length} | cutoff=${CUTOFF_ORE}h | attesa=${ATTESA_ORE}h | dryRun=${DRY_RUN}`);

    let ok = 0, ko = 0;
    for (const lead of candidati) {
      const res = await applicaConferma(lead, 'NESSUNA', { dryRun: DRY_RUN, raw: { fonte: 'cron-chiusura' } });
      if (res.ok) ok++; else ko++;
      await log({
        endpoint: 'cron:reminder-chiusura',
        source: 'reminder-appuntamento',
        matchedLeadId: lead._id,
        matchedIdNexus: lead.idNexus,
        payload: { dataOra: lead?.appuntamento?.dataOra },
        nexusPayload: { id: lead.idNexus, stato_conferma: res.statoConferma },
        nexusResponse: res.nexus?.data,
        nexusError: res.nexus?.error,
        outcome: res.ok ? 'no_conferma_inviata' : `no_conferma_fallita:${res.motivo || 'errore'}`,
      });
    }
    console.log(`[Reminder chiusura] Fine | ok=${ok} falliti=${ko}`);
  } catch (e) {
    console.error('[Reminder chiusura] FAILED:', e?.response?.data || e.message || e);
  } finally {
    if (didConnect) await mongoose.disconnect().catch(() => {});
    runningChiusura = false;
  }
}

// ================================ bootstrap ================================
/** Flag della modalita' manuale: --tel / --lead / --limit / --force / --live */
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tel' || a === '--telefono') opts.tel = argv[++i];
    else if (a === '--lead' || a === '--leadId') opts.leadId = argv[++i];
    else if (a === '--limit') opts.limit = Number(argv[++i]) || 0;
    else if (a === '--force') opts.force = true;
    else if (a === '--live') opts.live = true;
  }
  return opts;
}

if (require.main === module) {
  const cmd = process.argv[2];
  const opts = parseArgs(process.argv.slice(3));
  const run = cmd === 'chiusura' ? () => chiusuraOnce() : () => invioOnce(opts);
  run()
    .then(() => process.exit(0))
    .catch((e) => { console.error('[Reminder]', e?.message || e); process.exit(1); });
} else if (ENABLED) {
  console.log(`[Reminder] cron attivi | invio='${CRON_INVIO}' chiusura='${CRON_CHIUSURA}' | finestra=${MIN_ORE}h-${FINESTRA_ORE}h cutoff=${CUTOFF_ORE}h attesa=${ATTESA_ORE}h dryRun=${DRY_RUN}`);
  cron.schedule(CRON_INVIO, () => invioOnce().catch((e) => console.error('[Reminder invio] schedule error:', e?.message || e)));
  cron.schedule(CRON_CHIUSURA, () => chiusuraOnce().catch((e) => console.error('[Reminder chiusura] schedule error:', e?.message || e)));
} else {
  console.log('[Reminder] cron NON attivi (REMINDER_ENABLED != true)');
}

module.exports = { invioOnce, chiusuraOnce, appuntamentiInFinestra };
