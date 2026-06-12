require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { getLeadById, listLeads } = require('../helpers/nexus');

/**
 * Ri-sincronizza da Nexus le lead a partire da una data (default 2026-06-09),
 * salvando nexus_lead + nexus_sync nel Mongo locale (quello che leggono le dashboard).
 * Stessa logica del nightly (nexus-nightly-sync.js) ma con finestra parametrica.
 *
 * Uso:
 *   node scripts/nexus-sync-da-data.js                 -> DRY-RUN dal 2026-06-09
 *   node scripts/nexus-sync-da-data.js --write         -> SCRIVE, dal 2026-06-09
 *   node scripts/nexus-sync-da-data.js --write 2026-06-09
 */
const WRITE = process.argv.includes('--write');
const dateArg = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
const SYNC_UTENTE = '65d3110eccfb1c0ce51f7492';
const STATUS_HISTORY_LIMIT = 20;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startDate() {
  if (dateArg) { const [y,m,d] = dateArg.split('-').map(Number); return new Date(y, m-1, d, 0,0,0,0); }
  return new Date(2026, 5, 9, 0, 0, 0, 0); // 9 giugno 2026, ora locale
}

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const start = startDate();
  const query = {
    idNexus: { $exists: true, $ne: '' },
    utente: SYNC_UTENTE,
    dataTimestamp: { $gte: start },
  };
  const tot = await Lead.countDocuments(query);
  console.log('MODALITA:', WRITE ? '*** SCRITTURA ***' : 'DRY-RUN');
  console.log('Da:', start.toISOString(), '| lead con idNexus da sincronizzare:', tot);

  const cursor = Lead.find(query).sort({ dataTimestamp: -1, _id: -1 }).lean().cursor();
  let processed = 0, updated = 0, statusChg = 0, notFound = 0, fail = 0;

  for (let localLead = await cursor.next(); localLead; localLead = await cursor.next()) {
    processed++;
    const leadSystemId = String(localLead._id);
    try {
      // risolvi id Nexus via id_lead_leadsystem (come il nightly)
      const listRes = await listLeads({
        select: 't.id', conditions: `t.id_lead_leadsystem = '${leadSystemId}'`,
        group: '', having: '', order: 't.data_modifica DESC', limit: '1', offset: '', page: '', pageSize: ''
      });
      const nexusId = (Array.isArray(listRes) && listRes[0]?.id) ? listRes[0].id : (localLead.idNexus || null);
      if (!nexusId) { notFound++; continue; }

      const nexusLead = await getLeadById(nexusId);
      if (!nexusLead || typeof nexusLead !== 'object') { notFound++; continue; }

      const prev = (localLead.nexus_lead && typeof localLead.nexus_lead === 'object') ? localLead.nexus_lead : null;
      const prevLeadStatus = prev?.lead_status ?? localLead?.nexus_sync?.lastLeadStatus ?? null;
      const prevEsito = prev?.esito ?? localLead?.nexus_sync?.lastEsito ?? null;
      const nextLeadStatus = nexusLead?.lead_status ?? null;
      const nextEsito = nexusLead?.esito ?? null;
      const changed = prevLeadStatus !== nextLeadStatus || prevEsito !== nextEsito;
      if (changed) statusChg++;

      const history = Array.isArray(localLead?.nexus_sync?.statusHistory) ? [...localLead.nexus_sync.statusHistory] : [];
      if (changed) {
        history.push({ at: new Date(), lead_status: nextLeadStatus, esito: nextEsito, data_modifica: nexusLead?.data_modifica ?? null });
        if (history.length > STATUS_HISTORY_LIMIT) history.splice(0, history.length - STATUS_HISTORY_LIMIT);
      }

      const updateDoc = {
        nexus_lead: nexusLead,
        nexus_sync: {
          lastSyncAt: new Date(),
          lastDataModifica: nexusLead?.data_modifica ?? null,
          lastLeadStatus: nextLeadStatus,
          lastEsito: nextEsito,
          statusHistory: history,
        }
      };
      if (!localLead.idNexus || localLead.idNexus !== nexusId) updateDoc.idNexus = nexusId;

      if (WRITE) await Lead.updateOne({ _id: localLead._id }, { $set: updateDoc });
      updated++;
      if (processed % 25 === 0) console.log(`  ...processed=${processed} updated=${updated} statusChg=${statusChg} notFound=${notFound} fail=${fail}`);
      await sleep(60);
    } catch (e) {
      fail++;
      if (fail <= 10) console.log('  FAIL ' + leadSystemId + ': ' + (e.response?.data ? JSON.stringify(e.response.data).slice(0,120) : e.message));
    }
  }

  console.log('\n=== RIEPILOGO ===');
  console.log('  processed:', processed, '| updated:', updated, '| statusChanged:', statusChg, '| notFoundNexus:', notFound, '| fail:', fail);
  if (!WRITE) console.log('  (DRY-RUN: rilancia con --write per scrivere su Mongo)');
  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
