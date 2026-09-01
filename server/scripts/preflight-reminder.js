/**
 * Preflight del reminder: costruisce i payload VERI e li ispeziona, senza inviare nulla.
 *
 * Perche' esiste. Il 01/09/2026, al primo giro sui pazienti veri, tre problemi sono
 * usciti insieme: due persone hanno ricevuto il messaggio doppio (stessa persona su due
 * lead diverse agganciate allo stesso appuntamento) e due invii sono falliti per un
 * campo email che conteneva "bari" o era vuoto. Nessuno dei due si poteva vedere prima,
 * perche' il collaudo girava su cinque lead costruite a mano e la simulazione
 * controllava QUANDO parte ogni messaggio, mai COSA viene spedito e A CHI.
 *
 * Questo script fa l'altra meta': prende gli appuntamenti veri in arrivo, costruisce per
 * ognuno il payload che finirebbe al connector e lo guarda. Non puo' inviare - usa
 * buildPayload e non inviaReminder - quindi si puo' lanciare in qualsiasi momento.
 *
 * Quando lanciarlo: prima di ogni allargamento del perimetro (nuovi centri, apertura a
 * tutta la rete, nuovi flussi) e ogni volta che si cambia il contratto del connector.
 *
 * Uso:
 *   node server/scripts/preflight-reminder.js [giorni]     (default 10)
 *   PERIMETRO=tutti node server/scripts/preflight-reminder.js   (ignora i centri pilota)
 *
 * Esce con codice 1 se trova qualcosa che impedirebbe un invio: cosi' si puo' mettere
 * in un controllo automatico prima di un rilascio.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { buildPayload, toE164 } = require('../helpers/qualificatore');
const { variabiliMessaggio, isPilota, getCentro } = require('../config/centri-bludental');

const GIORNI = Number(process.argv[2] || 10);
const SOLO_PILOTA = String(process.env.PERIMETRO || 'pilota') !== 'tutti';

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const last10 = (t) => String(t || '').replace(/\D/g, '').slice(-10);

/** Un numero e' spedibile? Stessa regola dell'adapter. */
function telefonoValido(e164) {
  const d = String(e164 || '').replace(/\D/g, '');
  if (d.startsWith('39')) return d.length === 12;
  return d.length >= 11 && d.length <= 15;
}

function etichetta(l) {
  return `${String(l._id).slice(-6)} ${String(l.nome || '(senza nome)').slice(0, 28)}`;
}

async function main() {
  await mongoose.connect(process.env.DATABASE);
  const da = new Date();
  const a = new Date(Date.now() + GIORNI * 24 * 3600 * 1000);

  const futuri = await Lead.find({
    'appuntamento.dataOraTs': { $gte: da, $lte: a },
    'appuntamento.dataOraSparitaAt': null,
  }).select({ nome: 1, cognome: 1, email: 1, numeroTelefono: 1, appuntamento: 1 }).lean();

  const dentro = [];
  const senzaCentro = [];
  const fuoriPilota = [];
  for (const l of futuri) {
    const c = l.appuntamento?.centroId;
    if (!c || !getCentro(c)) { senzaCentro.push(l); continue; }
    if (SOLO_PILOTA && !isPilota(c)) { fuoriPilota.push(l); continue; }
    dentro.push(l);
  }

  console.log(`\n=== PREFLIGHT REMINDER · prossimi ${GIORNI} giorni · perimetro ${SOLO_PILOTA ? 'pilota' : 'TUTTA LA RETE'} ===`);
  console.log(`  appuntamenti in agenda ..... ${futuri.length}`);
  console.log(`  nel perimetro .............. ${dentro.length}`);
  console.log(`  fuori perimetro ............ ${fuoriPilota.length}`);
  console.log(`  senza centro censito ....... ${senzaCentro.length}${senzaCentro.length ? '  <-- non riceverebbero nulla' : ''}`);
  for (const l of senzaCentro.slice(0, 5)) {
    console.log(`      ${etichetta(l)} | centroId=${l.appuntamento?.centroId || '-'} | ${l.appuntamento?.dataOra}`);
  }

  // --- 1) doppioni: stessa persona, stesso appuntamento -------------------
  const perChiave = new Map();
  for (const l of dentro) {
    const k = `${last10(l.numeroTelefono)}|${l.appuntamento.dataOra}`;
    if (!perChiave.has(k)) perChiave.set(k, []);
    perChiave.get(k).push(l);
  }
  const doppioni = [...perChiave.values()].filter((v) => v.length > 1);
  console.log(`\n  DOPPIONI (stesso numero, stesso appuntamento): ${doppioni.length}`);
  for (const gruppo of doppioni.slice(0, 8)) {
    console.log(`      ${gruppo[0].numeroTelefono} x${gruppo.length} | ${gruppo[0].appuntamento.dataOra} | lead ${gruppo.map((l) => String(l._id).slice(-6)).join(', ')}`);
  }

  // --- 2) il payload vero, campo per campo --------------------------------
  const problemi = { telefono: [], email: [], nome: [], citta: [], indirizzo: [], data: [], ora: [], leadId: [] };
  for (const l of dentro) {
    const p = buildPayload({
      lead: l,
      dataOra: l.appuntamento.dataOra,
      nome: l.nome,
      cognome: l.cognome,
      telefono: l.numeroTelefono,
      email: l.email,
      stage: '4g',
      centro: variabiliMessaggio(l.appuntamento.centroId),
    });
    const d = p.dynamicVariables || {};
    if (!telefonoValido(p.phone)) problemi.telefono.push(`${etichetta(l)} -> ${p.phone || '(vuoto)'}`);
    if ('email' in p && !RE_EMAIL.test(p.email)) problemi.email.push(`${etichetta(l)} -> ${p.email}`);
    if (!String(p.name || '').trim()) problemi.nome.push(etichetta(l));
    if (!d.citta_visita) problemi.citta.push(etichetta(l));
    if (!d.indirizzo_visita) problemi.indirizzo.push(etichetta(l));
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(d.data_visita))) problemi.data.push(`${etichetta(l)} -> ${d.data_visita}`);
    if (!/^\d{2}:\d{2}$/.test(String(d.orario_visita))) problemi.ora.push(`${etichetta(l)} -> ${d.orario_visita}`);
    if (!/^[a-f0-9]{24}$/.test(String(d.lead_id))) problemi.leadId.push(etichetta(l));
  }

  console.log(`\n  PAYLOAD ISPEZIONATI: ${dentro.length}`);
  let bloccanti = 0;
  for (const [campo, elenco] of Object.entries(problemi)) {
    console.log(`      ${campo.padEnd(11)} ${String(elenco.length).padStart(3)}`);
    for (const e of elenco.slice(0, 4)) console.log(`          ${e}`);
    bloccanti += elenco.length;
  }

  const totale = bloccanti + senzaCentro.length + doppioni.reduce((a2, g) => a2 + g.length - 1, 0);
  console.log(`\n  ESITO: ${totale ? `${totale} casi da sistemare prima di allargare` : 'tutto pulito'}\n`);

  await mongoose.disconnect();
  process.exit(totale ? 1 : 0);
}

main().catch((e) => { console.error('[Preflight] FALLITO:', e?.message || e); process.exit(2); });
