/**
 * Crea le lead del gruppo di collaudo del sistema reminder (agosto 2026).
 *
 * Le cinque persone di config/test-whitelist.js entrano come lead vere: prima su
 * Mongo, poi su Nexus (POST /lead/api/set), esattamente come una lead di campagna.
 * Da li' in poi il flusso e' quello di produzione: qualcuno fissa l'appuntamento in
 * agenda, nexus-agenda-sync.js lo specchia sul mirror locale e reminder-appuntamenti.js
 * manda il template WhatsApp a 4 giorni e a 1 giorno.
 *
 * Perche' un centro diverso per ciascuno: citta' e indirizzo sono due variabili
 * distinte del messaggio (Rev. 2.0 §3.4.2). Spargendo i tester su cinque centri del
 * pilota - fra cui i due di Bologna - si verifica che il testo sia corretto per tutti
 * e non solo per il primo caso.
 *
 * Il centro dell'appuntamento lo sceglie chi agenda, non questo script: qui lo si
 * scrive nel campo note della lead, cosi' chi fissa sa dove metterlo.
 *
 * Rilanciarlo e' sicuro: se il numero ha gia' una lead (restano in giro quelle dei test
 * precedenti) la si riallinea - nominativo, citta', note, campagna - e si azzera il
 * blocco reminder del giro passato, invece di creare un doppione. Un appuntamento
 * ancora vivo in agenda non viene toccato.
 *
 * Uso:
 *   node server/scripts/crea-lead-test-reminder.js            -> dry run: stampa e basta
 *   node server/scripts/crea-lead-test-reminder.js --live     -> crea/riallinea su Mongo e Nexus
 *   node server/scripts/crea-lead-test-reminder.js --live --force
 *                                                             -> crea una lead nuova anche se esiste gia'
 *   --solo 3204928711   lavora su un solo numero
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { saveLeadWithResult, normalizePhoneForNexus } = require('../helpers/nexus');
const { NUMERI_TEST, last10 } = require('../config/test-whitelist');
const { getCentro } = require('../config/centri-bludental');

// Utente proprietario delle lead: lo stesso usato dagli altri script di test.
const UTENTE = process.env.TEST_LEAD_UTENTE || '65d3110eccfb1c0ce51f7492';
// Campagna riconoscibile: serve a tenere queste lead fuori dai conteggi di performance.
const CAMPAGNA = 'TEST REMINDER - collaudo agosto 2026';
const TRATTAMENTO = 'Implantologia per singolo dente';
// Suffisso sul nominativo: in agenda Nexus e in Deasoft si deve vedere a colpo d'occhio
// che non e' un paziente vero, altrimenti qualcuno lo richiama sul serio.
const SUFFISSO = 'Test';

/**
 * Centro suggerito per ciascun tester, per id_deasoft. Sono tutti dentro il perimetro
 * pilota (config/centri-bludental.js): fuori da quello il reminder non parte.
 */
const CENTRO_PER_TESTER = {
  'Simona Salis': '31',        // BOLOGNA
  'Mattia Noris': '78',        // BOLOGNA EMILIA PONENTE (aggiunto al pilota il 24/08/2026)
  'Andrea Caruso': '6',        // POMEZIA
  'Francesca Di Lallo': '10',  // BARI
  'Samuel Tagliacozzo': '14',  // MILANO BRIANZA
};

/** Indirizzo email di comodo: il canale del test e' WhatsApp, la mail non viene usata. */
function emailDi(nome) {
  const slug = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.');
  return `test.reminder+${slug}@funnelconsulting.it`;
}

function splitNome(intero) {
  const parti = String(intero).trim().split(/\s+/);
  return { nome: parti[0], cognome: parti.slice(1).join(' ') };
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--live') o.live = true;
    else if (a === '--force') o.force = true;
    else if (a === '--solo') o.solo = last10(argv[++i]);
  }
  return o;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dryRun = !opts.live;

  await mongoose.connect(process.env.DATABASE);

  const testers = opts.solo ? NUMERI_TEST.filter((t) => last10(t.telefono) === opts.solo) : NUMERI_TEST;
  if (!testers.length) {
    console.log(`Nessun tester corrisponde a --solo ${opts.solo}`);
    return;
  }

  console.log(`\n=== LEAD DI COLLAUDO REMINDER === (${dryRun ? 'DRY RUN: non scrive nulla' : 'LIVE: scrive su Mongo e Nexus'})\n`);

  const riepilogo = [];

  for (const t of testers) {
    const tel = last10(t.telefono);
    const centro = getCentro(CENTRO_PER_TESTER[t.nome]);
    const nominativo = `${t.nome} ${SUFFISSO}`;
    const { cognome } = splitNome(nominativo);
    const note = `LEAD DI TEST reminder - fissare appuntamento fra 5/6/7 giorni presso ${centro?.nome || 'un centro del pilota'}`;

    // Il numero e' l'identita' della lead: se c'e' gia' (tipico, restano in giro le
    // lead dei test precedenti) la si riallinea invece di creare un doppione. Due lead
    // con lo stesso numero sono un problema vero: chi agenda su Nexus non sa quale
    // scegliere. Con --force si crea comunque una lead nuova.
    const esistente = await Lead.findOne({ numeroTelefono: { $regex: `${tel}$` } }).sort({ _id: -1 });
    if (esistente && !opts.force) {
      const app = esistente.appuntamento || {};
      // Il blocco reminder del giro precedente va azzerato, altrimenti il dedup crede
      // di aver gia' servito questa lead. Si tocca solo se non c'e' un appuntamento
      // vivo in agenda: quello lo si lascia stare.
      const appVivo = app.dataOraTs && app.dataOraTs > new Date() && !app.dataOraSparitaAt;

      if (dryRun) {
        console.log(`[~] ${nominativo.padEnd(25)} ${tel}  da riallineare: lead=${esistente._id} idNexus=${esistente.idNexus || '-'} | nome "${esistente.nome}" -> "${nominativo}" | citta "${esistente['città'] || '-'}" -> "${centro?.comune || '-'}" | reminder ${appVivo ? 'NON azzerato (appuntamento vivo in agenda)' : 'da azzerare'}`);
        riepilogo.push({ tester: nominativo, telefono: tel, centro: centro?.nome || '-', idNexus: esistente.idNexus || '(da leggere)' });
        continue;
      }

      esistente.nome = nominativo;
      esistente.cognome = cognome;
      esistente['città'] = centro?.comune || esistente['città'];
      esistente.trattamento = TRATTAMENTO;
      esistente.note = note;
      esistente.utmCampaign = CAMPAGNA;
      if (!appVivo) {
        esistente.appuntamento = esistente.appuntamento || {};
        esistente.appuntamento.reminder = undefined;
      }
      await esistente.save();

      let esitoNexus = esistente.idNexus || '-';
      if (esistente.idNexus) {
        const upd = await saveLeadWithResult({
          id: esistente.idNexus,
          nome: nominativo,
          ragione_sociale: nominativo,
          citta: esistente['città'],
          trattamento: TRATTAMENTO,
          note,
          campagna: CAMPAGNA,
        });
        if (!upd.ok) esitoNexus = `${esistente.idNexus} (update FALLITO: ${JSON.stringify(upd.error)})`;
      }
      console.log(`[~] ${nominativo.padEnd(25)} ${tel}  riallineata: lead=${esistente._id} nexus=${esitoNexus}${appVivo ? ' | reminder lasciato intatto (appuntamento vivo)' : ' | reminder azzerato'}`);
      riepilogo.push({ tester: nominativo, telefono: tel, centro: centro?.nome || '-', idNexus: esistente.idNexus || '-' });
      continue;
    }

    if (dryRun) {
      console.log(`[+] ${nominativo.padEnd(25)} ${tel}  -> ${centro?.nome || '?'} (${centro?.comune || '?'}, ${centro?.indirizzo || '?'})`);
      riepilogo.push({ tester: nominativo, telefono: tel, centro: centro?.nome || '-', idNexus: '(dry run)' });
      continue;
    }

    const lead = new Lead({
      data: new Date(),
      dataTimestamp: new Date(),
      nome: nominativo,
      cognome,
      email: emailDi(t.nome),
      numeroTelefono: tel,
      campagna: 'Social',
      città: centro?.comune || '',
      trattamento: TRATTAMENTO,
      esito: 'Da contattare',
      utente: UTENTE,
      note,
      utmCampaign: CAMPAGNA,
      tentativiChiamata: '0',
      giàSpostato: false,
    });
    await lead.save();

    const res = await saveLeadWithResult({
      nome: nominativo,
      ragione_sociale: nominativo,
      email: lead.email,
      telefono: normalizePhoneForNexus(tel),
      punteggio: null,
      riassunto_chiamata: null,
      id_lead_leadsystem: String(lead._id),
      note,
      data_appuntamento: null,
      citta: lead.città,
      trattamento: TRATTAMENTO,
      lead_status: 'Da contattare',
      dettaglio_status_negativo: null,
      numero_tentativi: null,
      macro_fonte: 'Online',
      micro_fonte: 'META WEB',
      campagna: CAMPAGNA,
      adset: 'TEST',
      ad: 'TEST',
      sorgente: 'Funnel',
    });

    if (res.ok && res.data?.id) {
      lead.idNexus = res.data.id;
      await lead.save();
    }
    console.log(`[+] ${nominativo.padEnd(25)} ${tel}  lead=${lead._id} nexus=${res.ok ? res.data?.id : `FALLITO ${JSON.stringify(res.error)}`}`);
    riepilogo.push({ tester: nominativo, telefono: tel, centro: centro?.nome || '-', idNexus: res.ok ? String(res.data?.id || '-') : 'FALLITO' });
  }

  // Tabella pronta da incollare nella mail al gruppo di test.
  console.log('\n=== RIEPILOGO (da incollare nella mail) ===');
  console.log('Nominativo su Nexus       | Telefono    | Centro                   | ID Nexus');
  for (const r of riepilogo) {
    console.log(`${r.tester.padEnd(25)} | ${r.telefono.padEnd(11)} | ${r.centro.padEnd(24)} | ${r.idNexus}`);
  }
  console.log('\nProssimo passo: far fissare in agenda un appuntamento per ciascuna lead fra 5, 6 e 7 giorni.');
  console.log('Poi: node server/scripts/nexus-agenda-sync.js  e  node server/scripts/reminder-appuntamenti.js invio\n');
}

main()
  .then(async () => { await mongoose.disconnect().catch(() => {}); process.exit(0); })
  .catch(async (e) => {
    console.error('FAILED:', e?.response?.data || e.message || e);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
