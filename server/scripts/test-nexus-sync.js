require('dotenv').config();

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { getLeadById, listLeads } = require('../helpers/nexus');

async function main() {
  const uri = process.env.DATABASE;
  if (!uri) {
    throw new Error('Missing env DATABASE');
  }

  const testLimit = Number(process.env.TEST_LIMIT || 5);
  const utente = '65d3110eccfb1c0ce51f7492';
  const debugFull = String(process.env.DEBUG_FULL || 'true') === 'true';

  await mongoose.connect(uri);

  console.log(`Connected to Mongo. utente=${utente}, testLimit=${testLimit}`);

  // 1) Test list endpoint (Nexus)
  console.log(`\n[Nexus] POST /lead/api/list test (limit=${testLimit}):`);
  const list = await listLeads({
    select: "t.id, t.numerazione",
    conditions: "",
    group: "",
    having: "",
    order: "",
    limit: String(testLimit),
    offset: "",
    page: "",
    pageSize: ""
  });
  const listIsArray = Array.isArray(list);
  console.log('List response shape:', {
    isArray: listIsArray,
    length: listIsArray ? list.length : undefined,
    keys: list ? Object.keys(list) : null
  });

  // 2) Pick some leads already sent to Nexus (idNexus stored in our DB)
  const leads = await Lead.find({
    utente,
    idNexus: { $exists: true, $ne: '' }
  })
    .limit(testLimit)
    .lean();

  console.log(`\nMongo leads found with idNexus: ${leads.length}`);

  // 3) For each local lead, fetch details from Nexus (GET /lead/api/get?id=...)
  for (let i = 0; i < leads.length; i++) {
    const localLead = leads[i];
    const nexusLead = await getLeadById(localLead.idNexus);

    console.log('\n==============================');
    console.log(`localLead._id=${localLead._id}`);
    console.log(`localLead.idNexus=${localLead.idNexus}`);

    console.log('--- Local (Mongo) ---');
    if (debugFull) {
      console.log('localLead keys:', Object.keys(localLead));
      console.log('localLead:', localLead);
    } else {
      console.log({
        esito: localLead.esito,
        tentativiChiamata: localLead.tentativiChiamata,
        punteggio: localLead.punteggio
      });
    }

    console.log('--- Nexus (GET) ---');
    const picked = {
      lead_status: nexusLead?.lead_status,
      esito: nexusLead?.esito,
      numero_tentativi: nexusLead?.numero_tentativi,
      punteggio: nexusLead?.punteggio
    };
    console.log(picked);

    if (debugFull) {
      console.log('--- Nexus keys ---');
      console.log(nexusLead && typeof nexusLead === 'object' ? Object.keys(nexusLead) : null);
      console.log('--- Nexus raw (FULL) ---');
      console.log(nexusLead);
    } else {
      const anyUndefined = Object.values(picked).some((v) => v === undefined);
      if (anyUndefined) {
        console.log('--- Nexus raw (fields undefined) ---');
        console.log({
          type: nexusLead === null ? 'null' : typeof nexusLead,
          isArray: Array.isArray(nexusLead),
          keys: nexusLead && typeof nexusLead === 'object' ? Object.keys(nexusLead) : null,
          raw: nexusLead
        });
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('TEST FAILED:', err?.response?.data || err.message);
  process.exit(1);
});

