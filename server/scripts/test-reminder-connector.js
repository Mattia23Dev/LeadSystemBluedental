/**
 * Test dell'endpoint del qualificatore (POST /connector/webhook) SENZA passare dal DB
 * ne' dalla cron: serve a verificare contratto, chiave e flussi.
 *
 *   node server/scripts/test-reminder-connector.js                      -> stampa i payload, non invia
 *   node server/scripts/test-reminder-connector.js --stage 4g --live    -> invia il flusso 4 giorni
 *   node server/scripts/test-reminder-connector.js --stage 1g --live    -> invia il flusso 1 giorno
 *   node server/scripts/test-reminder-connector.js --stage both --live  -> entrambi
 *
 * Opzioni: --nome --cognome --tel --email --data (gg/mm/aaaa) --ora (hh:mm) --lead <id>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { inviaReminder, buildPayload, isConfigurato, FLOWS, URL, PROJECT_ID } = require('../helpers/qualificatore');

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--live') o.live = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

/** gg/mm/aaaa + hh:mm -> ISO con fuso italiano, il formato che usa il resto del flusso. */
function toIso(data, ora) {
  const m = String(data || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const offset = Number(mo) >= 4 && Number(mo) <= 10 ? '+02:00' : '+01:00';
  return `${y}-${mo}-${d}T${(ora || '10:00')}:00${offset}`;
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const stage = o.stage || 'both';
  const stages = stage === 'both' ? ['4g', '1g'] : [stage];

  // Default: appuntamento fittizio fra 4 giorni, cosi' il template ha data/ora sensate.
  const fra4gg = new Date(Date.now() + 4 * 24 * 3600 * 1000);
  const dataDefault = `${String(fra4gg.getDate()).padStart(2, '0')}/${String(fra4gg.getMonth() + 1).padStart(2, '0')}/${fra4gg.getFullYear()}`;

  const args = {
    lead: { _id: o.lead || 'test-endpoint' },
    dataOra: toIso(o.data || dataDefault, o.ora || '10:30'),
    nome: o.nome || 'Mattia',
    cognome: o.cognome || 'Test',
    telefono: o.tel || '3513257290',
    email: o.email || 'mattia@test.com',
  };

  console.log(`URL=${URL}`);
  console.log(`project_id=${PROJECT_ID} | chiave=${isConfigurato() ? 'presente' : 'MANCANTE'} | live=${!!o.live}`);
  console.log(`appuntamento simulato: ${args.dataOra}`);

  for (const s of stages) {
    const payload = buildPayload({ ...args, stage: s });
    console.log(`\n--- stage ${s} (flow_id ${FLOWS[s]}) ---`);
    console.log(JSON.stringify(payload, null, 2));

    if (!o.live) { console.log('(dry: non inviato, aggiungi --live)'); continue; }

    const res = await inviaReminder({ ...args, stage: s });
    console.log(`ESITO: ok=${res.ok} status=${res.status || '-'}`);
    console.log('risposta:', JSON.stringify(res.data ?? res.error, null, 2));
  }
})().catch((e) => { console.error(e); process.exit(1); });
