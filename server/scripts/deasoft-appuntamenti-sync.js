/**
 * Esiti per SINGOLO APPUNTAMENTO da Deasoft, usando l'id del paziente (`idDeasoft`) invece
 * dell'id della lead. Serve alle lead che `?Type=Result` non trova (l'errore
 * `id_leadsystem non trovato`): il loro appuntamento in agenda esiste, ma non porta il nostro id.
 *
 * Due letture per paziente (vedi docs/API-Nexus.md e docs/API-Deasoft.md):
 *   ?Type=ListAppointments&id_deasoft=…  -> storico appuntamenti con lo STATO di ognuno.
 *       0 annullato · 1 confermato · 2 NON presentato · 3-6 presentato · 7 fissato
 *       E' la fonte buona per presenza e no show, perche' e' per appuntamento.
 *   ?Type=EventResult&id_deasoft=…       -> preventivato e fatturato. Sono dati di PAZIENTE e
 *       possono riferirsi a visite precedenti: si salvano a parte e non si mescolano con l'esito
 *       dell'appuntamento.
 *
 * Scrive solo dentro `appuntamento.deasoft` e `deasoft_paziente`: non tocca il blocco append-only
 * dell'appuntamento, ne' `deasoft_sync` (che resta la lettura per id lead).
 *
 * Uso:
 *   node server/scripts/deasoft-appuntamenti-sync.js                 conta e basta
 *   node server/scripts/deasoft-appuntamenti-sync.js --live          scrive
 *   node server/scripts/deasoft-appuntamenti-sync.js --live --tutte  non solo le lead perse
 *   ... --limit 100 --conc 4 --giorni 120
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { getDeasoftToken, mappaEsiti } = require('../helpers/deasoft');

const HOST = process.env.DEASOFT_LIST_HOST || 'https://funnel-1032112960130.europe-west1.run.app';
const arg = (nome, def) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : def; };
const LIVE = process.argv.includes('--live');
const TUTTE = process.argv.includes('--tutte');
const LIMIT = Number(arg('--limit', 0));
const CONC = Number(arg('--conc', 4));
const GIORNI = Number(arg('--giorni', 120));
const SOLDI = !process.argv.includes('--senza-soldi');

const giorno = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const PRESENTE = new Set([3, 4, 5, 6]);
const ETICHETTA = { 0: 'annullato', 1: 'confermato', 2: 'non presentato', 3: 'entrato', 4: 'in cura', 5: 'uscito', 6: 'terminato', 7: 'fissato' };

async function sincronizza() {
  const token = await getDeasoftToken();
  const get = (params) => axios.get(HOST + '/', { params, headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }).then((r) => r.data);

  const query = {
    idDeasoft: { $exists: true, $nin: [null, ''] },
    'appuntamento.dataOraTs': { $lt: new Date(), $gte: new Date(Date.now() - GIORNI * 86400000) },
    ...(TUTTE ? {} : { 'deasoft_sync.lastError': /non trovato/i }),
  };
  let leads = await Lead.find(query).sort({ 'appuntamento.dataOraTs': -1 }).select('nome idDeasoft appuntamento.dataOraTs appuntamento.noShow').lean();
  if (LIMIT) leads = leads.slice(0, LIMIT);
  console.log(`[Deasoft appuntamenti] da leggere: ${leads.length} pazienti (${TUTTE ? 'tutte le lead con idDeasoft' : 'solo quelle che Result non trova'}, visite degli ultimi ${GIORNI} giorni) | live=${LIVE}`);
  if (!leads.length) return;

  const conta = { presentato: 0, 'non presentato': 0, annullato: 0, confermato: 0, fissato: 0, 'appuntamento assente': 0, errore: 0 };
  let prev = 0, fatt = 0, impP = 0, impF = 0, scritti = 0;
  let i = 0;
  const lavora = async () => {
    while (i < leads.length) {
      const l = leads[i++];
      const g = giorno(l.appuntamento.dataOraTs);
      try {
        const items = (await get({ Type: 'ListAppointments', id_deasoft: String(l.idDeasoft) })).items || [];
        const q = items.find((x) => String(x.data_ora_inizio || '').startsWith(g));
        const stato = q ? q.stato : null;
        const etichetta = q ? (ETICHETTA[stato] || `stato ${stato}`) : 'appuntamento assente';
        conta[PRESENTE.has(stato) ? 'presentato' : etichetta] = (conta[PRESENTE.has(stato) ? 'presentato' : etichetta] || 0) + 1;

        const set = {
          'appuntamento.deasoft.lettoAt': new Date(),
          'appuntamento.deasoft.idAppuntamento': q ? q.id_appuntamento : null,
          'appuntamento.deasoft.stato': stato,
          'appuntamento.deasoft.statoEtichetta': etichetta,
          'appuntamento.deasoft.presentato': q ? PRESENTE.has(stato) : null,
          'appuntamento.deasoft.annullato': q ? stato === 0 : null,
          'appuntamento.deasoft.nonPresentato': q ? stato === 2 : null,
          'appuntamento.deasoft.appuntamentiPaziente': items.length,
        };
        if (SOLDI) {
          try {
            const e = mappaEsiti(await get({ Type: 'EventResult', id_deasoft: String(l.idDeasoft) }));
            if (e.preventivato) { prev++; impP += e.importoPreventivato || 0; }
            if (e.fatturato) { fatt++; impF += e.importoFatturato || 0; }
            Object.assign(set, {
              'deasoft_paziente.lettoAt': new Date(),
              'deasoft_paziente.preventivato': e.preventivato,
              'deasoft_paziente.importoPreventivato': e.importoPreventivato,
              'deasoft_paziente.fatturato': e.fatturato,
              'deasoft_paziente.importoFatturato': e.importoFatturato,
              'deasoft_paziente.ultimaModificaEsito': e.ultimaModificaEsito,
            });
          } catch (e) { /* i soldi sono un di piu': se falliscono si tiene lo stato */ }
        }
        if (LIVE) { await Lead.updateOne({ _id: l._id }, { $set: set }); scritti++; }
      } catch (e) {
        conta.errore++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, CONC) }, lavora));

  const tot = leads.length;
  console.log('\nstato dell\'appuntamento (fonte: lista appuntamenti del paziente):');
  Object.entries(conta).filter(([, n]) => n).sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log('  ', String(n).padStart(5), k, `(${Math.round((n / tot) * 100)}%)`));
  if (SOLDI) console.log(`\nsoldi (dato di paziente, non del singolo appuntamento): preventivati ${prev} per ${Math.round(impP).toLocaleString('it-IT')}€ | fatturati ${fatt} per ${Math.round(impF).toLocaleString('it-IT')}€`);
  console.log(LIVE ? `\nscritte ${scritti} lead.` : '\nDry-run: nessuna scrittura. Aggiungi --live.');
}

if (require.main === module) {
  mongoose.connect(process.env.DATABASE)
    .then(sincronizza)
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((e) => { console.error('[Deasoft appuntamenti]', e.stack || e); process.exit(1); });
}

module.exports = { sincronizza };
