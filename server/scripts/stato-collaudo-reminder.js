/**
 * Fotografia del collaudo reminder: a che punto e' ciascuno dei cinque tester.
 *
 * Mette in fila le tre fonti che devono raccontare la stessa storia:
 *   1) l'agenda Nexus       -> l'appuntamento e' stato fissato davvero?
 *   2) il mirror locale     -> nexus-agenda-sync l'ha ripreso, con il centro?
 *   3) il blocco reminder   -> quali messaggi sono partiti, cosa ha risposto il paziente
 * e, in fondo, cosa manderebbe il cron al prossimo giro secondo la macchina a stati.
 *
 * Sono sole letture: non invia, non scrive, non tocca Nexus.
 *
 * Uso: node server/scripts/stato-collaudo-reminder.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');
const { listLeads } = require('../helpers/nexus');
const { NUMERI_TEST, last10 } = require('../config/test-whitelist');
const { getCentro, isPilota } = require('../config/centri-bludental');
const { stagePerAppuntamento, messaggioDaInviare } = require('./reminder-appuntamenti');

const CAMPAGNA = 'TEST REMINDER - collaudo agosto 2026';

/** ISO con fuso -> "gio 27/08 10:30", leggendo l'ora locale scritta nella stringa. */
function leggibile(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '-';
  const [, y, mo, d, hh, mi] = m;
  const g = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'][new Date(Number(y), Number(mo) - 1, Number(d)).getDay()];
  return `${g} ${d}/${mo} ${hh}:${mi}`;
}

function oreA(ts) {
  if (!ts) return null;
  return (new Date(ts).getTime() - Date.now()) / 3600000;
}

async function main() {
  await mongoose.connect(process.env.DATABASE);

  // --- Nexus: cosa dice l'agenda ---
  const righe = await listLeads({
    select: 't.id, t.nominativo, t.telefono, t.data_ora_appuntamento, t.id_centro_bludental, t.centro_bludental, t.stato_conferma, t.lead_status',
    conditions: `t.campagna = '${CAMPAGNA}'`,
    group: '', having: '', order: 't.id ASC', limit: '50', offset: '', page: '', pageSize: '',
  }).catch((e) => { console.error('Nexus non raggiungibile:', e?.message); return []; });
  const perTelefono = new Map((Array.isArray(righe) ? righe : []).map((r) => [last10(r.telefono), r]));

  console.log(`\n=== COLLAUDO REMINDER - ${new Date().toLocaleString('it-IT')} ===\n`);

  const daFissare = [];

  for (const t of NUMERI_TEST) {
    const tel = last10(t.telefono);
    const lead = await Lead.findOne({ numeroTelefono: { $regex: `${tel}$` } }).sort({ _id: -1 });
    const nx = perTelefono.get(tel);

    console.log(`--- ${t.nome} (${tel}) ---`);
    if (!lead) { console.log('  lead NON trovata nel nostro DB\n'); continue; }

    // 1) Nexus
    const appNexus = nx?.data_ora_appuntamento || null;
    console.log(`  Nexus    appuntamento=${appNexus ? leggibile(appNexus.replace(' ', 'T')) : 'NON FISSATO'} | centro=${nx?.id_centro_bludental || '-'} ${nx?.centro_bludental || ''} | stato_conferma=${nx?.stato_conferma || '-'}`);

    // 2) mirror locale
    const app = lead.appuntamento || {};
    const centro = getCentro(app.centroId);
    const ore = oreA(app.dataOraTs);
    const finestra = stagePerAppuntamento(app.dataOraTs);
    if (!app.dataOra) {
      console.log('  mirror   nessun appuntamento');
      if (appNexus) console.log('           ATTENZIONE: su Nexus c\'e\', qui no -> lanciare nexus-agenda-sync.js');
      daFissare.push(t.nome);
    } else {
      const problemi = [];
      if (!centro) problemi.push('CENTRO MANCANTE O IGNOTO: messaggio non compilabile');
      else if (!isPilota(app.centroId)) problemi.push(`centro ${centro.nome} FUORI dal perimetro pilota: non si invia`);
      if (app.dataOraSparitaAt) problemi.push('appuntamento SPARITO dall\'agenda Nexus (disdetta): niente reminder');
      console.log(`  mirror   ${leggibile(app.dataOra)} (fra ${ore.toFixed(1)}h) | centro=${app.centroId || '-'} ${centro ? `${centro.nome} - ${centro.comune}, ${centro.indirizzo}` : ''}`);
      console.log(`           finestra attuale=${finestra || 'nessuna (fuori dai 3h-96h)'}${problemi.length ? `\n           ${problemi.join('\n           ')}` : ''}`);
    }

    // 3) messaggi partiti e risposta
    const rem = app.reminder || {};
    const invii = Array.isArray(rem.invii) ? rem.invii : [];
    if (!invii.length) {
      console.log(`  messaggi nessuno partito${rem.esitoInvio ? ` (storico vecchio: stage=${rem.stage} esito=${rem.esitoInvio})` : ''}`);
    } else {
      for (const i of invii) {
        console.log(`  messaggi ${String(i.stage).padEnd(3)} ${new Date(i.at).toLocaleString('it-IT')} esito=${i.esito}${i.errore ? ` errore=${i.errore}` : ''}`);
      }
    }
    console.log(`  risposta ${rem.risposta || 'nessuna'}${rem.rispostaAt ? ` (${new Date(rem.rispostaAt).toLocaleString('it-IT')})` : ''} | stato_conferma scritto=${rem.statoConferma || '-'}${rem.statoConfermaPushOk === false ? ' PUSH FALLITO' : ''}`);
    if (rem.attesaAt) {
      console.log(`  attesa   ${rem.attesaValore} scritto il ${new Date(rem.attesaAt).toLocaleString('it-IT')}${rem.attesaPushOk === false ? ' PUSH FALLITO' : ''} (per ${rem.attesaPerDataOra || '-'})`);
    }

    // 4) cosa farebbe il cron adesso
    if (app.dataOra) {
      const scelta = messaggioDaInviare(lead, finestra);
      console.log(`  prossimo ${scelta.stage ? `manderebbe il messaggio '${scelta.stage}' al prossimo giro` : `niente (${scelta.motivo})`}`);
    }
    console.log('');
  }

  // --- cosa ha fatto il cron oggi ---
  const inizioGiornata = new Date();
  inizioGiornata.setHours(0, 0, 0, 0);
  const logs = await DeepagentLog.find({
    source: 'reminder-appuntamento',
    $or: [{ receivedAt: { $gte: inizioGiornata } }, { createdAt: { $gte: inizioGiornata } }],
  }).sort({ _id: -1 }).limit(50).lean();

  console.log('=== ATTIVITA\' DEL CRON OGGI ===');
  if (!logs.length) {
    console.log('nessuna riga di log: il cron non ha ancora avuto niente da mandare.');
  } else {
    for (const l of logs) {
      const q = l.receivedAt || l.createdAt;
      console.log(`  ${q ? new Date(q).toLocaleString('it-IT') : '-'} | ${l.endpoint} | ${l.outcome} | lead=${l.matchedLeadId || '-'} | ${l.userPhone || '-'}`);
    }
  }
  console.log('');

  if (daFissare.length) {
    console.log(`ANCORA SENZA APPUNTAMENTO: ${daFissare.join(', ')}\n`);
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
