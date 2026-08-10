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
 */

const { saveLeadWithResult } = require('./nexus');

const SI = 'SI-CONFERMA';
const NO = 'NO-CONFERMA';

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

module.exports = { SI, NO, normalizzaRisposta, statoConfermaDaRisposta, applicaConferma };
