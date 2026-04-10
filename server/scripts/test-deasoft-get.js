require('dotenv').config();

const { getDeasoftToken, getDeasoftLeadOutcome } = require('../helpers/deasoft');

async function run() {
  const idNexus =
    process.env.DEASOFT_TEST_ID_NEXUS || '44ae5a0a-0cc3-7436-6b81-69d8fc958e29';

  console.log(`[Deasoft test] Start | idNexus=${idNexus}`);
  const token = await getDeasoftToken();
  console.log(`[Deasoft test] Token received | preview=${String(token).slice(0, 12)}...`);

  const payload = await getDeasoftLeadOutcome(idNexus, token);
  console.log('[Deasoft test] GET response:');
  console.log(JSON.stringify(payload, null, 2));
}

run().catch((err) => {
  console.error('[Deasoft test] FAILED:', err?.response?.data || err.message);
  process.exit(1);
});
