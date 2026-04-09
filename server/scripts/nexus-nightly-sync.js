require('dotenv').config();

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getLeadById, listLeads } = require('../helpers/nexus');

let running = false;
const DRY_RUN = false;
const SYNC_UTENTE = '65d3110eccfb1c0ce51f7492'; // es: '65d3110eccfb1c0ce51f7492'
const BATCH_SIZE = 200;
const MAX_LEADS = null;
const STATUS_HISTORY_LIMIT = 20;
const CRON_EXPR = '0 2 * * *';
const CRON_ENABLED = true;

function getTwoMonthsAgoRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - 2);

  // Sync window: from 2 months ago up to now (end of current day).
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

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
    const mongoAlreadyConnected = mongoose.connection.readyState === 1; // connected
    let didConnectHere = false;

    if (!mongoAlreadyConnected) {
      await mongoose.connect(uri);
      didConnectHere = true;
    }
    console.log('[Nexus sync] Mongo connection ready:', {
      alreadyConnected: mongoAlreadyConnected,
      didConnectHere
    });

    // Limit sync to leads already linked with Nexus.
    const { start, end } = getTwoMonthsAgoRange();
    const query = {
      idNexus: { $exists: true, $ne: '' },
      dataTimestamp: { $gte: start, $lte: end }
    };
    if (utente) query.utente = utente;
    console.log('[Nexus sync] date filter enabled', {
      from: start.toISOString(),
      to: end.toISOString()
    });

    let lastSeenTimestamp = null;
    let lastSeenId = null;
    let lastResolvedNexusId = null;
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let notFoundInNexus = 0;

    while (true) {
      const batchQuery = { ...query };
      if (lastSeenTimestamp && lastSeenId) {
        batchQuery.$or = [
          { dataTimestamp: { $lt: lastSeenTimestamp } },
          { dataTimestamp: lastSeenTimestamp, _id: { $lt: lastSeenId } }
        ];
      }

      const leads = await Lead.find(batchQuery)
        .sort({ dataTimestamp: -1, _id: -1 })
        .limit(batchSize)
        .lean();

      if (!leads.length) break;

      for (const localLead of leads) {
        if (maxLeads !== null && processed >= maxLeads) {
          console.log(`[Nexus sync] Stop: reached maxLeads=${maxLeads}`);
          if (typeof didConnectHere !== 'undefined' && didConnectHere) {
            await mongoose.disconnect();
          }
          running = false;
          return;
        }

        processed++;
        lastSeenTimestamp = localLead.dataTimestamp || null;
        lastSeenId = localLead._id;

        if (processed % 50 === 0) {
          console.log('[Nexus sync] progress', {
            processed,
            updated,
            skipped,
            notFoundInNexus,
            lastMongoId: String(localLead._id),
            lastIdNexus: lastResolvedNexusId
          });
        }

        // Resolve Nexus lead id using id_lead_leadsystem = local Mongo _id (string)
        const leadSystemId = String(localLead._id);
        const listRes = await listLeads({
          select: 't.id',
          conditions: `t.id_lead_leadsystem = '${leadSystemId}'`,
          group: '',
          having: '',
          order: 't.data_modifica DESC',
          limit: '1',
          offset: '',
          page: '',
          pageSize: ''
        });

        const nexusId = Array.isArray(listRes) && listRes[0]?.id
          ? listRes[0].id
          : listRes?.[0]?.id;

        if (!nexusId) {
          notFoundInNexus++;
          lastResolvedNexusId = null;

          const notFoundUpdate = {
            nexus_lead: false,
            nexus_sync: {
              ...(localLead.nexus_sync || {}),
              lastSyncAt: new Date(),
              lastError: 'NEXUS_LEAD_NOT_FOUND_BY_LEADSYSTEM',
              lastNotFoundAt: new Date(),
            }
          };

          if (dryRun) {
            console.log('[Nexus sync][DRY_RUN] nexus lead not found by leadsystem', {
              mongoLeadId: leadSystemId
            });
          } else {
            await Lead.updateOne({ _id: localLead._id }, { $set: notFoundUpdate });
            console.log('[Nexus sync] marked nexus not found by leadsystem', {
              mongoLeadId: leadSystemId
            });
          }
          continue;
        }

        lastResolvedNexusId = nexusId;

        // Optional: store resolved idNexus (helps future debugging; no required for correctness now)
        if (!dryRun && (!localLead.idNexus || localLead.idNexus !== nexusId)) {
          await Lead.updateOne({ _id: localLead._id }, { $set: { idNexus: nexusId } });
        }

        const nexusLead = await getLeadById(nexusId);
        if (!nexusLead || typeof nexusLead !== 'object') {
          notFoundInNexus++;

          const notFoundUpdate = {
            nexus_lead: false,
            nexus_sync: {
              ...(localLead.nexus_sync || {}),
              lastSyncAt: new Date(),
              lastError: 'NEXUS_LEAD_GET_FAILED',
              lastNotFoundAt: new Date(),
            }
          };

          if (dryRun) {
            console.log('[Nexus sync][DRY_RUN] nexus lead GET not found/object invalid', {
              mongoLeadId: leadSystemId,
              idNexus: nexusId
            });
          } else {
            await Lead.updateOne({ _id: localLead._id }, { $set: notFoundUpdate });
            console.log('[Nexus sync] marked nexus GET invalid', {
              mongoLeadId: leadSystemId,
              idNexus: nexusId
            });
          }
          continue;
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
            idNexus: lastResolvedNexusId,
            statusChanged,
            previous: { lead_status: prevLeadStatus, esito: prevEsito },
            next: { lead_status: nextLeadStatus, esito: nextEsito },
          });
        } else {
          await Lead.updateOne({ _id: localLead._id }, { $set: updateDoc });
          updated++;
          console.log('[Nexus sync] updated nexus_lead', {
            mongoLeadId: String(localLead._id),
            idNexus: lastResolvedNexusId,
            statusChanged
          });
        }
      }
    }

    if (typeof didConnectHere !== 'undefined' && didConnectHere) {
      await mongoose.disconnect();
    }
    console.log('[Nexus sync] Done', { processed, updated, skipped, notFoundInNexus });
  } catch (err) {
    console.error('[Nexus sync] FAILED:', err?.response?.data || err.message);
    try {
      if (typeof didConnectHere !== 'undefined' && didConnectHere) {
        await mongoose.disconnect();
      }
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

