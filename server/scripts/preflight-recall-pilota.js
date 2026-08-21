/**
 * Preflight della Fase 1 (recall appuntamento): dice, PRIMA di accendere l'invio,
 * a quanti pazienti si scriverebbe e con quali variabili nel messaggio.
 *
 * Legge da Nexus l'agenda dei prossimi giorni, la incrocia con l'anagrafica dei
 * centri (config/centri-bludental.js) e verifica tre cose:
 *   1) tutti gli id_centro_bludental che Nexus espone sono censiti da noi;
 *   2) quanti appuntamenti cadono nei 15 centri del pilota;
 *   3) che citta' e indirizzo del messaggio siano compilabili per ciascuno.
 *
 * Non invia nulla e non scrive nulla: sono sole letture.
 *
 * Uso: node server/scripts/preflight-recall-pilota.js [giorni]   (default 7)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { listLeads } = require('../helpers/nexus');
const { getCentro, isPilota, variabiliMessaggio, PILOTA, PILOTA_DA_CONFERMARE } = require('../config/centri-bludental');

const GIORNI = Number(process.argv[2] || 7);

async function main() {
  const righe = await listLeads({
    select:
      't.id, t.id_lead_leadsystem, t.nominativo, t.telefono, t.data_ora_appuntamento, ' +
      't.centro_bludental, t.id_centro_bludental, t.indirizzo_completo_centro_bludental, t.stato_conferma',
    conditions: `t.data_ora_appuntamento >= NOW() AND t.data_ora_appuntamento < DATE_ADD(NOW(), INTERVAL ${GIORNI} DAY)`,
    group: '', having: '', order: 't.data_ora_appuntamento ASC', limit: '3000', offset: '', page: '', pageSize: '',
  });
  const app = Array.isArray(righe) ? righe : [];

  const dentro = [];
  const fuori = [];
  const senzaCentro = [];
  const idSconosciuti = new Map();

  for (const r of app) {
    const id = r.id_centro_bludental ? String(r.id_centro_bludental).trim() : '';
    if (!id || !getCentro(id)) {
      senzaCentro.push(r);
      if (id) idSconosciuti.set(id, (idSconosciuti.get(id) || 0) + 1);
      continue;
    }
    (isPilota(id) ? dentro : fuori).push(r);
  }

  console.log(`\n=== AGENDA NEXUS PROSSIMI ${GIORNI} GIORNI ===`);
  console.log(`appuntamenti in agenda            ${app.length}`);
  console.log(`  nei 15 centri del pilota        ${dentro.length}   <-- a questi si scrive`);
  console.log(`  fuori perimetro                 ${fuori.length}`);
  console.log(`  senza centro / centro ignoto    ${senzaCentro.length}`);

  console.log('\n=== 1) ANAGRAFICA: ID CENTRO NON CENSITI ===');
  if (!idSconosciuti.size) {
    console.log('nessuno: tutti gli id_centro_bludental visti sono in config/centri-bludental.js');
  } else {
    for (const [id, n] of idSconosciuti) console.log(`  id=${id} su ${n} appuntamenti -> AGGIUNGERE ALL\'ANAGRAFICA`);
  }
  const senzaId = senzaCentro.filter((r) => !r.id_centro_bludental).length;
  if (senzaId) console.log(`  ${senzaId} appuntamenti senza id_centro_bludental: messaggio non compilabile`);

  console.log('\n=== 2) DISTRIBUZIONE NEL PILOTA ===');
  const perCentro = new Map();
  for (const r of dentro) {
    const k = String(r.id_centro_bludental).trim();
    perCentro.set(k, (perCentro.get(k) || 0) + 1);
  }
  for (const id of PILOTA) {
    const c = getCentro(id);
    console.log(`  ${String(id).padStart(3)} ${String(c?.nome || '?').padEnd(24)} ${perCentro.get(id) || 0}`);
  }
  for (const id of PILOTA_DA_CONFERMARE) {
    const n = app.filter((r) => String(r.id_centro_bludental).trim() === id).length;
    const c = getCentro(id);
    console.log(`  ${String(id).padStart(3)} ${String(c?.nome || '?').padEnd(24)} ${n}   (DA CONFERMARE con Bludental, oggi ESCLUSO)`);
  }

  console.log('\n=== 3) ANTEPRIMA VARIABILI DEL MESSAGGIO (primi 10 nel pilota) ===');
  for (const r of dentro.slice(0, 10)) {
    const v = variabiliMessaggio(r.id_centro_bludental);
    console.log(`  ${String(r.data_ora_appuntamento).slice(0, 16)} | ${String(r.nominativo || '-').slice(0, 22).padEnd(22)} | ${v.citta} | ${v.indirizzo}`);
  }

  console.log('\n=== 4) STATO DEL MIRROR LOCALE ===');
  await mongoose.connect(process.env.DATABASE);
  // Gli appuntamenti spariti dall'agenda Nexus sono disdette: il reminder li salta
  // gia' per conto suo, quindi non contano come buco di dato.
  const vivi = { 'appuntamento.dataOraTs': { $gte: new Date() }, 'appuntamento.dataOraSparitaAt': null };
  const [mirrorConCentro, mirrorSenzaCentro] = await Promise.all([
    Lead.countDocuments({ ...vivi, 'appuntamento.centroId': { $nin: [null, ''] } }),
    Lead.countDocuments({ ...vivi, 'appuntamento.centroId': { $in: [null, ''] } }),
  ]);
  console.log(`appuntamenti futuri ancora in agenda: con centroId=${mirrorConCentro} - senza=${mirrorSenzaCentro}`);
  console.log(mirrorSenzaCentro
    ? "-> mirror non allineato: lanciare `node server/scripts/nexus-agenda-sync.js` prima di accendere l'invio."
    : '-> mirror allineato: ogni appuntamento in agenda ha il centro.');
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
