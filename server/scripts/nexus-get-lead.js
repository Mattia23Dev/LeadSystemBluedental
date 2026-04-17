/**
 * Legge una lead da Nexus (GET /lead/api/get?id=...).
 *
 * Uso:
 *   node server/scripts/nexus-get-lead.js
 *   node server/scripts/nexus-get-lead.js <idNexus>
 *
 * Oppure: NEXUS_LEAD_ID=<uuid> node server/scripts/nexus-get-lead.js
 */
const { getLeadById } = require('../helpers/nexus');

const DEFAULT_ID = 'b4aa1d7b-7a8e-eb6c-c96e-69da49b729d4';
const idNexus =
  process.argv[2] || process.env.NEXUS_LEAD_ID || DEFAULT_ID;

async function main() {
  const data = await getLeadById(idNexus);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err?.response?.data || err.message || err);
  process.exit(1);
});
