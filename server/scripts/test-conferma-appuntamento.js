/**
 * Test in DRY RUN della catena reminder/conferma appuntamento:
 * normalizzazione risposta, formattazione data, payload verso il qualificatore e
 * applicaConferma. Non scrive nulla, ne' su Mongo ne' su Nexus.
 *
 * Uso: node server/scripts/test-conferma-appuntamento.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { normalizzaRisposta, applicaConferma } = require('../helpers/statoConferma');
const { formattaItaliano, toE164, buildPayload } = require('../helpers/qualificatore');

async function main() {
  console.log('--- normalizzaRisposta ---');
  for (const v of ['si', 'Sì', 'SI', 'yes', 'no', 'No grazie', 'Sì ci sarò', true, false, 'boh', '', 'timeout']) {
    console.log(`  ${JSON.stringify(v).padEnd(14)} -> ${normalizzaRisposta(v)}`);
  }

  console.log('\n--- formattaItaliano / toE164 ---');
  console.log(' ', JSON.stringify(formattaItaliano('2026-08-24T11:15:00+02:00')));
  console.log(' ', ['3891884224', '+393891884224', '00393891884224', '39 389 188 4224'].map(toE164).join(' | '));

  await mongoose.connect(process.env.DATABASE);

  const lead = await Lead.findOne({ 'appuntamento.dataOraTs': { $gte: new Date() } }).sort({ 'appuntamento.dataOraTs': 1 });
  if (!lead) {
    console.log('\nNessuna lead con appuntamento futuro: eseguire prima backfill-appuntamenti.js');
    return mongoose.disconnect();
  }
  console.log(`\n--- lead di prova: ${lead._id} | ${lead.nome} | app=${lead.appuntamento.dataOra} | idNexus=${lead.idNexus} ---`);

  console.log('\n--- payload verso il qualificatore ---');
  console.log(JSON.stringify(buildPayload({
    lead, dataOra: lead.appuntamento.dataOra, telefono: lead.numeroTelefono, idNexus: lead.idNexus,
  }), null, 2));

  console.log('\n--- applicaConferma SI (dryRun) ---');
  console.log(JSON.stringify(await applicaConferma(lead, 'SI', { dryRun: true, raw: { test: true } })));
  console.log('  reminder in memoria:', JSON.stringify(lead.appuntamento.reminder));

  console.log('\n--- applicaConferma NESSUNA (dryRun) ---');
  console.log(JSON.stringify(await applicaConferma(lead, 'NESSUNA', { dryRun: true })));

  console.log('\n--- applicaConferma risposta ignota ---');
  console.log(JSON.stringify(await applicaConferma(lead, 'BOH', { dryRun: true })));

  const dopo = await Lead.findById(lead._id).select({ 'appuntamento.reminder': 1 }).lean();
  console.log('\n--- verifica che il DB NON sia stato toccato ---');
  console.log(JSON.stringify(dopo.appuntamento?.reminder || null));

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
