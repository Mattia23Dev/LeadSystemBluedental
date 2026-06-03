/**
 * Rollback dei duplicati creati da import-meta-xlsx-leads.js.
 *
 * Strategia (più stretta della precedente):
 *   1. Legge gli stessi due Excel sorgente.
 *   2. Per ogni riga Excel cerca il Lead che ho appena inserito IO: stessa email/telefono
 *      e _id timestamp dentro la finestra di run.
 *   3. Se trovato, verifica se esiste un altro Lead PIU' VECCHIO (di prima del run) con
 *      stessa email o stesso telefono (match ultime 10 cifre): se sì lo identifica come
 *      duplicato e lo cancella.
 *
 * Questo evita di toccare lead create dalla pipeline naturale durante o intorno al run.
 *
 * Uso:
 *   node server/scripts/rollback-import-duplicates.js --dry-run
 *   node server/scripts/rollback-import-duplicates.js
 */
require('dotenv').config();

const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Lead = require('../models/lead');

const DRY_RUN = process.argv.includes('--dry-run');
const BLUDENTAL_USER_ID = '65d3110eccfb1c0ce51f7492';

// Finestra di run import-meta-xlsx-leads.js (UTC).
// Lo script reale ha inserito tra ~22:03 e ~22:05 del 2026-05-13.
// Estendo a [21:55, 22:15] per sicurezza.
const RUN_START = new Date('2026-05-13T21:55:00Z');
const RUN_END = new Date('2026-05-13T22:15:00Z');

// Finestra "oggi" del dedup originale: 13 maggio 2026 in timezone Italia (+02:00).
const TODAY_START = new Date('2026-05-12T22:00:00Z'); // 13 mag 00:00 IT
const TODAY_END = new Date('2026-05-13T21:59:59Z');   // 13 mag 23:59:59 IT

const FILES = [
  {
    path: path.join(__dirname, '..', 'Bludental 13 Maggio .xlsx'),
    sheets: {
      'Grandi Riab': { columns: 'std' },
      'Allineatori': { columns: 'alt' },
      'GOLD': { columns: 'std' },
      'Ambra': { columns: 'std-with-trattamento' },
    },
  },
  {
    path: path.join(__dirname, '..', 'Meta web 13 Maggio .xlsx'),
    sheets: {
      'Foglio1': { columns: 'std' },
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
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function extractRow(row, columnsType) {
  const email = columnsType === 'alt' ? row['e-mail'] : row['email'];
  const phoneRaw = columnsType === 'alt' ? row['numero_di_telefono'] : row['phone_number'];
  return {
    email: String(email || '').trim().toLowerCase(),
    numeroTelefono: stripPhonePrefix(phoneRaw),
  };
}

function objectIdFromDate(date) {
  const ts = Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0');
  return new mongoose.Types.ObjectId(ts + '0000000000000000');
}

async function main() {
  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Manca env DATABASE');
  await mongoose.connect(uri);
  console.log(`Connesso a Mongo. DRY_RUN=${DRY_RUN}`);
  console.log(`Finestra run: ${RUN_START.toISOString()} → ${RUN_END.toISOString()}`);

  try {
    const startOid = objectIdFromDate(RUN_START);
    const endOid = objectIdFromDate(RUN_END);

    let excelRows = 0;
    let notFoundRecent = 0;
    let noOlderMatch = 0;
    let toDelete = 0;
    const seenInsertedIds = new Set();

    for (const file of FILES) {
      console.log(`\n=== File: ${path.basename(file.path)} ===`);
      const wb = XLSX.readFile(file.path);
      for (const [sheetName, cfg] of Object.entries(file.sheets)) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        console.log(`  Sheet "${sheetName}" — ${rows.length} righe`);

        for (const raw of rows) {
          excelRows++;
          const r = extractRow(raw, cfg.columns);
          if (!r.email && !r.numeroTelefono) continue;

          const last10 = normalizePhoneLast10(r.numeroTelefono);
          const ors = [];
          if (r.email) ors.push({ email: r.email });
          if (last10) ors.push({ numeroTelefono: { $regex: last10 + '$' } });

          // Cerca tutte le lead inserite da me che corrispondono (recenti, in finestra)
          // e che non ho già preso in considerazione (nel caso di riga Excel duplicata).
          const candidates = await Lead.find({
            _id: { $gte: startOid, $lte: endOid, $nin: Array.from(seenInsertedIds) },
            utente: BLUDENTAL_USER_ID,
            $or: ors,
          }).sort({ _id: 1 }); // più vecchio prima
          const inserted = candidates[0];

          if (!inserted) {
            notFoundRecent++;
            continue;
          }
          seenInsertedIds.add(inserted._id.toString());

          // Match con un'altra lead di OGGI (13 mag IT) entrata PRIMA del mio run.
          const olderMatch = await Lead.findOne({
            _id: { $ne: inserted._id, $lt: startOid },
            utente: BLUDENTAL_USER_ID,
            dataTimestamp: { $gte: TODAY_START, $lte: TODAY_END },
            $or: ors,
          });

          if (olderMatch) {
            toDelete++;
            console.log(
              `[DEL] ${inserted._id} email=${inserted.email || '-'} tel=${inserted.numeroTelefono || '-'} → older ${olderMatch._id} (data=${olderMatch.data})`,
            );
            if (!DRY_RUN) {
              await Lead.deleteOne({ _id: inserted._id });
            }
          } else {
            noOlderMatch++;
          }
        }
      }
    }

    console.log('\n=== RIEPILOGO ===');
    console.log(`Righe Excel processate:                ${excelRows}`);
    console.log(`Lead inserite da me trovate:           ${seenInsertedIds.size}`);
    console.log(`Lead Excel non trovate in finestra:    ${notFoundRecent}`);
    console.log(`Cancellate (duplicati di vecchie):     ${toDelete}`);
    console.log(`Tenute (genuinamente nuove):           ${noOlderMatch}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('FAILED:', err?.message || err);
  process.exit(1);
});
