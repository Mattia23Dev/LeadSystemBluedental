require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Eventi PERSI (no_punteggio: punteggio null/vuoto) degli ultimi N giorni, v2.
// Orari in ora italiana per incrocio con n8n.
const DAYS = parseInt(process.argv[2], 10) || 3;
const fmt = (d) => new Date(d).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  const rows = await DeepagentLog.find({
    endpoint: '/webhook-n8n-bludental-v2',
    outcome: 'no_punteggio',
    receivedAt: { $gte: since },
  }).sort({ receivedAt: -1 }).lean();

  console.log('Eventi PERSI (no_punteggio) ultimi ' + DAYS + ' giorni:', rows.length);
  console.log('Orari in ora italiana (Europe/Rome)');
  console.log('='.repeat(80));
  rows.forEach(r => {
    const p = r.payload || {};
    console.log(fmt(r.receivedAt)
      + '  | tel=' + r.userPhone
      + '  | punteggio=' + JSON.stringify(p.punteggio_qualifica)
      + '  | success=' + JSON.stringify(r.success)
      + '  | status=' + JSON.stringify(r.status));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
