require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getLeadById, saveLeadWithResult } = require('../helpers/nexus');
const ID = process.argv[2] || '67f17f99-ab46-b30d-9349-6a2bda43662f';
(async () => {
  const before = await getLeadById(ID);
  console.log('PRIMA  -> punteggio=' + JSON.stringify(before.punteggio) + ' | micro_fonte=' + JSON.stringify(before.micro_fonte));

  console.log('Invio { id, punteggio: "0" } (STRINGA)...');
  const res = await saveLeadWithResult({ id: ID, punteggio: "0", micro_fonte: "PRE-META" });
  console.log('Risposta set: ok=' + res.ok + ' | status=' + res.status + (res.error ? ' | err=' + JSON.stringify(res.error).slice(0,200) : ''));

  await new Promise(r=>setTimeout(r,1000));
  const after = await getLeadById(ID);
  console.log('DOPO   -> punteggio=' + JSON.stringify(after.punteggio) + ' | micro_fonte=' + JSON.stringify(after.micro_fonte));
  console.log(String(after.punteggio) === '0' ? '\n✅ La STRINGA "0" ATTERRA!' : '\n❌ Anche la stringa "0" viene scartata (punteggio=' + JSON.stringify(after.punteggio) + ')');
  process.exit(0);
})().catch(e => { console.error('ERRORE:', e.response?.data ? JSON.stringify(e.response.data) : e.message); process.exit(1); });
