/**
 * Importa lead dai due Excel di Meta (Bludental + Meta Web) replicando la pipeline di
 * controllers/subs.js -> calculateAndAssignLeadsEveryDay:
 *   - crea Lead in Mongo
 *   - assegna round-robin all'orientatore (utente=65d3110eccfb1c0ce51f7492, daAssegnare=true)
 *   - aggiorna LastLeadUser
 *   - invia a Nexus tramite helpers/nexus.saveLead e salva idNexus
 *
 * Dedup: una riga viene saltata se esiste gia' un Lead con stessa email o stesso telefono
 * (match ultime 10 cifre) e dataTimestamp di oggi.
 *
 * Uso:
 *   node server/scripts/import-meta-xlsx-leads.js --dry-run    (solo log)
 *   node server/scripts/import-meta-xlsx-leads.js              (esegue insert + Nexus)
 */
require('dotenv').config();

const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const Orientatore = require('../models/orientatori');
const LastLeadUser = require('../models/lastLeadUser');
const { saveLead } = require('../helpers/nexus');

const DRY_RUN = process.argv.includes('--dry-run');
const BLUDENTAL_USER_ID = '65d3110eccfb1c0ce51f7492';

const FILES = [
  {
    path: path.join(__dirname, '..', 'Bludental 13 Maggio .xlsx'),
    sheets: {
      'Grandi Riab': { microFonte: 'GRANDI RIABILITAZIONI', columns: 'std' },
      'Allineatori': { microFonte: 'ALLINEATORI', columns: 'alt' },
      'GOLD': { microFonte: 'GOLD', columns: 'std' },
      'Ambra': { microFonte: 'AMBRA WEB', columns: 'std-with-trattamento' },
    },
  },
  {
    path: path.join(__dirname, '..', 'Meta web 13 Maggio .xlsx'),
    sheets: {
      'Foglio1': { microFonte: 'META WEB', columns: 'std' },
    },
  },
];

function stripPhonePrefix(s) {
  if (!s) return '';
  return String(s).replace(/^p:/, '').trim();
}

function normalizePhoneLast10(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizePhoneForNexus(phone) {
  if (!phone) return '';
  const last10 = normalizePhoneLast10(phone);
  return last10 || String(phone).trim();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function extractRow(row, columnsType) {
  const fullName = columnsType === 'alt'
    ? row['nome_e_cognome']
    : row['full_name'];
  const email = columnsType === 'alt'
    ? row['e-mail']
    : row['email'];
  const phoneRaw = columnsType === 'alt'
    ? row['numero_di_telefono']
    : row['phone_number'];
  const trattamento = columnsType === 'std-with-trattamento'
    ? row['seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni']
    : '';
  const centro = row['seleziona_il_centro_piu_vicino_a_te'] || row['seleziona_il_centro_più_vicino_a_te'] || '';
  return {
    nome: String(fullName || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    numeroTelefono: stripPhonePrefix(phoneRaw),
    trattamento: trattamento ? String(trattamento).replace(/_/g, ' ').trim() : '',
    citta: centro ? String(centro).replace(/_/g, ' ').trim() : '',
    ad_name: row['ad_name'] || '',
    adset_name: row['adset_name'] || '',
    campaign_name: row['campaign_name'] || '',
    created_time: row['created_time'] || '',
  };
}

async function main() {
  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Manca env DATABASE');

  await mongoose.connect(uri);
  console.log(`Connesso a Mongo. DRY_RUN=${DRY_RUN}`);

  try {
    const users = await Orientatore.find({
      utente: BLUDENTAL_USER_ID,
      daAssegnare: true,
    });
    if (!users.length) {
      console.error('Nessun orientatore daAssegnare=true: abort.');
      return;
    }
    console.log(`Orientatori disponibili: ${users.length}`);

    const lastUserLeadData = await LastLeadUser.findOne({});
    let userIdx = 0;
    if (lastUserLeadData?.userId) {
      const i = users.findIndex(
        (u) => u._id.toString() === lastUserLeadData.userId.toString(),
      );
      userIdx = i === -1 ? 0 : (i + 1) % users.length;
    }
    console.log(`Round-robin parte da index ${userIdx} (${users[userIdx]?.nome} ${users[userIdx]?.cognome})`);

    const summary = {
      totalRows: 0,
      skippedNoContact: 0,
      created: 0,
      nexusFailed: 0,
    };
    let lastUserReceivedLead = null;

    for (const file of FILES) {
      console.log(`\n=== File: ${path.basename(file.path)} ===`);
      const wb = XLSX.readFile(file.path);

      for (const [sheetName, cfg] of Object.entries(file.sheets)) {
        if (!wb.Sheets[sheetName]) {
          console.warn(`  Sheet "${sheetName}" non trovato, salto.`);
          continue;
        }
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        console.log(`\n  --- Sheet "${sheetName}" — ${rows.length} righe — microFonte=${cfg.microFonte} ---`);

        for (const raw of rows) {
          summary.totalRows++;
          const r = extractRow(raw, cfg.columns);

          if (!r.email && !r.numeroTelefono) {
            summary.skippedNoContact++;
            console.log(`    [SKIP no-contact] nome="${r.nome}"`);
            continue;
          }

          const user = users[userIdx % users.length];
          summary.created++;
          console.log(
            `    [NEW] ${r.email || '(no email)'} | tel=${r.numeroTelefono} | trattamento="${r.trattamento || '(default)'}" | citta="${r.citta}" | → ${user.nome} ${user.cognome}`,
          );

          if (!DRY_RUN) {
            try {
              const createdAt = r.created_time ? new Date(r.created_time) : new Date();
              const newLead = new Lead({
                data: createdAt.toISOString(),
                dataTimestamp: createdAt,
                nome: r.nome,
                email: r.email,
                numeroTelefono: r.numeroTelefono,
                campagna: 'Social',
                città: r.citta || '',
                trattamento: r.trattamento || 'Implantologia a carico immediato',
                esito: 'Da contattare',
                orientatori: user._id,
                utente: BLUDENTAL_USER_ID,
                note: '',
                fatturato: '',
                utmContent: r.ad_name || '',
                utmAdset: r.adset_name || '',
                utmCampaign: r.campaign_name || '',
                tentativiChiamata: '0',
                giàSpostato: false,
              });
              await newLead.save();

              const leadPayload = {
                nome: newLead.nome,
                ragione_sociale: newLead.nome,
                email: newLead.email,
                telefono: normalizePhoneForNexus(newLead.numeroTelefono),
                punteggio: null,
                riassunto_chiamata: null,
                id_lead_leadsystem: newLead._id,
                note: null,
                data_appuntamento: null,
                citta: newLead.città,
                trattamento: newLead.trattamento,
                lead_status: 'Da contattare',
                dettaglio_status_negativo: null,
                numero_tentativi: null,
                macro_fonte: 'Online',
                micro_fonte: cfg.microFonte,
                campagna: newLead.utmCampaign || '',
                adset: newLead.utmAdset || '',
                ad: newLead.utmContent || '',
                sorgente: 'Funnel',
              };

              const leadNexus = await saveLead(leadPayload);
              if (leadNexus?.id) {
                newLead.idNexus = leadNexus.id;
                await newLead.save();
                console.log(`      [OK] leadId=${newLead._id} idNexus=${leadNexus.id}`);
              } else {
                summary.nexusFailed++;
                console.warn(`      [Nexus] nessun id ritornato per ${newLead._id}`);
              }
              lastUserReceivedLead = user._id;
            } catch (e) {
              summary.nexusFailed++;
              console.error(`      [ERR] insert/Nexus: ${e.message}`);
            }
          }

          userIdx = (userIdx + 1) % users.length;
        }
      }
    }

    if (!DRY_RUN && lastUserReceivedLead) {
      await LastLeadUser.findOneAndUpdate(
        {},
        { userId: lastUserReceivedLead },
        { upsert: true },
      );
      console.log(`\nLastLeadUser aggiornato a ${lastUserReceivedLead}`);
    }

    console.log('\n=== RIEPILOGO ===');
    console.log(`Righe totali processate:        ${summary.totalRows}`);
    console.log(`Saltate (no email & no tel):    ${summary.skippedNoContact}`);
    console.log(
      `Nuove lead${DRY_RUN ? ' (DRY RUN, non scritte)' : ''}: ${summary.created}`,
    );
    if (!DRY_RUN) console.log(`Errori insert/Nexus:            ${summary.nexusFailed}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('FAILED:', err?.message || err);
  process.exit(1);
});
