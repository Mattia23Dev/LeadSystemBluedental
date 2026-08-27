/**
 * Scrittura dello stato di conferma appuntamento su Nexus.
 *
 * Nexus (mail Robert 05/08/2026) espone il campo `stato_conferma`, testo libero fino a
 * 255 caratteri: lo popoliamo NOI e non tocca il campo `campagna` (che resta l'origine
 * della lead per l'attribuzione delle performance).
 *
 * Valori convenzionali concordati:
 *   SI-CONFERMA -> il paziente ha risposto "Si" al reminder
 *   NO-CONFERMA -> il paziente ha risposto "No" oppure non ha risposto entro la scadenza
 *
 * L'update e' parziale: POST /lead/api/set con { id, stato_conferma } lascia invariati
 * lead_status, esito, campagna e tutti gli altri campi.
 *
 * FASE DI TEST: anche questa scrittura passa dalla whitelist di config/test-whitelist.js.
 * Serve perche' la chiusura automatica ("nessuna risposta" -> NO-CONFERMA) e' comunque
 * un dato che finisce sulla scheda di un paziente vero: durante il collaudo tocca solo
 * le lead del gruppo di test.
 */

const { saveLeadWithResult } = require('./nexus');
const whitelist = require('../config/test-whitelist');

// I valori sono convenzioni concordate con Bludental/Nexus, non costanti di codice:
// stanno in env cosi' che rinominarli o aggiungerne sia una configurazione e non un
// rilascio. Il campo su Nexus e' testo libero, quindi non c'e' lista chiusa da tenere
// allineata: cambia solo cosa ci scriviamo.
const SI = process.env.REMINDER_STATO_SI || 'SI-CONFERMA';
const NO = process.env.REMINDER_STATO_NO || 'NO-CONFERMA';
// Stato transitorio: il primo promemoria e' partito e il paziente non ha risposto.
// Non chiude il ciclo - il sollecito parte comunque e potra' portarlo a SI/NO.
const ATTESA = process.env.REMINDER_STATO_ATTESA || 'ATTESA-RISPOSTA';

/** Normalizza la risposta del paziente (qualunque forma arrivi) in SI / NO / null. */
function normalizzaRisposta(valore) {
  if (valore === true) return 'SI';
  if (valore === false) return 'NO';
  const s = String(valore ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['si', 'sì', 'yes', 'y', 'ok', 'confermo', 'confermato', 'si-conferma', '1', 'true'].includes(s)) return 'SI';
  if (['no', 'n', 'annulla', 'disdetta', 'non confermo', 'no-conferma', '0', 'false'].includes(s)) return 'NO';
  if (['nessuna', 'nessuna_risposta', 'no_response', 'timeout', 'scaduto'].includes(s)) return 'NESSUNA';
  // Testo libero: riconosce l'inizio della frase ("si ci saro", "no non posso").
  // Niente \b dopo la vocale accentata: in JS non e' un carattere di parola.
  if (/^s[iì](\W|$)/.test(s)) return 'SI';
  if (/^no(\W|$)/.test(s)) return 'NO';
  return null;
}

/** Risposta paziente -> valore da scrivere su Nexus. NESSUNA risposta = NO-CONFERMA. */
function statoConfermaDaRisposta(risposta) {
  if (risposta === 'SI') return SI;
  if (risposta === 'NO' || risposta === 'NESSUNA') return NO;
  return null;
}

/**
 * Applica la conferma su una lead: aggiorna il documento locale e scrive
 * `stato_conferma` su Nexus. Non salva la lead se manca idNexus (lo annota e basta).
 *
 * @param {object} lead      documento mongoose Lead (verra' salvato)
 * @param {string} risposta  'SI' | 'NO' | 'NESSUNA'
 * @param {object} opts      { raw, dryRun }
 * @returns {Promise<{ok:boolean, statoConferma:string|null, motivo?:string, nexus?:object}>}
 */
async function applicaConferma(lead, risposta, opts = {}) {
  const { raw = null, dryRun = false } = opts;
  const statoConferma = statoConfermaDaRisposta(risposta);

  if (!statoConferma) {
    return { ok: false, statoConferma: null, motivo: 'risposta_non_riconosciuta' };
  }

  if (!whitelist.isConsentito(lead?.numeroTelefono)) {
    return { ok: false, statoConferma, motivo: 'fuori_whitelist_test' };
  }

  lead.appuntamento = lead.appuntamento || {};
  lead.appuntamento.reminder = lead.appuntamento.reminder || {};
  const r = lead.appuntamento.reminder;

  r.risposta = risposta;
  r.rispostaAt = new Date();
  if (raw !== null) r.rispostaRaw = raw;
  r.statoConferma = statoConferma;

  if (!lead.idNexus) {
    r.statoConfermaPushOk = false;
    r.statoConfermaError = 'NO_IDNEXUS';
    if (!dryRun) await lead.save();
    return { ok: false, statoConferma, motivo: 'no_idnexus' };
  }

  if (dryRun) {
    return { ok: true, statoConferma, motivo: 'dry_run' };
  }

  const res = await saveLeadWithResult({ id: lead.idNexus, stato_conferma: statoConferma });

  r.statoConfermaPushAt = new Date();
  r.statoConfermaPushOk = !!res.ok;
  r.statoConfermaError = res.ok ? null : JSON.stringify(res.error).slice(0, 500);
  await lead.save();

  return { ok: !!res.ok, statoConferma, nexus: res };
}

/**
 * Segnala su Nexus che il primo promemoria e' rimasto senza risposta.
 *
 * Scrive `stato_conferma` = ATTESA come gli altri due valori, ma NON tocca
 * `reminder.risposta` ne' `reminder.statoConferma`: la lead resta dentro il ciclo,
 * riceve il sollecito e potra' ancora diventare SI-CONFERMA o NO-CONFERMA. Se
 * scrivessimo statoConferma, la cron di chiusura non la troverebbe piu' (cerca
 * proprio quelle senza esito) e il paziente non verrebbe mai chiuso.
 *
 * Idempotente per orario: `reminder.attesaPerDataOra` evita di riscrivere lo stesso
 * valore a ogni giro, e fa ripartire la segnalazione se l'appuntamento viene spostato.
 *
 * @param {object} lead   documento mongoose Lead (verra' salvato)
 * @param {object} opts   { raw, dryRun }
 */
async function applicaAttesa(lead, opts = {}) {
  const { raw = null, dryRun = false } = opts;

  if (!whitelist.isConsentito(lead?.numeroTelefono)) {
    return { ok: false, statoConferma: ATTESA, motivo: 'fuori_whitelist_test' };
  }

  lead.appuntamento = lead.appuntamento || {};
  lead.appuntamento.reminder = lead.appuntamento.reminder || {};
  const r = lead.appuntamento.reminder;

  r.attesaAt = new Date();
  r.attesaValore = ATTESA;
  r.attesaPerDataOra = lead.appuntamento.dataOra || null;
  if (raw !== null) r.rispostaRaw = r.rispostaRaw || raw;

  if (!lead.idNexus) {
    r.attesaPushOk = false;
    r.attesaError = 'NO_IDNEXUS';
    if (!dryRun) await lead.save();
    return { ok: false, statoConferma: ATTESA, motivo: 'no_idnexus' };
  }

  if (dryRun) {
    return { ok: true, statoConferma: ATTESA, motivo: 'dry_run' };
  }

  const res = await saveLeadWithResult({ id: lead.idNexus, stato_conferma: ATTESA });

  r.attesaPushOk = !!res.ok;
  r.attesaError = res.ok ? null : JSON.stringify(res.error).slice(0, 500);
  await lead.save();

  return { ok: !!res.ok, statoConferma: ATTESA, nexus: res };
}

module.exports = { SI, NO, ATTESA, normalizzaRisposta, statoConfermaDaRisposta, applicaConferma, applicaAttesa };
