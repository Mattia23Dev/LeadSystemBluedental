const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Log di ogni richiesta in ingresso dall'agente vocale (deepagent / n8n) e del
 * relativo comportamento, incluso l'invio a Nexus.
 *
 * outcome possibili:
 *   lead_not_found       -> nessuna lead trovata col numero ricevuto (NON salvato nulla)
 *   non_spostabile       -> lead in stato finale (Venduto / Lead persa / Non interessato): early-return
 *   no_punteggio         -> lead trovata ma deepagent non ha mandato punteggio_qualifica
 *   scored_no_idnexus    -> lead qualificata in locale ma senza idNexus: NON inviata a Nexus
 *   scored_nexus_ok      -> lead qualificata e PRE-META inviato a Nexus con successo
 *   scored_nexus_failed  -> lead qualificata ma invio PRE-META a Nexus FALLITO
 *   handler_error        -> eccezione non gestita nel webhook
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
