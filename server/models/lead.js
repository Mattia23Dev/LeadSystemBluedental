const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadSchema = new Schema({
    data: {
      type: String,
      required: true
    },
    dataTimestamp: { type: Date },
    lastModify: {
      type: String,
    },
    dataLastContatto: {
      type: String,
    },
    nome: {
      type: String,
      required: true
    },
    email: {
      type: String,
    },
    numeroTelefono: {
      type: String,
    },
    campagna: {
      type: String,
    },
    esito: {
        type: String,
        default: 'Da contattare',
    },
    orientatori: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orientatore',
    },
    quando: {String},
    utente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
    città: {
        type: String,
      },
    note: {
        type: String,
    },
    fatturato: {
      type: String,
    },
    tentativiChiamata: {
      type: String,
    },
    giàSpostato: {
      type: Boolean,
      default: false,
    },
    dataCambiamentoEsito: {
      type: Date,
      default: null,
    },
    dataPrimaModifica: {
      type: Date,
      default: null,
    },
    trattamento: {
      type: String,
    },
    manualLead: {
      type : Boolean,
      default: false,
    },
    utmSource: {
      type: String,
    },
    utmCampaign: {
      type: String,
    },
    utmContent: {
      type: String,
    },
    utmTerm: {
      type: String,
    },
    utmAdgroup: String,
    utmAdset: String,
    motivo: String,
    recallDate: Date,
    recallHours: String,
    recallType: String,
    tipo: String, 
    trattPrenotato: String, 
    luogo: String,
    idLeadChatic: String,
    last_interaction: String,
    summary: String,
    appDate: String,
    appFissato: String,
    reminderInviato: Boolean,
    idDeasoft: String,
    appVoiceBot: Boolean,
    chiamato: Boolean,
    outHour: Boolean,
    punteggio: Number,
    recallAgent: {
      recallType: {type: Number, default: 0},
      recallInfo: [
        {
          recallDate: Date,
          recallReason: String,
          transcript: String,
        }
      ],
    },
    status: String,
    notificaApp: {
      type: Boolean,
      default: false,
    },
    idNexus: String,
    // Full raw payload returned by Nexus GET /lead/api/get?id=...
    nexus_lead: Schema.Types.Mixed,
    // Lightweight sync metadata to avoid heavy DB growth
    nexus_sync: {
      lastSyncAt: Date,
      lastDataModifica: String,
      lastLeadStatus: String,
      lastEsito: String,
      lastError: String,
      lastNotFoundAt: Date,
      statusHistory: [
        {
          at: Date,
          lead_status: String,
          esito: String,
          data_modifica: String,
        }
      ]
    },
    // Full raw payload returned by Deasoft endpoint (esiti by id_lead)
    deasoft_lead: Schema.Types.Mixed,
    deasoft_sync: {
      lastSyncAt: Date,
      lastError: String,
      /** Ultimo id LeadSystem usato per GET esiti Deasoft (query id_leadsystem). */
      lastLeadSystemId: String,
      syncHistory: [
        {
          at: Date,
          ok: Boolean,
          error: String,
          payload: Schema.Types.Mixed,
        }
      ]
    },
    // === Agendazione diretta Deasoft (servizio voce+WA esterno) ===
    // true = la lead ha effettuato la prenotazione sul servizio di agendazione.
    agendata: { type: Boolean, default: false },
    // Momento in cui abbiamo ricevuto la conferma di agendazione (callback API).
    agendataAt: Date,
    // Raw payload dell'ultimo EventResult Deasoft (esiti post-appuntamento by id_deasoft).
    deasoft_event: Schema.Types.Mixed,
    deasoft_event_sync: {
      lastSyncAt: Date,
      lastError: String,
      /** Ultimo id_deasoft usato per GET ?Type=EventResult. */
      lastIdDeasoft: String,
      // Esiti mappati best-effort dal payload EventResult (dipende dallo schema Deasoft).
      presentato: Schema.Types.Mixed,
      preventivato: Schema.Types.Mixed,
      fatturato: Schema.Types.Mixed,
      valore: Schema.Types.Mixed,
      syncHistory: [
        {
          at: Date,
          ok: Boolean,
          error: String,
          payload: Schema.Types.Mixed,
        }
      ]
    },
    // === Appuntamento / No Show (campi Nexus rilasciati il 06/08/2026) ===
    // Blocco dedicato e "append-only": l'esito fissato e il no show, una volta
    // rilevati, NON vengono piu' sovrascritti dai sync successivi. Serve a tenere
    // separati "quanti appuntamenti ho generato" e "quanti si sono davvero svolti".
    // Popolato da scripts/nexus-nightly-sync.js via helpers/appuntamento.js.
    appuntamento: {
      // -- esito di fissazione, scritto una volta sola --
      fissato: { type: Boolean, default: false },
      fissatoAt: Date,
      esitoFissatoOriginale: String,
      leadStatusFissatoOriginale: String,
      // -- esito corrente su Nexus (puo' cambiare) --
      esitoCorrente: String,
      leadStatusCorrente: String,
      esitoCorrenteAt: Date,
      // -- data/ora appuntamento (ISO 8601 con fuso, come da Nexus) --
      dataOra: String,
      dataOraTs: Date,
      dataOraPrima: String,
      dataOraPrimaAt: Date,
      dataOraVistaAt: Date,
      dataOraSparitaAt: Date,
      spostamenti: [{ at: Date, da: String, a: String }],
      // -- no show: sticky, mai azzerato --
      noShow: { type: Boolean, default: false },
      noShowAt: Date,
      noShowValoreNexus: String,
      noShowVistoAt: Date,
      noShowRimossoAt: Date,
      noShowStorico: [{ at: Date, valore: String, dataOra: String, esito: String }],
      // -- stato_conferma cosi' come risulta su Nexus --
      statoConfermaNexus: String,
      // -- reminder + conferma appuntamento (flusso WhatsApp) --
      reminder: {
        inviatoAt: Date,
        perDataOra: String,     // orario per cui e' stato mandato: se cambia, si rimanda
        canale: String,
        esitoInvio: String,     // ok | failed | skipped
        errore: String,
        tentativi: { type: Number, default: 0 },
        risposta: String,       // SI | NO | NESSUNA
        rispostaAt: Date,
        rispostaRaw: Schema.Types.Mixed,
        statoConferma: String,  // SI-CONFERMA | NO-CONFERMA
        statoConfermaPushAt: Date,
        statoConfermaPushOk: Boolean,
        statoConfermaError: String,
      },
    },
    consent_marketing: String,
    recallIds: [],
    // Meta Web: invio a Nexus differito. true = creata ma NON ancora inviata a Nexus
    // (verrà inviata alla qualifica deepagent oppure dal cron dopo 24h).
    nexusDeferred: { type: Boolean, default: false },
  });

  LeadSchema.pre('save', function(next) {
    if (this.data && !this.dataTimestamp) {
      const dataDate = new Date(this.data);
      if (!isNaN(dataDate)) {
        this.dataTimestamp = dataDate;
      }
    }
    next();
  });  

const Lead = mongoose.model('Lead', LeadSchema);


module.exports = Lead ;