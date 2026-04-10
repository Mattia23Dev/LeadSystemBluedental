require('dotenv').config();

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getDeasoftToken, getDeasoftLeadOutcome } = require('../helpers/deasoft');

let running = false;
const CRON_EXPR = process.env.DEASOFT_SYNC_CRON || '30 2 * * *';
const CRON_ENABLED = (process.env.DEASOFT_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const SYNC_UTENTE = process.env.DEASOFT_SYNC_UTENTE || '65d3110eccfb1c0ce51f7492';
const BATCH_SIZE = Number(process.env.DEASOFT_SYNC_BATCH_SIZE || 100);
const TARGET_NEXUS_ESITO = (process.env.DEASOFT_TARGET_NEXUS_ESITO || 'fissato').toLowerCase();

function getTwoMonthsAgoRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - 2);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function syncOnce() {
  if (running) {
    console.log('[Deasoft sync] Skip: already running');
    return;
  }
  running = true;

  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');

  try {
    const mongoAlreadyConnected = mongoose.connection.readyState === 1;
    let didConnectHere = false;
    if (!mongoAlreadyConnected) {
      await mongoose.connect(uri);
      didConnectHere = true;
    }

    const token = await getDeasoftToken();
    const { start, end } = getTwoMonthsAgoRange();

    const query = {
      dataTimestamp: { $gte: start, $lte: end },
      $or: [
        { 'nexus_sync.lastEsito': { $regex: `^${TARGET_NEXUS_ESITO}$`, $options: 'i' } },
        { 'nexus_lead.esito': { $regex: `^${TARGET_NEXUS_ESITO}$`, $options: 'i' } },
      ],
    };
    if (SYNC_UTENTE) query.utente = SYNC_UTENTE;

    const leads = await Lead.find(query).sort({ dataTimestamp: -1 }).limit(BATCH_SIZE);
    console.log(`[Deasoft sync] Start | leads=${leads.length}`);

    for (const lead of leads) {
      try {
        const leadSystemId = String(lead._id);
        const deasoftLead = await getDeasoftLeadOutcome(leadSystemId, token);
        lead.deasoft_lead = deasoftLead;
        lead.deasoft_sync = {
          ...(lead.deasoft_sync || {}),
          lastSyncAt: new Date(),
          lastError: null,
          lastLeadSystemId: leadSystemId,
        };
        await lead.save();
        console.log(`[Deasoft sync] Updated lead ${lead._id} | id_lead=${leadSystemId}`);
      } catch (error) {
        const leadSystemId = String(lead._id);
        lead.deasoft_sync = {
          ...(lead.deasoft_sync || {}),
          lastSyncAt: new Date(),
          lastError: error?.response?.data ? JSON.stringify(error.response.data) : error.message,
          lastLeadSystemId: leadSystemId,
        };
        await lead.save();
        console.error(`[Deasoft sync] Failed lead ${lead._id}:`, error?.response?.data || error.message);
      }
    }

    if (didConnectHere) await mongoose.disconnect();
    console.log('[Deasoft sync] Done');
  } catch (err) {
    console.error('[Deasoft sync] FAILED:', err?.response?.data || err.message);
  } finally {
    running = false;
  }
}

if (CRON_ENABLED) {
  console.log(`[Deasoft sync] cron enabled: ${CRON_EXPR}`);
  cron.schedule(CRON_EXPR, () => {
    syncOnce().catch((e) => console.error('[Deasoft sync] schedule error:', e?.message || e));
  });
}

module.exports = { syncOnce };
