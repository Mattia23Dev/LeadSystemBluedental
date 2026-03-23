require('dotenv').config();

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getLeadById } = require('../helpers/nexus');

let running = false;
const DRY_RUN = true;
const SYNC_UTENTE = '65d3110eccfb1c0ce51f7492'; // es: '65d3110eccfb1c0ce51f7492'
const BATCH_SIZE = 200;
const MAX_LEADS = null;
const STATUS_HISTORY_LIMIT = 20;
const CRON_EXPR = '0 2 * * *';
const CRON_ENABLED = true;

async function syncOnce() {
  if (running) {
    console.log('[Nexus sync] Skip: already running');
    return;
  }
  running = true;

  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');

  const dryRun = DRY_RUN;

  // Optional filter: sync only leads for one utente
  const utente = SYNC_UTENTE;

  const batchSize = BATCH_SIZE;
  const maxLeads = MAX_LEADS;
  const statusHistoryLimit = STATUS_HISTORY_LIMIT;

  try {
    await mongoose.connect(uri);
    console.log('[Nexus sync] Connected to Mongo');

    const query = {
      idNexus: { $exists: true, $ne: '' }
    };
    if (utente) query.utente = utente;

    let lastId = null;
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let notFoundInNexus = 0;

    while (true) {
      const batchQuery = { ...query };
      if (lastId) batchQuery._id = { $gt: lastId };

      const leads = await Lead.find(batchQuery)
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();

      if (!leads.length) break;

      for (const localLead of leads) {
        if (maxLeads !== null && processed >= maxLeads) {
          console.log(`[Nexus sync] Stop: reached maxLeads=${maxLeads}`);
          await mongoose.disconnect();
          running = false;
          return;
        }

        processed++;
        lastId = localLead._id;

        if (processed % 50 === 0) {
          console.log('[Nexus sync] progress', {
            processed,
            updated,
            skipped,
            notFoundInNexus,
            lastMongoId: String(localLead._id),
            lastIdNexus: localLead.idNexus
          });
        }

        const nexusLead = await getLeadById(localLead.idNexus);
        if (!nexusLead || typeof nexusLead !== 'object') {
          notFoundInNexus++;
          const notFoundUpdate = {
            nexus_lead: false,
            nexus_sync: {
              ...(localLead.nexus_sync || {}),
              lastSyncAt: new Date(),
              lastError: 'NEXUS_LEAD_NOT_FOUND',
              lastNotFoundAt: new Date(),
            }
          };

          if (dryRun) {
            console.log('[Nexus sync][DRY_RUN] nexus lead not found', {
              mongoLeadId: String(localLead._id),
              idNexus: localLead.idNexus
            });
          } else {
            await Lead.updateOne({ _id: localLead._id }, { $set: notFoundUpdate });
            console.log('[Nexus sync] marked nexus not found', {
              mongoLeadId: String(localLead._id),
              idNexus: localLead.idNexus
            });
          }
          continue; // API might return false / null when id not found
        }

        const prevNexusLead = localLead.nexus_lead && typeof localLead.nexus_lead === 'object'
          ? localLead.nexus_lead
          : null;
        const prevLeadStatus = prevNexusLead?.lead_status ?? localLead?.nexus_sync?.lastLeadStatus ?? null;
        const prevEsito = prevNexusLead?.esito ?? localLead?.nexus_sync?.lastEsito ?? null;
        const nextLeadStatus = nexusLead?.lead_status ?? null;
        const nextEsito = nexusLead?.esito ?? null;
        const nextDataModifica = nexusLead?.data_modifica ?? null;

        const statusChanged = prevLeadStatus !== nextLeadStatus || prevEsito !== nextEsito;

        const history = Array.isArray(localLead?.nexus_sync?.statusHistory)
          ? [...localLead.nexus_sync.statusHistory]
          : [];

        if (statusChanged) {
          history.push({
            at: new Date(),
            lead_status: nextLeadStatus,
            esito: nextEsito,
            data_modifica: nextDataModifica,
          });
          if (history.length > statusHistoryLimit) {
            history.splice(0, history.length - statusHistoryLimit);
          }
        }

        const updateDoc = {
          nexus_lead: nexusLead,
          nexus_sync: {
            lastSyncAt: new Date(),
            lastDataModifica: nextDataModifica,
            lastLeadStatus: nextLeadStatus,
            lastEsito: nextEsito,
            statusHistory: history,
          }
        };

        if (dryRun) {
          updated++;
          console.log('[Nexus sync][DRY_RUN] would overwrite nexus_lead', {
            mongoLeadId: String(localLead._id),
            idNexus: localLead.idNexus,
            statusChanged,
            previous: { lead_status: prevLeadStatus, esito: prevEsito },
            next: { lead_status: nextLeadStatus, esito: nextEsito },
          });
        } else {
          await Lead.updateOne({ _id: localLead._id }, { $set: updateDoc });
          updated++;
          console.log('[Nexus sync] updated nexus_lead', {
            mongoLeadId: String(localLead._id),
            idNexus: localLead.idNexus,
            statusChanged
          });
        }
      }
    }

    await mongoose.disconnect();
    console.log('[Nexus sync] Done', { processed, updated, skipped, notFoundInNexus });
  } catch (err) {
    console.error('[Nexus sync] FAILED:', err?.response?.data || err.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
  } finally {
    running = false;
  }
}

// Schedule (nightly). Default: 02:00 local time.
const cronExpr = CRON_EXPR;
const enabled = CRON_ENABLED;

if (enabled) {
  console.log(`[Nexus sync] cron enabled: ${cronExpr} (dryRun=${DRY_RUN})`);
  cron.schedule(cronExpr, () => {
    syncOnce().catch((e) => console.error('[Nexus sync] schedule error:', e?.message || e));
  });
}

module.exports = { syncOnce };

