/**
 * Verifica che un'utenza Mongo sia davvero in sola lettura, e su cosa.
 *
 * Da lanciare prima di consegnare una stringa di connessione a qualcuno: l'unico modo
 * di sapere cosa puo' fare quell'utenza e' provarlo, perche' i permessi Atlas si
 * configurano in piu' punti (ruolo predefinito, ruoli custom, privilegi specifici) e
 * quello che si vede a video non sempre coincide con quello che il driver ottiene.
 *
 * Le prove di scrittura sono INNOCUE per costruzione: agiscono su un _id inventato che
 * non esiste, quindi anche se l'utenza potesse scrivere non modificherebbero nulla.
 * Nessun documento viene creato, modificato o cancellato in nessun caso.
 *
 * Uso:
 *   MONGO_URI_DA_TESTARE="mongodb+srv://utente:password@host/db" node server/scripts/verifica-utenza-lettura.js
 *   node server/scripts/verifica-utenza-lettura.js "mongodb+srv://..."
 *
 * La stringa non viene mai stampata: nei log compare solo utente e host.
 */
const { MongoClient, ObjectId } = require('mongodb');

const URI = process.argv[2] || process.env.MONGO_URI_DA_TESTARE;
const COLLECTION_ATTESA = process.env.COLLECTION_ATTESA || 'leads';

if (!URI) {
  console.error('Manca la stringa di connessione. Passala come argomento o in MONGO_URI_DA_TESTARE.');
  process.exit(1);
}

/** Utente e host, senza la password: quello che si puo' mostrare a schermo. */
function descrizione(uri) {
  const m = String(uri).match(/^mongodb(?:\+srv)?:\/\/([^:]+):[^@]*@([^/?]+)\/([^?]*)/);
  if (!m) return { utente: '?', host: '?', db: '?' };
  return { utente: m[1], host: m[2], db: m[3] || '(default)' };
}

const esito = (ok, atteso) => (ok === atteso ? '  ok  ' : ' !!!  ');

async function main() {
  const d = descrizione(URI);
  console.log(`\n=== VERIFICA UTENZA MONGO ===`);
  console.log(`  utente: ${d.utente} | host: ${d.host} | database: ${d.db}\n`);

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(d.db && d.db !== '(default)' ? d.db : undefined);
  console.log(`  connessione riuscita, database "${db.databaseName}"\n`);

  const prova = async (etichetta, attesoRiuscire, fn) => {
    try {
      const r = await fn();
      const ok = true;
      console.log(`${esito(ok, attesoRiuscire)} ${etichetta.padEnd(52)} ${attesoRiuscire ? 'riuscito' : 'RIUSCITO MA NON DOVEVA'}${r !== undefined ? ' -> ' + r : ''}`);
      return ok;
    } catch (e) {
      const msg = String(e.message || e).split('\n')[0].slice(0, 80);
      console.log(`${esito(false, attesoRiuscire)} ${etichetta.padEnd(52)} ${attesoRiuscire ? 'FALLITO MA DOVEVA RIUSCIRE' : 'negato'} -> ${msg}`);
      return false;
    }
  };

  console.log('--- LETTURA (deve riuscire) ---');
  await prova(`leggere ${COLLECTION_ATTESA}`, true, async () => {
    const doc = await db.collection(COLLECTION_ATTESA).findOne({}, { projection: { _id: 1 } });
    return doc ? 'un documento letto' : 'collection vuota';
  });
  await prova(`contare ${COLLECTION_ATTESA}`, true, async () => `${await db.collection(COLLECTION_ATTESA).estimatedDocumentCount()} documenti`);

  console.log('\n--- SCRITTURA (deve essere negata) ---');
  const idInesistente = new ObjectId();
  await prova(`modificare ${COLLECTION_ATTESA}`, false, async () => {
    const r = await db.collection(COLLECTION_ATTESA).updateOne({ _id: idInesistente }, { $set: { _probe: 1 } });
    return `matched ${r.matchedCount}, modified ${r.modifiedCount}`;
  });
  await prova(`cancellare da ${COLLECTION_ATTESA}`, false, async () => {
    const r = await db.collection(COLLECTION_ATTESA).deleteOne({ _id: idInesistente });
    return `deleted ${r.deletedCount}`;
  });
  await prova('creare una collection nuova', false, async () => {
    await db.createCollection(`_probe_${Date.now()}`);
    return 'creata (da rimuovere a mano!)';
  });

  console.log('\n--- ALTRE COLLECTION (a seconda di come e stata ristretta) ---');
  await prova('elencare le collection', true, async () => {
    const c = await db.listCollections().toArray();
    return `${c.length}: ${c.map((x) => x.name).join(', ').slice(0, 90)}`;
  });
  for (const altra of ['users', 'superadmins', 'deepagentlogs']) {
    await prova(`leggere ${altra}`, false, async () => {
      await db.collection(altra).findOne({}, { projection: { _id: 1 } });
      return 'accessibile';
    });
  }

  console.log('\n  Legenda: "ok" = come previsto, "!!!" = da guardare.\n');
  await client.close();
}

main().catch((e) => { console.error('\nVERIFICA FALLITA:', e.message); process.exit(1); });
