require('dotenv').config();

const { getDeasoftToken, getDeasoftLeadOutcome } = require('../helpers/deasoft');

async function run() {
  const idLeadSystem = 'c4da7fe8-ca7e-3b52-fb6b-69de55717b9d';

  console.log(`[Deasoft test] Start | idLeadSystem=${idLeadSystem}`);
  const token = await getDeasoftToken();
  console.log(`[Deasoft test] Token received | preview=${String(token).slice(0, 12)}...`);

  const payload = await getDeasoftLeadOutcome(idLeadSystem, token);
  console.log('[Deasoft test] GET response:');
  console.log(JSON.stringify(payload, null, 2));
}

run().catch((err) => {
  console.error('[Deasoft test] FAILED:', err?.response?.data || err.message);
  process.exit(1);
});
