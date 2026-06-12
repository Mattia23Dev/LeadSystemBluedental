require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const { getLeadById, saveLeadWithResult } = require('../helpers/nexus');

/**
 * Backfill: re-invia a Nexus come STRINGA "0" il punteggio delle lead che noi
 * abbiamo creato/aggiornato con punteggio 0 ma che su Nexus risultano punteggio null
 * (Nexus scartava il numero 0 -- vedi fix in routes/leads.js).
 *
 * Uso:
 *   node scripts/backfill-punteggio-zero-nexus.js            -> DRY-RUN ultime 24h
 *   node scripts/backfill-punteggio-zero-nexus.js --write    -> SCRIVE su Nexus, ultime 24h
 *   node scripts/backfill-punteggio-zero-nexus.js --write 168 -> SCRIVE, ultime 168h (7gg)
 */
const WRITE = process.argv.includes('--write');
const HOURS = parseInt(process.argv.find(a => /^\d+$/.test(a)), 10) || 24;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  // Eventi nostri con punteggio 0 inviato e idNexus presente
  const rows = await DeepagentLog.find({
    outcome: { $in: ['scored_nexus_created', 'scored_nexus_ok'] },
    matchedIdNexus: { $ne: null },
    receivedAt: { $gte: since },
    'payload.punteggio_qualifica': { $in: [0, '0'] },
  }).sort({ receivedAt: -1 }).lean();

  // dedup per idNexus (una lead puo' avere piu' eventi)
  const byId = new Map();
  rows.forEach(r => { if (!byId.has(r.matchedIdNexus)) byId.set(r.matchedIdNexus, r); });
  const targets = [...byId.values()];

  console.log('MODALITA:', WRITE ? '*** SCRITTURA SU NEXUS ***' : 'DRY-RUN (nessuna scrittura)');
  console.log('Finestra:', HOURS + 'h | da', since.toISOString());
  console.log('Eventi punteggio 0 con idNexus:', rows.length, '| lead distinte:', targets.length);
  await mongoose.disconnect();

  let giaOk = 0, daCorreggere = 0, corrette = 0, falliti = 0;
  for (const t of targets) {
    const id = t.matchedIdNexus;
    let before;
    try { before = await getLeadById(id); }
    catch (e) { console.log('  GET FALLITO ' + id.slice(0,8) + ': ' + (e.message)); falliti++; continue; }

    if (String(before.punteggio) === '0') { giaOk++; continue; } // gia' corretto
    daCorreggere++;

    if (!WRITE) {
      console.log('  [dry] ' + id.slice(0,8) + ' tel=' + t.userPhone + ' | Nexus punteggio=' + JSON.stringify(before.punteggio) + ' -> "0"');
      continue;
    }
    const res = await saveLeadWithResult({ id, punteggio: '0', micro_fonte: 'PRE-META' });
    await sleep(150);
    if (res.ok) {
      const after = await getLeadById(id).catch(() => null);
      const okNow = after && String(after.punteggio) === '0';
      console.log('  [write] ' + id.slice(0,8) + ' tel=' + t.userPhone + (okNow ? ' OK -> 0' : ' inviato (verifica=' + JSON.stringify(after && after.punteggio) + ')'));
      if (okNow) corrette++; else falliti++;
    } else {
      console.log('  [write] ' + id.slice(0,8) + ' FALLITO: ' + JSON.stringify(res.error).slice(0,150));
      falliti++;
    }
    await sleep(150);
  }

  console.log('\n=== RIEPILOGO ===');
  console.log('  lead distinte:', targets.length);
  console.log('  gia a 0 su Nexus (saltate):', giaOk);
  console.log('  da correggere:', daCorreggere);
  if (WRITE) { console.log('  corrette:', corrette, '| falliti:', falliti); }
  else { console.log('  (DRY-RUN: rilancia con --write per applicare)'); }
  process.exit(0);
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
