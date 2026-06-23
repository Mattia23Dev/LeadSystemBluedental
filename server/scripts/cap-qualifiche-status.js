require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Stesse costanti/logica di controllers/subs.js (cap mensile qualifiche).
const CAP_QUALIFICHE_DEFAULT = 2500;
const CAP_QUALIFICHE_OVERRIDE = { '2026-06': 3500 };
const SCORED_OUTCOMES = [
  'scored_nexus_ok',
  'scored_nexus_failed',
  'scored_no_idnexus',
  'scored_nexus_created',
  'scored_nexus_create_failed',
];

function getCapQualifiche(date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return CAP_QUALIFICHE_OVERRIDE[key] != null ? CAP_QUALIFICHE_OVERRIDE[key] : CAP_QUALIFICHE_DEFAULT;
}

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const cap = getCapQualifiche(now);

  // Qualifiche RICEVUTE nel mese = lead distinti inviati a Nexus come PRE-META.
  const leadIds = await DeepagentLog.distinct('matchedLeadId', {
    receivedAt: { $gte: startOfMonth },
    outcome: { $in: SCORED_OUTCOMES },
    matchedLeadId: { $ne: null },
  });
  const count = leadIds.length;

  // Breakdown per outcome (eventi, non lead distinti) per diagnosi.
  const byOutcome = await DeepagentLog.aggregate([
    { $match: { receivedAt: { $gte: startOfMonth } } },
    { $group: { _id: '$outcome', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);

  console.log(`\n=== CAP QUALIFICHE — mese ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} ===`);
  console.log(`  Qualifiche ricevute (lead distinti PRE-META): ${count}`);
  console.log(`  Cap mensile:                                  ${cap}`);
  console.log(`  Rimanenti prima dello stop:                   ${Math.max(0, cap - count)}`);
  console.log(`  Stato:                                        ${count >= cap ? 'CAP RAGGIUNTO -> Meta Web dirette a Nexus' : 'sotto cap -> qualificatore attivo'}`);

  console.log('\n=== Eventi deepagentlogs del mese per outcome ===');
  byOutcome.forEach(o => console.log(`  ${o._id || '(null)'}: ${o.n}`));

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
