require('dotenv').config();

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getLeadById, listLeads } = require('../helpers/nexus');
const { buildAppuntamento } = require('../helpers/appuntamento');

let running = false;
const DRY_RUN = false;
const SYNC_UTENTE = '65d3110eccfb1c0ce51f7492'; // es: '65d3110eccfb1c0ce51f7492'
const BATCH_SIZE = 200;
const MAX_LEADS = null;
const STATUS_HISTORY_LIMIT = 20;
const PROGRESS_LOG_EVERY = 25;
const CRON_EXPR = '0 2 * * *';
const CRON_ENABLED = true;

// Ampiezza della finestra di rilettura, in mesi. Portata da 2 a 4 il 31/08/2026: il 15,8%
// degli appuntamenti si svolge oltre 60 giorni dopo la creazione della lead (26,8% sugli
// allineatori), quindi con due mesi la lead era gia' fuori finestra quando la visita
// avveniva, e un flag di no show acceso qualche giorno dopo non ci arrivava piu'.
// Oltre i 120 giorni si resta sotto lo 0,2%: quattro mesi chiudono il problema.
const SYNC_MESI = Number(process.env.NEXUS_SYNC_MESI || 4);

function getFinestraRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - SYNC_MESI);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** Ricerca l'id Nexus a partire dal nostro id lead. Usata solo quando serve davvero. */
async function risolviIdNexus(leadSystemId) {
  const listRes = await listLeads({
    select: 't.id',
    conditions: `t.id_lead_leadsystem = '${leadSystemId}'`,
    group: '',
    having: '',
    order: 't.data_modifica DESC',
    limit: '1',
    offset: '',
    page: '',
    pageSize: '',
  });
  return (Array.isArray(listRes) && listRes[0]?.id) ? listRes[0].id : (listRes?.[0]?.id || null);
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
    console.log(`[Nexus sync] Mongo connection ready | alreadyConnected=${mongoAlreadyConnected} | didConnectHere=${didConnectHere}`);

    // Limit sync to leads already linked with Nexus.
    const { start, end } = getFinestraRange();
    const query = {
      idNexus: { $exists: true, $ne: '' },
      dataTimestamp: { $gte: start, $lte: end }
    };
    if (utente) query.utente = utente;
    console.log(`[Nexus sync] Start | dryRun=${dryRun} | finestra=${SYNC_MESI} mesi | from=${start.toISOString()} | to=${end.toISOString()} | batchSize=${batchSize}`);

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

        if (processed % PROGRESS_LOG_EVERY === 0) {
          console.log(`[Nexus sync] Progress | processed=${processed} | updated=${updated} | skipped=${skipped} | notFound=${notFoundInNexus}`);
        }

        // L'id Nexus ce l'abbiamo gia': la query di selezione richiede idNexus valorizzato.
        // Usarlo direttamente dimezza le chiamate (era una LIST + una GET per ogni lead),
        // ed e' quello che rende sostenibile la finestra di NEXUS_SYNC_MESI mesi.
        // La ricerca per id_lead_leadsystem resta come rete di sicurezza: si usa se l'id
        // manca o se la GET non trova nulla, cioe' se su Nexus la scheda e' stata rifatta.
        const leadSystemId = String(localLead._id);
        let nexusId = String(localLead.idNexus || '').trim() || null;
        let giaRisolto = false;

        if (!nexusId) {
          nexusId = await risolviIdNexus(leadSystemId);
          giaRisolto = true;
        }

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
            console.log(`[Nexus sync][DRY_RUN] Not found by LeadSystem | mongoLeadId=${leadSystemId}`);
          } else {
            await Lead.updateOne({ _id: localLead._id }, { $set: notFoundUpdate });
            console.log(`[Nexus sync] Update | mongoLeadId=${leadSystemId} | idNexus=- | action=mark_not_found_by_leadsystem`);
          }
          continue;
        }

        lastResolvedNexusId = nexusId;

        // Optional: store resolved idNexus (helps future debugging; no required for correctness now)
        if (!dryRun && (!localLead.idNexus || localLead.idNexus !== nexusId)) {
          await Lead.updateOne({ _id: localLead._id }, { $set: { idNexus: nexusId } });
        }

        let nexusLead = await getLeadById(nexusId);

        // GET a vuoto con un id che avevamo in casa: puo' essere cambiato su Nexus
        // (schede rifatte o unite). Prima di dichiararla persa, la ricerchiamo.
        if ((!nexusLead || typeof nexusLead !== 'object') && !giaRisolto) {
          const altro = await risolviIdNexus(leadSystemId);
          if (altro && altro !== nexusId) {
            nexusId = altro;
            lastResolvedNexusId = nexusId;
            if (!dryRun) await Lead.updateOne({ _id: localLead._id }, { $set: { idNexus: nexusId } });
            nexusLead = await getLeadById(nexusId);
          }
        }

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
            console.log(`[Nexus sync][DRY_RUN] Nexus GET invalid | mongoLeadId=${leadSystemId} | idNexus=${nexusId}`);
          } else {
            await Lead.updateOne({ _id: localLead._id }, { $set: notFoundUpdate });
            console.log(`[Nexus sync] Update | mongoLeadId=${leadSystemId} | idNexus=${nexusId} | action=mark_nexus_get_invalid`);
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

        // Blocco appuntamento/no-show: append-only, non sovrascrive fissato ne' no show.
        const { appuntamento, changes } = buildAppuntamento(localLead.appuntamento, nexusLead);

        const updateDoc = {
          nexus_lead: nexusLead,
          nexus_sync: {
            lastSyncAt: new Date(),
            lastDataModifica: nextDataModifica,
            lastLeadStatus: nextLeadStatus,
            lastEsito: nextEsito,
            statusHistory: history,
          },
          appuntamento,
        };

        const appLog = changes.length ? ` | appuntamento=[${changes.join(',')}]` : '';

        if (dryRun) {
          updated++;
          console.log(`[Nexus sync][DRY_RUN] Update | mongoLeadId=${String(localLead._id)} | idNexus=${lastResolvedNexusId} | statusChanged=${statusChanged} | prevStatus=${prevLeadStatus ?? '-'} | nextStatus=${nextLeadStatus ?? '-'} | prevEsito=${prevEsito ?? '-'} | nextEsito=${nextEsito ?? '-'}${appLog}`);
        } else {
          await Lead.updateOne({ _id: localLead._id }, { $set: updateDoc });
          updated++;
          console.log(`[Nexus sync] Update | mongoLeadId=${String(localLead._id)} | idNexus=${lastResolvedNexusId} | statusChanged=${statusChanged} | lead_status=${nextLeadStatus ?? '-'} | esito=${nextEsito ?? '-'}${appLog}`);
        }
      }
    }

    if (typeof didConnectHere !== 'undefined' && didConnectHere) {
      await mongoose.disconnect();
    }
    console.log(`[Nexus sync] Done | processed=${processed} | updated=${updated} | skipped=${skipped} | notFound=${notFoundInNexus}`);
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

