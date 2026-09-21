// Prova del messaggio di benvenuto (GOLD / AMBRA / ALLINEATORI) su UN numero, senza DB.
//   node server/scripts/test-benvenuto.js                         -> stampa il payload, non invia
//   node server/scripts/test-benvenuto.js --live --tel +39333...  -> invia davvero a quel numero
// Ignora BENVENUTO_ENABLED (usa force): serve per provare prima di accendere. La whitelist di test vale.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const benvenuto = require('../helpers/benvenuto');

const LIVE = process.argv.includes('--live');
const telIdx = process.argv.indexOf('--tel');
const tel = telIdx > -1 ? process.argv[telIdx + 1] : '+393330000000';
const nomeIdx = process.argv.indexOf('--nome');
const nome = nomeIdx > -1 ? process.argv[nomeIdx + 1] : 'Test Benvenuto';

const lead = { _id: 'TEST-BENVENUTO', nome, numeroTelefono: tel, email: 'test.benvenuto@example.com', città: 'roma' };

(async () => {
  console.log('flow_id:', benvenuto.FLOW_ID, '| BENVENUTO_ENABLED:', benvenuto.ENABLED);
  console.log('campagne ammesse: GOLD', benvenuto.campagnaAmmessa('DI | LEAD | GOLD | ITALIA'), '| AMBRA', benvenuto.campagnaAmmessa('FUNNEL | BD | AMBRA'), '| ALLINEATORI', benvenuto.campagnaAmmessa('ALLINEATORI x'), '| META WEB', benvenuto.campagnaAmmessa('DI | META WEB'));
  console.log('payload:', JSON.stringify(benvenuto.buildPayload(lead), null, 1));
  if (!LIVE) { console.log('\nNessun invio (aggiungi --live --tel +39...).'); return; }
  const r = await benvenuto.inviaBenvenuto(lead, { force: true });
  console.log('\nrisultato:', JSON.stringify({ ok: r.ok, skipped: r.skipped, status: r.status, error: r.error, data: r.data }));
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
