/**
 * Appuntamenti dei centri pilota a cui il promemoria WhatsApp NON puo' arrivare.
 *
 * A cosa serve: il ciclo del reminder scarta questi pazienti (numero rifiutato dal
 * connector, numero mutilo, fisso, numero assente) e da quel momento non li ritenta
 * piu'. Senza questo elenco resterebbero un buco silenzioso: appuntamenti veri che
 * nessuno conferma e che nessuno sa di dover richiamare a voce.
 *
 * L'elenco e' pensato per essere girato alla sede: nome, numero cosi' com'e' scritto,
 * data della visita, centro, e il motivo per cui il messaggio non parte.
 *
 * Sole letture.
 *
 * Uso: node server/scripts/report-reminder-non-spedibili.js [giorni]
 *      giorni = quanti giorni avanti guardare (default 14)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { toE164 } = require('../helpers/qualificatore');
const { isPilota, getCentro } = require('../config/centri-bludental');

const GIORNI = Number(process.argv[2] || 14);

/** Lo stesso giudizio che da' il connector, ma spiegato a parole. */
function perche(lead) {
  const tel = lead.numeroTelefono;
  if (!tel) return 'numero assente';
  const e164 = toE164(tel);
  const cifre = String(e164).replace(/\D/g, '');
  if (cifre.startsWith('39') && cifre.length !== 12) {
    const locali = cifre.slice(2).length;
    return `numero italiano di ${locali} cifre invece di 10 (${e164})`;
  }
  if (!cifre.startsWith('39') && (cifre.length < 11 || cifre.length > 15)) return `numero non riconoscibile (${e164})`;
  return null;
}

/** Il ciclo l'ha gia' scartato per sempre? */
function scartatoDalCiclo(rem, dataOra) {
  const invii = Array.isArray(rem?.invii) ? rem.invii : [];
  const dello = invii.filter((i) => i.perDataOra === dataOra);
  const rifiutato = dello.find((i) => i.permanente);
  if (rifiutato) return `rifiutato dal connector sullo stage ${rifiutato.stage} (${rifiutato.errore || 'senza dettaglio'})`;
  const falliti = dello.filter((i) => i.esito === 'failed' || i.esito === 'invalid');
  if (falliti.length >= 3) return `${falliti.length} invii falliti sullo stesso messaggio (${falliti[falliti.length - 1]?.errore || 'senza dettaglio'})`;
  return null;
}

async function main() {
  await mongoose.connect(process.env.DATABASE);

  const ora = new Date();
  const fine = new Date(ora.getTime() + GIORNI * 24 * 3600 * 1000);
  const leads = await Lead.find({ 'appuntamento.dataOraTs': { $gte: ora, $lte: fine } })
    .select({ nome: 1, numeroTelefono: 1, idNexus: 1, appuntamento: 1 })
    .lean();

  const righe = [];
  for (const l of leads) {
    const app = l.appuntamento || {};
    if (!isPilota(app.centroId)) continue;                 // fuori pilota: nessun messaggio previsto
    if (app.noShowDataOra === app.dataOra) continue;        // appuntamento annullato
    const motivo = perche(l) || scartatoDalCiclo(app.reminder, app.dataOra);
    if (!motivo) continue;
    righe.push({
      quando: app.dataOra,
      nome: l.nome || '(senza nome)',
      telefono: l.numeroTelefono || '-',
      centro: getCentro(app.centroId)?.nome || app.centroNome || app.centroId || '-',
      motivo,
      idNexus: l.idNexus || '-',
      leadId: String(l._id),
    });
  }
  righe.sort((a, b) => String(a.quando).localeCompare(String(b.quando)));

  console.log(`\n=== Promemoria che NON possono partire — prossimi ${GIORNI} giorni, centri pilota ===`);
  console.log(`Appuntamenti pilota guardati: ${leads.filter((l) => isPilota(l.appuntamento?.centroId)).length} | da richiamare a voce: ${righe.length}\n`);
  for (const r of righe) {
    console.log(`${String(r.quando).slice(0, 16).replace('T', ' ')}  ${r.nome.padEnd(28)} ${r.telefono.padEnd(18)} ${String(r.centro).padEnd(24)} ${r.motivo}`);
  }
  if (!righe.length) console.log('Nessuno: tutti gli appuntamenti pilota in arrivo sono contattabili.');

  console.log('\n--- CSV ---');
  console.log('data_ora;nome;telefono;centro;motivo;id_nexus;lead_id');
  for (const r of righe) {
    console.log([r.quando, r.nome, r.telefono, r.centro, r.motivo, r.idNexus, r.leadId].join(';'));
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
