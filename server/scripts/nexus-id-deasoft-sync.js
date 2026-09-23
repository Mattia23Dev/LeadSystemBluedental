/**
 * Porta sulle nostre lead l'`id_deasoft`, cioe' l'identificativo del paziente sul gestionale.
 *
 * Nexus non lo tiene sulla lead ma sulla tabella `contatto`, e lo espone con un JOIN (indicazione di
 * NextUp del 23/09/2026, vedi docs/API-Nexus.md). E' il pezzo che mancava per leggere gli esiti delle
 * lead che `?Type=Result` non trova: con l'id del paziente si interroga Deasoft per paziente
 * (`?Type=ListAppointments`, che da' anche lo stato del singolo appuntamento) invece che per lead.
 *
 * Il job e' in sola scrittura sul campo `idDeasoft` e sul blocco `nexus_deasoft_link`: non tocca
 * appuntamento, esiti o altro.
 *
 * Uso:
 *   node server/scripts/nexus-id-deasoft-sync.js              conta e basta (dry-run)
 *   node server/scripts/nexus-id-deasoft-sync.js --live       scrive
 *   node server/scripts/nexus-id-deasoft-sync.js --live --da 2026-01-01
 *
 * Env:
 *   ID_DEASOFT_SYNC_ENABLED   default true
 *   ID_DEASOFT_SYNC_CRON      default '30 3 * * *' (dopo il sync notturno delle lead)
 *   ID_DEASOFT_SYNC_DA        data minima di creazione lead su Nexus (default 2026-01-01)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getIdDeasoftMap } = require('../helpers/nexus');

const CRON_EXPR = process.env.ID_DEASOFT_SYNC_CRON || '30 3 * * *';
const ENABLED = String(process.env.ID_DEASOFT_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const DA_DEFAULT = process.env.ID_DEASOFT_SYNC_DA || '2026-01-01';

async function sincronizza({ live = false, da = DA_DEFAULT } = {}) {
  const t0 = Date.now();
  const map = await getIdDeasoftMap(`t.data_creazione >= '${da} 00:00:00'`);
  console.log(`[id_deasoft] Nexus: ${map.size} lead con contatto e id_deasoft (da ${da}) in ${Math.round((Date.now() - t0) / 1000)}s`);

  const nostre = await Lead.find({ idNexus: { $exists: true, $nin: [null, ''] }, dataTimestamp: { $gte: new Date(`${da}T00:00:00+01:00`) } })
    .select('idNexus idDeasoft').lean();
  let nuovi = 0, cambiati = 0, invariati = 0, senzaId = 0;
  const ops = [];
  for (const l of nostre) {
    const id = map.get(String(l.idNexus));
    if (!id) { senzaId++; continue; }
    if (String(l.idDeasoft || '') === id) { invariati++; continue; }
    if (l.idDeasoft) cambiati++; else nuovi++;
    ops.push({ updateOne: { filter: { _id: l._id }, update: { $set: { idDeasoft: id, 'nexus_deasoft_link.at': new Date(), 'nexus_deasoft_link.idDeasoftPrecedente': l.idDeasoft || null } } } });
  }
  console.log(`[id_deasoft] nostre lead nel periodo: ${nostre.length} | id nuovi: ${nuovi} | cambiati: ${cambiati} | gia' allineati: ${invariati} | senza contatto su Nexus: ${senzaId}`);
  if (!live) { console.log('[id_deasoft] Dry-run: nessuna scrittura. Aggiungi --live.'); return { nuovi, cambiati, invariati, senzaId }; }
  for (let i = 0; i < ops.length; i += 500) await Lead.bulkWrite(ops.slice(i, i + 500));
  console.log(`[id_deasoft] scritti ${ops.length} id in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { nuovi, cambiati, invariati, senzaId };
}

if (require.main === module) {
  const live = process.argv.includes('--live');
  const i = process.argv.indexOf('--da');
  const da = i > -1 ? process.argv[i + 1] : DA_DEFAULT;
  mongoose.connect(process.env.DATABASE)
    .then(() => sincronizza({ live, da }))
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((e) => { console.error('[id_deasoft]', e.message || e); process.exit(1); });
} else if (ENABLED) {
  cron.schedule(CRON_EXPR, () => {
    sincronizza({ live: true }).catch((e) => console.error('[id_deasoft] errore:', e.message || e));
  }, { timezone: 'Europe/Rome' });
  console.log(`[id_deasoft] cron attivo: '${CRON_EXPR}' (ora italiana), da ${DA_DEFAULT}`);
}

module.exports = { sincronizza };
