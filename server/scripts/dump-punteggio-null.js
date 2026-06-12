require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Dump degli eventi deepagent con punteggio mancante/vuoto o outcome no_punteggio.
// Orari in ora italiana (Europe/Rome) per incrocio diretto con le esecuzioni n8n.
// Uso opzionale: node scripts/dump-punteggio-null.js 50   (limite righe, default 40)

const LIMIT = parseInt(process.argv[2], 10) || 40;
const fmt = (d) => new Date(d).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const q = {
    $or: [
      { outcome: 'no_punteggio' },
      { punteggio: { $in: [null, ''] } },
      { punteggio: { $exists: false } },
    ],
  };

  const tot = await DeepagentLog.countDocuments(q);
  const rows = await DeepagentLog.find(q).sort({ receivedAt: -1 }).limit(LIMIT).lean();

  console.log('Eventi punteggio null/vuoto o no_punteggio:', tot, '(mostro ultimi', rows.length + ')');
  console.log('='.repeat(90));

  rows.forEach(r => {
    console.log('\n[' + fmt(r.receivedAt) + ']  ora italiana');
    console.log('  endpoint : ' + r.endpoint);
    console.log('  outcome  : ' + r.outcome);
    console.log('  tel      : ' + r.userPhone);
    console.log('  punteggio: ' + JSON.stringify(r.punteggio) + '   status=' + JSON.stringify(r.status) + '  success=' + JSON.stringify(r.success));
    console.log('  lead     : ' + (r.matchedLeadId || '-') + '   idNexus=' + (r.matchedIdNexus || '-'));
    console.log('  PAYLOAD n8n: ' + JSON.stringify(r.payload));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
