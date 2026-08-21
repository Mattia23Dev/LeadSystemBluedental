/**
 * Reminder appuntamenti + conferma (flusso richiesto da Bludental, agosto 2026).
 *
 * Due job separati:
 *
 *  1) INVIO (default ogni ora)
 *     Legge dal MIRROR LOCALE (Lead.appuntamento, tenuto allineato da
 *     scripts/nexus-agenda-sync.js) gli appuntamenti in arrivo e chiede al
 *     qualificatore di mandare il template WhatsApp ("Ci sarai?" -> Si / No).
 *
 *     Due flussi distinti lato qualificatore, scelti in base a quanto manca:
 *       stage '4g' -> appuntamento fra STAGE_1G_ORE e STAGE_4G_ORE (default 24h-96h)
 *       stage '1g' -> appuntamento fra MIN_ORE e STAGE_1G_ORE   (default 3h-24h)
 *     Lo stesso appuntamento riceve quindi fino a DUE reminder: il primo qualche
 *     giorno prima, il secondo il giorno prima.
 *
 *     Le finestre sono "entro X ore", non "esattamente a N giorni": un appuntamento
 *     fissato o spostato con poco preavviso riceve comunque il reminder al primo
 *     giro utile (con il flusso giusto) invece di essere saltato per sempre.
 *     Non reinvia due volte lo STESSO stage per lo stesso orario; se l'appuntamento
 *     viene spostato (perDataOra != data/ora corrente) i reminder ripartono.
 *     Salta gli appuntamenti spariti dall'agenda Nexus (disdette) e chi ha gia'
 *     risposto NO (disdetta esplicita: inutile insistere il giorno prima).
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
 *   REMINDER_STAGE_4G_ORE        limite alto: oltre queste ore dall'appuntamento non si
 *                                invia nulla (default 96 = flusso "4 giorni")
 *   REMINDER_STAGE_1G_ORE        soglia fra i due flussi: sotto queste ore si usa il
 *                                flusso "1 giorno" (default 24)
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
 *   --stage 4g|1g  forza il flusso invece di dedurlo dalle ore mancanti
 *   --force  rimanda anche se quello stage per quell'orario e' gia' partito
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
const { isPilota, variabiliMessaggio } = require('../config/centri-bludental');
const { applicaConferma } = require('../helpers/statoConferma');

const ENABLED = String(process.env.REMINDER_ENABLED || 'false').toLowerCase() === 'true';
const DRY_RUN = String(process.env.REMINDER_DRY_RUN || 'true').toLowerCase() === 'true';
const STAGE_4G_ORE = Number(process.env.REMINDER_STAGE_4G_ORE || 96);
const STAGE_1G_ORE = Number(process.env.REMINDER_STAGE_1G_ORE || 24);
const FINESTRA_ORE = STAGE_4G_ORE;
const MIN_ORE = Number(process.env.REMINDER_MIN_ORE || 3);
const CUTOFF_ORE = Number(process.env.REMINDER_CUTOFF_ORE || 24);
const ATTESA_ORE = Number(process.env.REMINDER_ATTESA_ORE || 6);
// Perimetro del pilota: si scrive solo ai pazienti dei 15 centri (Rev. 2.0 §3.2).
// Metterlo a false apre l'invio a tutta la rete: da fare solo su decisione di Bludental.
const SOLO_PILOTA = String(process.env.REMINDER_SOLO_PILOTA || 'true').toLowerCase() === 'true';
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

/**
 * Divide i candidati per perimetro:
 *   dentro        centro nei 15 del pilota E censito in anagrafica -> si invia
 *   fuoriPerimetro centro valido ma non nel pilota                 -> non si invia
 *   senzaCentro   id centro assente o sconosciuto                  -> non si invia,
 *                 perche' senza citta' e indirizzo il messaggio non e' compilabile
 *
 * Con SOLO_PILOTA=false resta attivo il solo controllo sull'anagrafica: si puo'
 * allargare la rete, non si puo' mandare un messaggio senza indirizzo.
 */
function dividiPerPerimetro(leads) {
  const dentro = [];
  const fuoriPerimetro = [];
  const senzaCentro = [];
  for (const l of leads) {
    const centroId = l?.appuntamento?.centroId;
    if (!variabiliMessaggio(centroId)) { senzaCentro.push(l); continue; }
    if (SOLO_PILOTA && !isPilota(centroId)) { fuoriPerimetro.push(l); continue; }
    dentro.push(l);
  }
  return { dentro, fuoriPerimetro, senzaCentro };
}

/**
 * Quale flusso serve a questo appuntamento: '1g' se manca meno di STAGE_1G_ORE,
 * altrimenti '4g'. Restituisce null se l'appuntamento e' fuori da ogni finestra.
 */
function stagePerAppuntamento(dataOraTs, ora = Date.now()) {
  if (!dataOraTs) return null;
  const oreMancanti = (new Date(dataOraTs).getTime() - ora) / 3600000;
  if (oreMancanti < MIN_ORE || oreMancanti > STAGE_4G_ORE) return null;
  return oreMancanti <= STAGE_1G_ORE ? '1g' : '4g';
}

/** Questo stage, per questo preciso orario, e' gia' partito? */
function giaGestito(lead, stage) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  // Chi ha gia' detto NO ha disdetto: non lo si richiama il giorno prima.
  if (rem.perDataOra === app.dataOra && rem.risposta === 'NO') return true;
  const invii = Array.isArray(rem.invii) ? rem.invii : [];
  if (invii.some((i) => i.stage === stage && i.perDataOra === app.dataOra && i.esito === 'ok')) return true;
  // Retrocompatibilita' con gli invii fatti prima dello storico per stage.
  if (!invii.length && rem.perDataOra === app.dataOra && rem.esitoInvio === 'ok' && (rem.stage || '4g') === stage) return true;
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
    const perimetro = dividiPerPerimetro(inFinestra);
    const candidati = filtrato ? applicaFiltri(perimetro.dentro, opts) : perimetro.dentro;
    console.log(`[Reminder invio] finestra ${MIN_ORE}h-${STAGE_4G_ORE}h (stage 1g sotto ${STAGE_1G_ORE}h) | appuntamenti in agenda=${inFinestra.length} | nel pilota=${perimetro.dentro.length} | fuori perimetro=${perimetro.fuoriPerimetro.length} | senza centro=${perimetro.senzaCentro.length}${filtrato ? ` | dopo filtri=${candidati.length}` : ''} | soloPilota=${SOLO_PILOTA} | dryRun=${dryRun} | qualificatore=${isConfigurato() ? 'configurato' : 'NON configurato'}`);
    // Un appuntamento senza centro e' un buco di dato, non una scelta: va visto.
    for (const l of perimetro.senzaCentro.slice(0, 10)) {
      console.log(`[Reminder invio] SALTATA senza centro | lead=${l._id} | app=${l?.appuntamento?.dataOra} | centroId=${l?.appuntamento?.centroId || '-'}`);
    }

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

      // Il flusso da usare dipende da quanto manca; --stage lo forza (test).
      const stage = opts.stage || stagePerAppuntamento(app.dataOraTs);
      if (!stage) { saltati++; continue; }

      if (!opts.force && giaGestito(lead, stage)) { saltati++; continue; }

      const telefono = lead.numeroTelefono;
      if (!telefono) {
        senzaTelefono++;
        await log({ endpoint: 'cron:reminder-invio', source: 'reminder-appuntamento', matchedLeadId: lead._id, matchedIdNexus: lead.idNexus, payload: { dataOra: app.dataOra }, outcome: 'telefono_mancante' });
        continue;
      }

      if (dryRun) {
        const c = variabiliMessaggio(app.centroId);
        console.log(`[Reminder invio][DRY_RUN] lead=${lead._id} tel=${telefono} app=${app.dataOra} stage=${stage} centro=${c?.nome || '-'} (${c?.citta || '-'}, ${c?.indirizzo || '-'})`);
        inviati++;
        continue;
      }

      const res = await inviaReminder({
        lead,
        dataOra: app.dataOra,
        nome: lead.nome,
        cognome: lead.cognome,
        telefono,
        email: lead.email,
        stage,
        // Citta' e indirizzo vengono dall'anagrafica, non dalla stringa concatenata
        // di Nexus: sono due variabili distinte del template.
        centro: variabiliMessaggio(app.centroId),
      });

      const esito = res.ok ? 'ok' : (res.skipped ? 'skipped' : 'failed');
      const errore = res.ok ? null : JSON.stringify(res.error).slice(0, 500);
      const stessoOrario = rem.perDataOra === app.dataOra;
      // Orario spostato: lo storico degli invii per il vecchio orario non serve piu'.
      const invii = (stessoOrario && Array.isArray(rem.invii) ? rem.invii : []).slice(-9);

      lead.appuntamento.reminder = {
        ...(rem.toObject ? rem.toObject() : rem),
        inviatoAt: new Date(),
        perDataOra: app.dataOra,
        canale: 'whatsapp',
        stage,
        flowId: res.payload?.flow_id || null,
        connectorLeadId: res.data?.lead_id || null,
        connectorContactId: res.data?.contact_id || null,
        connectorConversationId: res.data?.conversation_id || null,
        esitoInvio: esito,
        errore,
        tentativi: (rem.tentativi || 0) + 1,
        invii: [...invii, {
          at: new Date(),
          stage,
          flowId: res.payload?.flow_id || null,
          perDataOra: app.dataOra,
          esito,
          errore,
          connectorLeadId: res.data?.lead_id || null,
          connectorContactId: res.data?.contact_id || null,
          connectorConversationId: res.data?.conversation_id || null,
        }],
        // Appuntamento spostato: la risposta data per il vecchio orario non vale piu'.
        risposta: stessoOrario ? rem.risposta : null,
        rispostaAt: stessoOrario ? rem.rispostaAt : null,
        statoConferma: stessoOrario ? rem.statoConferma : null,
      };
      await lead.save();

      if (res.ok) inviati++; else falliti++;
      console.log(`[Reminder invio] lead=${lead._id} tel=${telefono} app=${app.dataOra} stage=${stage} esito=${esito}${res.ok ? '' : ` errore=${errore}`}`);

      await log({
        endpoint: 'cron:reminder-invio',
        source: 'reminder-appuntamento',
        payload: { dataOra: app.dataOra, stage, spostato: !stessoOrario },
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
    else if (a === '--stage') opts.stage = argv[++i];
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
  console.log(`[Reminder] cron attivi | invio='${CRON_INVIO}' chiusura='${CRON_CHIUSURA}' | finestra=${MIN_ORE}h-${STAGE_4G_ORE}h (1g sotto ${STAGE_1G_ORE}h) cutoff=${CUTOFF_ORE}h attesa=${ATTESA_ORE}h dryRun=${DRY_RUN}`);
  cron.schedule(CRON_INVIO, () => invioOnce().catch((e) => console.error('[Reminder invio] schedule error:', e?.message || e)));
  cron.schedule(CRON_CHIUSURA, () => chiusuraOnce().catch((e) => console.error('[Reminder chiusura] schedule error:', e?.message || e)));
} else {
  console.log('[Reminder] cron NON attivi (REMINDER_ENABLED != true)');
}

module.exports = { invioOnce, chiusuraOnce, appuntamentiInFinestra, stagePerAppuntamento, giaGestito };
