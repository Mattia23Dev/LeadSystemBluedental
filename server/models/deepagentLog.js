const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Log di ogni richiesta in ingresso dall'agente vocale (deepagent / n8n) e del
 * relativo comportamento, incluso l'invio a Nexus.
 *
 * outcome possibili:
 *   lead_not_found            -> nessuna lead trovata col numero ricevuto (NON salvato nulla)
 *   non_spostabile            -> lead in stato finale (Venduto / Lead persa / Non interessato): early-return
 *   no_punteggio              -> lead trovata ma deepagent non ha mandato punteggio_qualifica
 *   scored_no_idnexus         -> lead qualificata in locale ma senza idNexus: NON inviata a Nexus
 *   scored_nexus_ok           -> lead qualificata e PRE-META inviato (UPDATE) a Nexus con successo
 *   scored_nexus_failed       -> lead qualificata ma UPDATE PRE-META a Nexus FALLITO
 *   scored_nexus_created      -> [v2] lead Meta Web differita CREATA su Nexus (PRE-META) con successo
 *   scored_nexus_create_failed-> [v2] lead Meta Web differita: CREATE su Nexus FALLITA
 *   handler_error             -> eccezione non gestita nel webhook
 *
 * Reminder appuntamento (cron reminder-appuntamenti + /webhook-conferma-appuntamento):
 *   reminder_inviato          -> template WhatsApp richiesto al qualificatore con successo
 *   reminder_fallito          -> chiamata al qualificatore in errore
 *   reminder_non_configurato  -> REMINDER_API_URL assente: invio saltato
 *   lead_locale_non_trovata   -> appuntamento su Nexus senza lead corrispondente in Mongo
 *   telefono_mancante         -> lead senza numero: reminder impossibile
 *   conferma_ok:<valore>      -> risposta paziente registrata e stato_conferma scritto su Nexus
 *   conferma_fallita:<motivo> -> risposta registrata in locale ma non scritta su Nexus
 *   risposta_non_riconosciuta -> payload di conferma senza un si/no interpretabile
 *   no_conferma_inviata       -> nessuna risposta entro il cutoff: NO-CONFERMA su Nexus
 */
const DeepagentLogSchema = new Schema(
  {
    receivedAt: { type: Date, default: Date.now, index: true },
    endpoint: String,
    source: { type: String, default: 'deepagent' },

    // Payload grezzo ricevuto
    payload: Schema.Types.Mixed,

    // Campi estratti dal payload
    userPhone: String,
    punteggio: Schema.Types.Mixed,
    centroScelto: String,
    status: String,
    success: String,
    nextRunId: String,

    // Lead abbinata
    matchedLeadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    matchedIdNexus: { type: String, default: null },
    esitoBefore: String,
    esitoAfter: String,

    // Esito elaborazione
    outcome: { type: String, index: true },

    // Agendazione diretta Deasoft (callback /webhook-agendazione-deasoft)
    idDeasoft: { type: String, default: null },
    agendazione: Schema.Types.Mixed,

    // Reminder appuntamento / conferma (cron reminder-appuntamenti + webhook conferma)
    dryRun: { type: Boolean, default: false },

    // Invio a Nexus
    nexusPushAttempted: { type: Boolean, default: false },
    nexusPushOk: { type: Boolean, default: null },
    nexusPayload: Schema.Types.Mixed,
    nexusResponse: Schema.Types.Mixed,
    nexusError: Schema.Types.Mixed,

    // Errori a livello handler
    handlerError: String,

    processingMs: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeepagentLog', DeepagentLogSchema);
