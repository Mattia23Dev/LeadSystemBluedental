require('dotenv').config();

const { getDeasoftToken, getDeasoftLeadOutcome } = require('../helpers/deasoft');

async function run() {
  const staticId = 'e8a0ab27-cddf-0333-e7ba-69ccb6b61659'; //'69ccb6c267e1e57a803b9d7e';

  console.log(`[Deasoft test] Start | id_lead=${staticId}`);
  const token = await getDeasoftToken();
  console.log(`[Deasoft test] Token received | preview=${String(token).slice(0, 12)}...`);

  const payload = await getDeasoftLeadOutcome(staticId, token);
  console.log('[Deasoft test] GET response:');
  console.log(JSON.stringify(payload, null, 2));
}

run().catch((err) => {
  console.error('[Deasoft test] FAILED:', err?.response?.data || err.message);
  process.exit(1);
});
