/**
 * Reminder appuntamenti + conferma (flusso richiesto da Bludental, agosto 2026).
 *
 * Due job separati:
 *
 *  1) INVIO (default ogni ora)
 *     Legge dal MIRROR LOCALE (Lead.appuntamento, tenuto allineato da
 *     scripts/nexus-agenda-sync.js) gli appuntamenti in arrivo e chiede al
 *     qualificatore di mandare il template WhatsApp giusto per il momento.
 *
 *     Il ciclo e' a TRE messaggi (Rev. 2.0 §3.4), e non sono tre copie dello stesso
 *     promemoria: ognuno ha un destinatario diverso, deciso dalla risposta ai precedenti.
 *
 *       stage '4g'  quattro giorni di calendario prima della visita
 *                   Primo promemoria con richiesta di conferma. Va a TUTTI.
 *                   SI -> SI-CONFERMA · NO -> NO-CONFERMA · silenzio -> non si scrive nulla
 *       stage '2g'  due giorni prima
 *                   Sollecito. Va SOLO a chi non ha ancora risposto.
 *                   SI -> SI-CONFERMA · NO -> NO-CONFERMA
 *                   silenzio per ATTESA_SOLLECITO_ORE -> NO-CONFERMA (job 2)
 *       stage '1g'  il giorno prima
 *                   Promemoria finale, senza richiesta di conferma. Va SOLO a chi ha
 *                   confermato, al primo o al secondo messaggio. Non scrive su Nexus.
 *
 *     Chi risponde NO esce dal ciclo: ha disdetto, non riceve altro.
 *
 *     Ogni messaggio vive nella SUA giornata e non si recupera altrove: il '4g' parte
 *     solo a quattro giorni dalla visita, il '2g' solo a due, il '1g' solo il giorno
 *     prima. Un appuntamento fissato con meno di quattro giorni di anticipo non riceve
 *     il primo promemoria - quel momento e' passato - e quindi non riceve nemmeno gli
 *     altri due, perche' il sollecito parlerebbe di una conferma mai chiesta e il
 *     promemoria finale va solo a chi ha confermato.
 *     Non reinvia due volte lo STESSO stage per lo stesso orario; se l'appuntamento
 *     viene spostato (perDataOra != data/ora corrente) il ciclo riparte da capo.
 *     Salta gli appuntamenti spariti dall'agenda Nexus (disdette).
 *
 *  2) MANCATA RISPOSTA AL PRIMO PROMEMORIA (default ogni ora)
 *     Passate REMINDER_ATTESA_ORE dal primo promemoria senza risposta, scrive su Nexus
 *     lo stato ATTESA-RISPOSTA: il contact center vede chi non ha confermato e puo'
 *     richiamarlo mentre il sollecito e' ancora davanti (richiesta Bludental 27/08/2026).
 *     NON chiude il ciclo e NON tocca reminder.statoConferma: il sollecito parte lo
 *     stesso e puo' ancora portare la lead a SI-CONFERMA o NO-CONFERMA. Se l'operatrice
 *     nel frattempo raccoglie la conferma al telefono e corregge il campo a video, quel
 *     valore torna a noi con la lettura periodica.
 *
 *  3) CHIUSURA NON RISPOSTE (default ogni ora)
 *     Il silenzio diventa NO-CONFERMA su Nexus solo DOPO il sollecito, non dopo il primo
 *     messaggio: e' quello che il testo del sollecito promette al paziente ("in assenza
 *     di riscontro entro la giornata odierna cancelleremo l'appuntamento").
 *     Si chiude solo chi il sollecito l'ha davvero ricevuto, e solo dopo che sono
 *     passate ATTESA_SOLLECITO_ORE da quel messaggio: chi ha ancora il sollecito davanti
 *     non va chiuso, e chi non l'ha mai ricevuto - perche' e' slittato fuori fascia o
 *     l'appuntamento era troppo vicino - resta senza esito invece che a NO-CONFERMA.
 *
 * Env:
 *   REMINDER_ENABLED             abilita i cron (default false: si accende quando il
 *                                qualificatore e' collegato e i test sono ok)
 *   REMINDER_DRY_RUN             true = nessun invio, nessuna scrittura (default true)
 *   REMINDER_STAGE_4G_ORE        limite alto: oltre queste ore dall'appuntamento non si
 *                                invia nulla (default 96 = primo promemoria)
 *   REMINDER_STAGE_2G_ORE        soglia del sollecito: sotto queste ore si usa il flusso
 *                                "2 giorni" (default 48)
 *   REMINDER_STAGE_1G_ORE        soglia del promemoria finale: sotto queste ore si usa il
 *                                flusso "1 giorno" (default 24)
 *   REMINDER_MIN_ORE             sotto queste ore dall'appuntamento non si invia piu'
 *                                (default 3: un reminder a ridosso e' inutile)
 *   REMINDER_ATTESA_SOLLECITO_ORE  ore di silenzio dopo il sollecito oltre le quali si
 *                                scrive NO-CONFERMA (default 12, come da testo Bludental)
 *   REMINDER_ATTESA_ORE          ore di silenzio dopo il PRIMO promemoria oltre le quali
 *                                si scrive ATTESA-RISPOSTA (default 12)
 *   REMINDER_DISTANZA_MIN_ORE    distanza minima fra due messaggi dello stesso ciclo
 *                                (default 12): protegge gli appuntamenti agganciati tardi
 *   REMINDER_GRAZIA_FISSAGGIO_ORE ore di respiro fra il fissaggio dell'appuntamento e il
 *                                primo promemoria (default 3): evita di scrivere al
 *                                paziente pochi minuti dopo che ha prenotato. Se
 *                                l'appuntamento e' troppo vicino il messaggio parte subito.
 *   REMINDER_ORA_INIZIO          prima ora utile per scrivere al paziente (default 8)
 *   REMINDER_ORA_FINE            ultima ora utile (default 19: l'ultimo giro e' il 19:05)
 *   REMINDER_PRIMO_MIN_ORE       anticipo minimo perche' il PRIMO promemoria parta e la
 *                                lead entri nel ciclo (default 0 = disattivato). Messo a
 *                                48 all'accensione: chi ha la visita entro due giorni
 *                                resta fuori, invece di ricevere il testo dei "-4 giorni".
 *   REMINDER_STATO_SI / _NO / _ATTESA  i tre valori scritti su stato_conferma. Sono
 *                                convenzioni concordate con Bludental, non costanti:
 *                                rinominarne uno e' configurazione, non rilascio.
 *   REMINDER_CRON                cron invio (default '5 * * * *')
 *   REMINDER_ATTESA_CRON         cron mancata risposta (default '20 * * * *')
 *   REMINDER_CLOSE_CRON          cron chiusura (default '35 * * * *')
 *   REMINDER_MAX_PER_RUN         tetto di sicurezza sugli invii per esecuzione (default 300)
 *   REMINDER_WHITELIST_ATTIVA    fase di test: si scrive solo ai numeri di collaudo
 *                                (config/test-whitelist.js). Default true; va messa a
 *                                false solo per aprire l'invio ai pazienti veri.
 *   + le REMINDER_API_* di helpers/qualificatore.js
 *
 * Uso manuale (fase di test, con i cron spenti):
 *   node server/scripts/reminder-appuntamenti.js invio
 *     -> dry run su tutti gli appuntamenti in finestra, non invia nulla
 *   node server/scripts/reminder-appuntamenti.js invio --tel 3891884224 --live
 *     -> invio REALE alla sola lead con quel numero (--lead <idMongo> per l'id Mongo)
 *   node server/scripts/reminder-appuntamenti.js invio --limit 1 --live
 *     -> invio REALE al primo appuntamento in finestra
 *   --stage 4g|2g|1g  forza il flusso invece di dedurlo dalle ore mancanti
 *   --force  rimanda anche se quello stage per quell'orario e' gia' partito, e ignora
 *            le regole su chi puo' riceverlo (serve a provare i template a comando)
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
const whitelist = require('../config/test-whitelist');
const { applicaConferma, applicaAttesa, ATTESA } = require('../helpers/statoConferma');

const ENABLED = String(process.env.REMINDER_ENABLED || 'false').toLowerCase() === 'true';
const DRY_RUN = String(process.env.REMINDER_DRY_RUN || 'true').toLowerCase() === 'true';
const STAGE_4G_ORE = Number(process.env.REMINDER_STAGE_4G_ORE || 96);
const STAGE_2G_ORE = Number(process.env.REMINDER_STAGE_2G_ORE || 48);
const STAGE_1G_ORE = Number(process.env.REMINDER_STAGE_1G_ORE || 24);
const FINESTRA_ORE = STAGE_4G_ORE;
const MIN_ORE = Number(process.env.REMINDER_MIN_ORE || 3);
// "In assenza di riscontro entro la giornata odierna cancelleremo l'appuntamento":
// il testo del sollecito da' al paziente una giornata, non un orario preciso.
const ATTESA_SOLLECITO_ORE = Number(process.env.REMINDER_ATTESA_SOLLECITO_ORE || 12);
// Perimetro del pilota: si scrive solo ai pazienti dei 16 centri (Rev. 2.0 §3.2 +
// Bologna Emilia Ponente).
// Metterlo a false apre l'invio a tutta la rete: da fare solo su decisione di Bludental.
const SOLO_PILOTA = String(process.env.REMINDER_SOLO_PILOTA || 'true').toLowerCase() === 'true';
// Ore di silenzio dopo il PRIMO promemoria oltre le quali si segnala la mancata
// risposta su Nexus (mail Caterina 27/08/2026). Non chiude il ciclo: serve a far
// partire il recall telefonico del contact center mentre il sollecito e' ancora davanti.
const ATTESA_PRIMO_ORE = Number(process.env.REMINDER_ATTESA_ORE || 12);
// Distanza minima fra due messaggi dello stesso ciclo. Le finestre si calcolano
// sull'orario dell'appuntamento, non su cosa abbiamo gia' detto al paziente: senza
// questa soglia, un appuntamento agganciato tardi (prenotato con poco anticipo, o preso
// in carico all'accensione del servizio) riceve il primo promemoria e il sollecito a
// un'ora di distanza. Il sollecito non viene annullato, viene rimandato.
const DISTANZA_MIN_ORE = Number(process.env.REMINDER_DISTANZA_MIN_ORE || 12);
// Anticipo minimo perche' il ciclo si apra: sotto queste ore dall'appuntamento il PRIMO
// promemoria non parte, e quindi la lead non entra proprio nel ciclo. Vale solo per il
// primo messaggio: sollecito e promemoria finale di chi e' gia' dentro non si toccano.
// Serve all'accensione del servizio, per non mandare il testo dei "-4 giorni" a chi ha
// la visita domani, e resta utile a regime per le prenotazioni dell'ultimo minuto.
// 0 = disattivato.
const PRIMO_MIN_ORE = Number(process.env.REMINDER_PRIMO_MIN_ORE || 0);
// Fascia oraria in cui e' lecito scrivere al paziente, ora italiana. Fuori da qui il
// giro non invia: il messaggio non si perde, parte al primo giro utile del mattino.
// Vale solo per i messaggi al paziente; le scritture su Nexus (ATTESA-RISPOSTA e la
// chiusura) restano libere, perche' le legge il contact center e non disturbano nessuno.
// Respiro fra il fissaggio e il primo promemoria. Il 17,5% degli appuntamenti nasce
// gia' dentro la finestra dei 4 giorni (misurato il 31/08/2026): senza questa attesa il
// paziente che prenota alle 17 riceve alle 17:05 un messaggio che gli chiede di
// confermare quello che ha appena concordato con l'operatrice. Non salta nessun invio:
// se l'appuntamento e' cosi' vicino che aspettare significherebbe perdere il messaggio,
// il promemoria parte subito.
const GRAZIA_FISSAGGIO_ORE = Number(process.env.REMINDER_GRAZIA_FISSAGGIO_ORE || 3);
const ORA_INIZIO = Number(process.env.REMINDER_ORA_INIZIO || 8);
const ORA_FINE = Number(process.env.REMINDER_ORA_FINE || 19);
const CRON_INVIO = process.env.REMINDER_CRON || '5 * * * *';
const CRON_CHIUSURA = process.env.REMINDER_CLOSE_CRON || '35 * * * *';
const CRON_ATTESA = process.env.REMINDER_ATTESA_CRON || '20 * * * *';
const MAX_PER_RUN = Number(process.env.REMINDER_MAX_PER_RUN || 300);

/**
 * L'ora italiana, calcolata esplicitamente: il server gira a UTC e in estate
 * getHours() darebbe due ore in meno, spostando tutta la fascia.
 */
function oraItaliana(ts = Date.now()) {
  const s = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }).format(new Date(ts));
  return Number(s);
}

/** La data italiana in forma AAAA-MM-GG: serve a ragionare per GIORNI, non per ore. */
function giornoItaliano(ts = Date.now()) {
  const p = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(ts));
  const v = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

/** L'appuntamento cade domani? Il testo del promemoria finale dice "di domani": se lo
 *  mandassimo il giorno stesso direbbe una cosa falsa. */
function eDomani(appTs, ts = Date.now()) {
  const domani = giornoItaliano(new Date(ts).getTime() + 24 * 3600 * 1000);
  return giornoItaliano(appTs) === domani;
}

/** Si puo' scrivere al paziente adesso? */
function dentroFasciaOraria(ts = Date.now()) {
  const h = oraItaliana(ts);
  return h >= ORA_INIZIO && h <= ORA_FINE;
}

let runningInvio = false;
let runningChiusura = false;
let runningAttesa = false;

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
async function appuntamentiInFinestra(finestraOre = FINESTRA_ORE + 24, minOre = MIN_ORE) {
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
 * L'appuntamento risulta gia' mancato pur essendo ancora futuro?
 *
 * Due segnali, in ordine di affidabilita'.
 *
 * Il primo e' esplicito: quando il centro cancella la visita su Deasoft, Nexus porta
 * l'esito a "annullato deasoft" (verificato il 02/09/2026 su otto appuntamenti, tutti
 * pazienti che avevano disdetto rispondendo al nostro promemoria).
 *
 * Il secondo e' un ripiego per quando l'esito non e' ancora aggiornato: il flag di no
 * show acceso su una visita futura, con `data_ora_mancato_appuntamento` uguale alla data
 * dell'appuntamento stesso. E' una contraddizione - non si puo' mancare una visita prima
 * che avvenga - e in pratica vuol dire che quell'appuntamento non ci sara'. Il 01/09 due
 * pazienti avevano ricevuto il promemoria per una visita gia' cancellata dal centro.
 *
 * Su un appuntamento passato la stessa condizione e' invece del tutto normale: e' un
 * no show vero, e infatti si guarda solo il futuro.
 */
function risultaAnnullato(lead, ora = Date.now()) {
  const app = lead?.appuntamento || {};
  if (!app.dataOra || !app.dataOraTs) return false;
  if (new Date(app.dataOraTs).getTime() <= ora) return false;

  // Segnale esplicito: quando il centro cancella su Deasoft, Nexus porta l'esito a
  // "annullato deasoft". E' il modo piu' solido, quando c'e'.
  if (/annullat/i.test(String(app.esitoCorrente || ''))) return true;

  // Ripiego, per quando l'esito non e' ancora stato aggiornato: il flag di mancato
  // appuntamento acceso su una visita futura, con la data della visita stessa.
  if (!app.noShow || !app.noShowDataOra) return false;
  return String(app.noShowDataOra).slice(0, 10) === String(app.dataOra).slice(0, 10);
}

/**
 * Divide i candidati per perimetro:
 *   dentro         centro nel pilota, censito in anagrafica, numero ammesso -> si invia
 *   fuoriPerimetro centro valido ma non nel pilota                 -> non si invia
 *   senzaCentro    id centro assente o sconosciuto                 -> non si invia,
 *                  perche' senza citta' e indirizzo il messaggio non e' compilabile
 *   fuoriWhitelist fase di test: numero non nel gruppo di collaudo -> non si invia
 *
 * Con SOLO_PILOTA=false resta attivo il solo controllo sull'anagrafica: si puo'
 * allargare la rete, non si puo' mandare un messaggio senza indirizzo.
 *
 * Il filtro whitelist e' qui solo per avere il conteggio nei log: il blocco vero e
 * proprio vive dentro inviaReminder(), che nessun chiamante puo' scavalcare.
 */
function dividiPerPerimetro(leads) {
  const dentro = [];
  const fuoriPerimetro = [];
  const senzaCentro = [];
  const fuoriWhitelist = [];
  const annullati = [];
  for (const l of leads) {
    const centroId = l?.appuntamento?.centroId;
    if (risultaAnnullato(l)) { annullati.push(l); continue; }
    if (!variabiliMessaggio(centroId)) { senzaCentro.push(l); continue; }
    if (SOLO_PILOTA && !isPilota(centroId)) { fuoriPerimetro.push(l); continue; }
    if (!whitelist.isConsentito(l?.numeroTelefono)) { fuoriWhitelist.push(l); continue; }
    dentro.push(l);
  }
  return { dentro, fuoriPerimetro, senzaCentro, fuoriWhitelist, annullati };
}

/**
 * Quale finestra sta attraversando l'appuntamento adesso: '4g', '2g' o '1g'.
 * null se e' troppo lontano o troppo vicino perche' valga la pena scrivere.
 * Attenzione: dice il MOMENTO, non il messaggio da mandare - quello lo decide
 * messaggioDaInviare(), che guarda anche cosa e' gia' successo.
 */
function giorniDiDistanza(appTs, ora = Date.now()) {
  // Differenza in GIORNI DI CALENDARIO italiani, non in multipli di 24 ore: quello che
  // conta e' "fra quattro giorni", non "fra 96 ore".
  const g1 = giornoItaliano(ora);
  const g2 = giornoItaliano(appTs);
  const d1 = new Date(`${g1}T00:00:00Z`).getTime();
  const d2 = new Date(`${g2}T00:00:00Z`).getTime();
  return Math.round((d2 - d1) / 86400000);
}

function stagePerAppuntamento(dataOraTs, ora = Date.now()) {
  if (!dataOraTs) return null;
  const appTs = new Date(dataOraTs).getTime();
  const oreMancanti = (appTs - ora) / 3600000;
  // Sotto il minimo non si scrive piu': a ridosso della visita il messaggio non serve
  // e la risposta non fa in tempo a essere utile al centro.
  if (oreMancanti < MIN_ORE) return null;
  switch (giorniDiDistanza(appTs, ora)) {
    case 4: return '4g';   // il messaggio dei quattro giorni, nella sua giornata
    case 2: return '2g';   // il sollecito, due giorni prima
    case 1: return '1g';   // il promemoria finale, il giorno prima
    default: return null;  // a tre giorni, il giorno stesso o piu' in la': niente
  }
}

/** La risposta del paziente per l'orario attualmente in agenda ('SI' | 'NO' | null). */
function rispostaCorrente(lead) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  if (rem.perDataOra !== app.dataOra) return null; // risposta data per un orario ormai spostato
  return rem.risposta || null;
}

/** Questo stage, per questo preciso orario, e' gia' partito con esito ok? */
function giaInviato(lead, stage) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  const invii = Array.isArray(rem.invii) ? rem.invii : [];
  if (invii.some((i) => i.stage === stage && i.perDataOra === app.dataOra && i.esito === 'ok')) return true;
  // Retrocompatibilita' con gli invii fatti prima dello storico per stage.
  if (!invii.length && rem.perDataOra === app.dataOra && rem.esitoInvio === 'ok' && (rem.stage || '4g') === stage) return true;
  return false;
}

/** Quando e' partito con successo quello stage per l'orario attuale (null se mai). */
function inviatoAt(lead, stage) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  const invii = Array.isArray(rem.invii) ? rem.invii : [];
  const riga = invii.filter((i) => i.stage === stage && i.perDataOra === app.dataOra && i.esito === 'ok').pop();
  if (riga?.at) return new Date(riga.at);
  // Invii precedenti allo storico per stage: c'e' solo il blocco piatto.
  if (!invii.length && rem.perDataOra === app.dataOra && rem.esitoInvio === 'ok' && (rem.stage || '4g') === stage) {
    return rem.inviatoAt ? new Date(rem.inviatoAt) : null;
  }
  return null;
}

/** L'ultimo messaggio del ciclo partito con successo per l'orario attuale. */
function ultimoInvioAt(lead) {
  const app = lead.appuntamento || {};
  const rem = app.reminder || {};
  const invii = Array.isArray(rem.invii) ? rem.invii : [];
  const validi = invii.filter((i) => i.perDataOra === app.dataOra && i.esito === 'ok' && i.at);
  if (validi.length) return new Date(Math.max(...validi.map((i) => new Date(i.at).getTime())));
  if (!invii.length && rem.perDataOra === app.dataOra && rem.esitoInvio === 'ok' && rem.inviatoAt) {
    return new Date(rem.inviatoAt);
  }
  return null;
}

/**
 * Il messaggio da mandare adesso a questa lead, o null se non le tocca niente.
 *
 * La finestra dice a che punto siamo, ma il destinatario di ogni messaggio dipende da
 * cosa ha risposto finora (Rev. 2.0 §3.4):
 *   - chi ha detto NO e' fuori dal ciclo;
 *   - il primo promemoria va a tutti, e va anche a chi si aggancia tardi: se non l'ha
 *     mai ricevuto glielo si manda comunque, perche' il sollecito ("non abbiamo ancora
 *     ricevuto conferma") a chi non ha mai ricevuto nulla direbbe una cosa falsa;
 *   - il sollecito va solo a chi ha ricevuto il primo e non ha risposto;
 *   - il promemoria finale va solo a chi ha confermato.
 *
 * @returns {{stage:string}|{stage:null, motivo:string}}
 */
function messaggioDaInviare(lead, finestra, ora = Date.now()) {
  if (!finestra) return { stage: null, motivo: 'fuori_finestra' };

  const risposta = rispostaCorrente(lead);
  if (risposta === 'NO') return { stage: null, motivo: 'ha_disdetto' };

  // Il primo promemoria E' il messaggio dei -4 giorni: parte solo nella sua finestra.
  // Se l'appuntamento nasce gia' dentro i quattro giorni quel momento e' passato, e non
  // si recupera mandandolo piu' tardi: arriverebbe come un "-4 giorni" a due giorni
  // dalla visita. Senza il primo non partono nemmeno gli altri due, perche' il sollecito
  // parla di una conferma mai chiesta e il finale va solo a chi ha confermato.
  if (!giaInviato(lead, '4g')) {
    // Chi ha prenotato con meno di quattro giorni non entra nel ciclo, ma il giorno
    // prima riceve comunque il promemoria: stesso testo del finale, quindi senza
    // richiesta di conferma. Meglio un promemoria senza conferma che il silenzio.
    const primoPossibile = finestra === '4g' ? '4g' : (finestra === '1g' ? '1g' : null);
    if (!primoPossibile) return { stage: null, motivo: 'fuori_dalle_giornate_previste' };
    if (primoPossibile === '1g' && giaInviato(lead, '1g')) {
      return { stage: null, motivo: 'finale_gia_inviato' };
    }
    // Appena fissato: si lascia passare un po' di tempo, ma solo se ce n'e' da perdere.
    if (GRAZIA_FISSAGGIO_ORE > 0) {
      const app = lead.appuntamento || {};
      const sp = Array.isArray(app.spostamenti) ? app.spostamenti : [];
      // Quando e' comparso l'orario ATTUALE: l'ultimo spostamento, o la prima volta che
      // abbiamo visto una data su questo appuntamento.
      const visto = sp.length ? sp[sp.length - 1].at : app.dataOraPrimaAt;
      const oreAll = app.dataOraTs ? (new Date(app.dataOraTs).getTime() - ora) / 3600000 : Infinity;
      const daPocoFissato = visto && (ora - new Date(visto).getTime()) < GRAZIA_FISSAGGIO_ORE * 3600 * 1000;
      // Il respiro si prende solo se non costa niente: deve restare nella stessa
      // giornata e dentro la fascia. Rimandare a domani mattina allontanerebbe il
      // promemoria dal suo momento (-4 giorni) e, per un appuntamento dell'indomani,
      // lo farebbe arrivare il giorno stesso della visita.
      const dopoLaGrazia = ora + GRAZIA_FISSAGGIO_ORE * 3600 * 1000;
      const restaOggi = giornoItaliano(dopoLaGrazia) === giornoItaliano(ora) && dentroFasciaOraria(dopoLaGrazia);
      if (daPocoFissato && restaOggi && oreAll > GRAZIA_FISSAGGIO_ORE + MIN_ORE) {
        return { stage: null, motivo: 'appena_fissato' };
      }
    }
    if (PRIMO_MIN_ORE > 0) {
      const ts = lead?.appuntamento?.dataOraTs;
      const ore = ts ? (new Date(ts).getTime() - ora) / 3600000 : Infinity;
      if (ore < PRIMO_MIN_ORE) return { stage: null, motivo: 'primo_troppo_a_ridosso' };
    }
    return { stage: primoPossibile };
  }

  // Distanza minima dal messaggio precedente. Le finestre guardano solo l'orario
  // dell'appuntamento: senza questo, un appuntamento agganciato tardi riceve primo
  // promemoria e sollecito a un'ora di distanza. Il messaggio non viene annullato,
  // viene rimandato al primo giro utile oltre la soglia.
  const ultimo = ultimoInvioAt(lead);
  if (ultimo && (ora - ultimo.getTime()) < DISTANZA_MIN_ORE * 3600 * 1000) {
    return { stage: null, motivo: 'troppo_ravvicinato' };
  }

  if (finestra === '4g') return { stage: null, motivo: 'primo_gia_inviato' };

  if (risposta === 'SI') {
    // Ha confermato: gli resta solo il promemoria finale, nelle ultime ore.
    if (finestra !== '1g') return { stage: null, motivo: 'gia_confermato' };
    if (giaInviato(lead, '1g')) return { stage: null, motivo: 'finale_gia_inviato' };
    // Il testo dice "il Suo appuntamento di domani": va mandato il giorno prima, non
    // il giorno stesso. La finestra di 24 ore da sola non basta a garantirlo.
    const appTs = lead?.appuntamento?.dataOraTs;
    if (appTs && !eDomani(new Date(appTs).getTime(), ora)) {
      return { stage: null, motivo: 'finale_non_e_domani' };
    }
    return { stage: '1g' };
  }

  // Nessuna risposta: gli tocca il sollecito, ed e' il messaggio dei -2 giorni.
  // Anche questo sta nella sua giornata: fuori di li' il testo direbbe una cosa falsa
  // ("entro la giornata odierna cancelleremo" mandato la mattina della visita e' un
  // ultimatum di poche ore).
  if (finestra !== '2g') return { stage: null, motivo: 'fuori_dai_due_giorni' };
  if (giaInviato(lead, '2g')) return { stage: null, motivo: 'sollecito_gia_inviato' };
  return { stage: '2g' };
}

/**
 * Stessa persona, stesso appuntamento: una sola volta.
 * Su Mongo capita che lo stesso paziente esista come due lead distinte (due form
 * compilati, due campagne) e che entrambe puntino allo stesso appuntamento Nexus.
 * Senza questo filtro riceverebbe due messaggi identici a un secondo di distanza.
 * Si tiene la lead vista per prima; le altre vengono contate e loggate.
 */
function scartaDoppioni(leads) {
  const visti = new Map();
  const tenuti = [];
  const scartati = [];
  for (const l of leads) {
    const chiave = `${last10(l.numeroTelefono)}|${l?.appuntamento?.dataOra || ''}`;
    if (visti.has(chiave)) { scartati.push({ lead: l, tenuta: visti.get(chiave) }); continue; }
    visti.set(chiave, l._id);
    tenuti.push(l);
  }
  return { tenuti, scartati };
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

  // Fascia oraria: vale per il giro automatico. Un invio manuale mirato (--tel/--lead)
  // serve alle prove e passa comunque, altrimenti non si potrebbe collaudare di sera.
  if (!filtrato && !dentroFasciaOraria()) {
    console.log(`[Reminder invio] Fuori fascia oraria (${ORA_INIZIO}:00-${ORA_FINE}:59, ora italiana: adesso sono le ${oraItaliana()}): nessun invio, si riprende al primo giro utile.`);
    runningInvio = false;
    if (didConnect) await mongoose.disconnect().catch(() => {});
    return;
  }

  try {
    const inFinestra = await appuntamentiInFinestra();
    const perimetro = dividiPerPerimetro(inFinestra);
    const grezzi = filtrato ? applicaFiltri(perimetro.dentro, opts) : perimetro.dentro;
    const { tenuti: candidati, scartati: doppioni } = scartaDoppioni(grezzi);
    console.log(`[Reminder invio] giornate: 4g = 4 giorni prima · 2g = 2 giorni prima · 1g = il giorno prima (minimo ${MIN_ORE}h dalla visita) | appuntamenti in agenda=${inFinestra.length} | da servire=${perimetro.dentro.length} | fuori perimetro=${perimetro.fuoriPerimetro.length} | senza centro=${perimetro.senzaCentro.length} | gia annullati=${perimetro.annullati.length} | fuori whitelist=${perimetro.fuoriWhitelist.length}${filtrato ? ` | dopo filtri=${candidati.length}` : ''}${doppioni.length ? ` | doppioni scartati=${doppioni.length}` : ''} | soloPilota=${SOLO_PILOTA} | dryRun=${dryRun} | qualificatore=${isConfigurato() ? 'configurato' : 'NON configurato'}`);
    console.log(`[Reminder invio] ${whitelist.descrizione()}`);
    for (const d of doppioni) {
      console.log(`[Reminder invio] DOPPIONE scartato | lead=${d.lead._id} | tel=${d.lead.numeroTelefono} | app=${d.lead?.appuntamento?.dataOra} | gia servita dalla lead ${d.tenuta}`);
    }

    for (const l of perimetro.annullati) {
      console.log(`[Reminder invio] ANNULLATO, non si scrive | lead=${l._id} | app=${l?.appuntamento?.dataOra} | mancato=${l?.appuntamento?.noShowDataOra}`);
    }

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
    // Perche' una lead in finestra non ha ricevuto niente: senza questo conteggio un
    // "saltati=37" non dice se il ciclo sta funzionando o se e' rotto qualcosa.
    const motivi = new Map();

    for (const lead of candidati) {
      if (inviati + falliti >= MAX_PER_RUN) {
        console.log(`[Reminder invio] Stop: raggiunto MAX_PER_RUN=${MAX_PER_RUN} (i rimanenti partono al giro successivo)`);
        break;
      }

      const app = lead.appuntamento || {};
      const rem = app.reminder || {};

      // La finestra dice a che punto del ciclo siamo, la macchina a stati decide se a
      // questa lead tocca un messaggio e quale. --stage forza la mano (prove manuali).
      const finestra = stagePerAppuntamento(app.dataOraTs);
      let stage;
      if (opts.stage) {
        stage = opts.stage;
        if (!opts.force && giaInviato(lead, stage)) { saltati++; motivi.set('gia_inviato', (motivi.get('gia_inviato') || 0) + 1); continue; }
      } else {
        const scelta = messaggioDaInviare(lead, finestra);
        if (!scelta.stage && !opts.force) {
          saltati++;
          motivi.set(scelta.motivo, (motivi.get(scelta.motivo) || 0) + 1);
          continue;
        }
        // --force senza --stage: si rimanda il messaggio della finestra corrente.
        stage = scelta.stage || finestra;
        if (!stage) { saltati++; motivi.set('fuori_finestra', (motivi.get('fuori_finestra') || 0) + 1); continue; }
      }

      const telefono = lead.numeroTelefono;
      if (!telefono) {
        senzaTelefono++;
        await log({ endpoint: 'cron:reminder-invio', source: 'reminder-appuntamento', matchedLeadId: lead._id, matchedIdNexus: lead.idNexus, payload: { dataOra: app.dataOra }, outcome: 'telefono_mancante' });
        continue;
      }

      if (dryRun) {
        const c = variabiliMessaggio(app.centroId);
        console.log(`[Reminder invio][DRY_RUN] lead=${lead._id} tel=${telefono}${whitelist.etichetta(telefono) ? ` (${whitelist.etichetta(telefono)})` : ''} app=${app.dataOra} stage=${stage} centro=${c?.nome || '-'} (${c?.citta || '-'}, ${c?.indirizzo || '-'})`);
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
        outcome: res.ok ? 'reminder_inviato'
          : res.blocked ? 'reminder_bloccato_whitelist'
          : res.skipped ? 'reminder_non_configurato'
          : 'reminder_fallito',
      });
    }

    const dettaglioSaltati = [...motivi.entries()].map(([m, n]) => `${m}=${n}`).join(' ');
    console.log(`[Reminder invio] Fine | inviati=${inviati} saltati=${saltati} falliti=${falliti} senzaTelefono=${senzaTelefono}${dettaglioSaltati ? ` | saltati per: ${dettaglioSaltati}` : ''}`);
  } catch (e) {
    console.error('[Reminder invio] FAILED:', e?.response?.data || e.message || e);
  } finally {
    if (didConnect) await mongoose.disconnect().catch(() => {});
    runningInvio = false;
  }
}

// ============= 2) SEGNALAZIONE DELLA MANCATA RISPOSTA AL PRIMO =============
/**
 * Scrive ATTESA-RISPOSTA su Nexus per chi, passate ATTESA_PRIMO_ORE dal primo
 * promemoria, non ha ancora risposto. Serve al contact center per prendere in carico
 * il paziente e richiamarlo (mail Caterina 27/08/2026).
 *
 * Non e' una chiusura: la lead resta nel ciclo, riceve comunque il sollecito a -2
 * giorni e da li' puo' ancora diventare SI-CONFERMA o NO-CONFERMA. Per questo il
 * valore NON viene scritto in `reminder.statoConferma`, che resta l'esito finale e
 * che la cron di chiusura usa per trovare i suoi candidati.
 */
async function attesaOnce({ dryRun = DRY_RUN } = {}) {
  if (runningAttesa) return console.log('[Reminder attesa] Skip: gia in esecuzione');
  runningAttesa = true;
  const didConnect = await connetti().catch((e) => { throw e; });

  try {
    const ora = new Date();
    const soglia = new Date(ora.getTime() - ATTESA_PRIMO_ORE * 3600 * 1000);

    // Appuntamento ancora in agenda, primo promemoria partito da almeno ATTESA_PRIMO_ORE,
    // nessuna risposta e nessun esito finale gia' scritto.
    const candidati = await Lead.find({
      'appuntamento.dataOraTs': { $gte: ora },
      'appuntamento.dataOraSparitaAt': null,
      'appuntamento.reminder.risposta': { $in: [null, ''] },
      'appuntamento.reminder.statoConferma': { $in: [null, ''] },
      $or: [
        { 'appuntamento.reminder.invii': { $elemMatch: { stage: '4g', esito: 'ok', at: { $lte: soglia } } } },
        // Invii precedenti allo storico per stage.
        {
          'appuntamento.reminder.invii': { $size: 0 },
          'appuntamento.reminder.esitoInvio': 'ok',
          'appuntamento.reminder.inviatoAt': { $lte: soglia },
        },
      ],
    }).limit(MAX_PER_RUN);

    // Il filtro fine non si puo' fare in query: serve confrontare l'orario dell'invio
    // con l'orario CORRENTE dell'appuntamento (se e' stato spostato, il conto riparte).
    const daSegnalare = candidati.filter((l) => {
      const at = inviatoAt(l, '4g');
      if (!at || at > soglia) return false;
      const rem = l.appuntamento?.reminder || {};
      return rem.attesaPerDataOra !== l.appuntamento?.dataOra;
    });

    const ammessi = daSegnalare.filter((l) => whitelist.isConsentito(l?.numeroTelefono));
    const esclusi = daSegnalare.length - ammessi.length;

    console.log(`[Reminder attesa] candidati=${ammessi.length}${esclusi ? ` (esclusi ${esclusi} fuori whitelist)` : ''} | valore='${ATTESA}' dopo ${ATTESA_PRIMO_ORE}h di silenzio dal primo promemoria | dryRun=${dryRun}`);

    let ok = 0, ko = 0;
    for (const lead of ammessi) {
      const res = await applicaAttesa(lead, { dryRun, raw: { fonte: 'cron-attesa' } });
      if (res.ok) ok++; else ko++;
      await log({
        endpoint: 'cron:reminder-attesa',
        source: 'reminder-appuntamento',
        matchedLeadId: lead._id,
        matchedIdNexus: lead.idNexus,
        payload: { dataOra: lead?.appuntamento?.dataOra, inviatoAt: inviatoAt(lead, '4g'), dryRun },
        nexusPayload: { id: lead.idNexus, stato_conferma: res.statoConferma },
        nexusResponse: res.nexus?.data,
        nexusError: res.nexus?.error,
        // In dry-run non e' partito niente: il log non deve raccontare il contrario.
        outcome: dryRun ? 'attesa_risposta_dryrun'
          : res.ok ? 'attesa_risposta_inviata'
          : `attesa_risposta_fallita:${res.motivo || 'errore'}`,
      });
    }
    console.log(`[Reminder attesa] Fine | ok=${ok} falliti=${ko}`);
  } catch (e) {
    console.error('[Reminder attesa] FAILED:', e?.response?.data || e.message || e);
  } finally {
    if (didConnect) await mongoose.disconnect().catch(() => {});
    runningAttesa = false;
  }
}

// ====================== 3) CHIUSURA NON RISPOSTE ==========================
async function chiusuraOnce() {
  if (runningChiusura) return console.log('[Reminder chiusura] Skip: gia in esecuzione');
  runningChiusura = true;
  const didConnect = await connetti().catch((e) => { throw e; });

  try {
    const ora = new Date();
    // Si chiude solo dentro la finestra del sollecito o piu' avanti: chi ha ricevuto il
    // primo promemoria a -4 giorni ha ancora il sollecito davanti e non va chiuso ora.
    const limite = new Date(ora.getTime() + STAGE_2G_ORE * 3600 * 1000);
    // E solo dopo aver dato al paziente la giornata promessa dal testo del sollecito.
    const inviatoEntro = new Date(ora.getTime() - ATTESA_SOLLECITO_ORE * 3600 * 1000);

    // Appuntamenti futuri entro la finestra, ultimo messaggio partito e senza risposta,
    // nessuno stato_conferma gia' scritto.
    const candidati = await Lead.find({
      'appuntamento.dataOraTs': { $gte: ora, $lte: limite },
      'appuntamento.dataOraSparitaAt': null,
      'appuntamento.reminder.esitoInvio': 'ok',
      'appuntamento.reminder.inviatoAt': { $lte: inviatoEntro },
      'appuntamento.reminder.risposta': { $in: [null, ''] },
      'appuntamento.reminder.statoConferma': { $in: [null, ''] },
    }).limit(MAX_PER_RUN);

    // Si chiude solo chi il sollecito l'ha DAVVERO ricevuto. Il tempo trascorso non
    // basta a dedurlo: se il sollecito e' slittato oltre la fascia oraria, o e' caduto
    // sotto il minimo di ore dall'appuntamento, non e' mai partito. Scrivere
    // NO-CONFERMA a chi non e' stato avvisato sarebbe una promessa mai fatta: il testo
    // che annuncia la cancellazione e' proprio quello del sollecito.
    const conSollecito = candidati.filter((l) => {
      const at = inviatoAt(l, '2g');
      return at && (ora.getTime() - at.getTime()) >= ATTESA_SOLLECITO_ORE * 3600 * 1000;
    });
    const senzaSollecito = candidati.length - conSollecito.length;

    // In fase di test la chiusura automatica scrive su Nexus solo per il gruppo di
    // collaudo: NO-CONFERMA sulla scheda di un paziente vero sarebbe un dato falso.
    const ammessi = conSollecito.filter((l) => whitelist.isConsentito(l?.numeroTelefono));
    const esclusi = conSollecito.length - ammessi.length;

    console.log(`[Reminder chiusura] candidati=${ammessi.length}${esclusi ? ` (esclusi ${esclusi} fuori whitelist)` : ''}${senzaSollecito ? ` (esclusi ${senzaSollecito} senza sollecito ricevuto)` : ''} | si chiude entro ${STAGE_2G_ORE}h dall'appuntamento, dopo ${ATTESA_SOLLECITO_ORE}h di silenzio dal sollecito | dryRun=${DRY_RUN}`);
    console.log(`[Reminder chiusura] ${whitelist.descrizione()}`);

    let ok = 0, ko = 0;
    for (const lead of ammessi) {
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
  const run = cmd === 'chiusura' ? () => chiusuraOnce()
    : cmd === 'attesa' ? () => attesaOnce({ dryRun: opts.live ? false : true })
    : () => invioOnce(opts);
  run()
    .then(() => process.exit(0))
    .catch((e) => { console.error('[Reminder]', e?.message || e); process.exit(1); });
} else if (ENABLED) {
  console.log(`[Reminder] cron attivi | invio='${CRON_INVIO}' attesa='${CRON_ATTESA}' chiusura='${CRON_CHIUSURA}' | finestre 4g ${STAGE_2G_ORE}-${STAGE_4G_ORE}h · 2g ${STAGE_1G_ORE}-${STAGE_2G_ORE}h · 1g ${MIN_ORE}-${STAGE_1G_ORE}h | '${ATTESA}' dopo ${ATTESA_PRIMO_ORE}h dal primo · NO-CONFERMA dopo ${ATTESA_SOLLECITO_ORE}h di silenzio dal sollecito | dryRun=${DRY_RUN}`);
  cron.schedule(CRON_INVIO, () => invioOnce().catch((e) => console.error('[Reminder invio] schedule error:', e?.message || e)));
  cron.schedule(CRON_ATTESA, () => attesaOnce().catch((e) => console.error('[Reminder attesa] schedule error:', e?.message || e)));
  cron.schedule(CRON_CHIUSURA, () => chiusuraOnce().catch((e) => console.error('[Reminder chiusura] schedule error:', e?.message || e)));
} else {
  console.log('[Reminder] cron NON attivi (REMINDER_ENABLED != true)');
}

module.exports = { invioOnce, attesaOnce, chiusuraOnce, appuntamentiInFinestra, stagePerAppuntamento, messaggioDaInviare, giaInviato, inviatoAt };
