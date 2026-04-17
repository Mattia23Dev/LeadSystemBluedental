/**
 * Export lead without Nexus sync to CSV.
 *
 * Query (default):
 * {
 *   dataTimestamp: { $gte: ISODate("2026-02-13T00:00:00.000Z") },
 *   nexus_sync: null
 * }
 *
 * Env:
 *   DATABASE or DATABASE_URL (required)
 *   EXPORT_FROM_ISO (optional, default 2026-02-13T00:00:00.000Z)
 *   EXPORT_CSV_PATH (optional, default ./server/csv/leads-no-nexus-sync.csv)
 *
 * Usage:
 *   node server/scripts/export-no-nexus-sync-leads-csv.js
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const mongoose = require('mongoose');
const Lead = require('../models/lead');

// Load env from common locations:
// 1) workspace root/.env
// 2) server/.env (most common in this project)
const envCandidates = [
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const DEFAULT_FROM_ISO = '2026-02-13T00:00:00.000Z';
const FROM_ISO = process.env.EXPORT_FROM_ISO || DEFAULT_FROM_ISO;
const OUTPUT_PATH =
  process.env.EXPORT_CSV_PATH ||
  path.resolve(__dirname, '..', 'csv', 'leads-no-nexus-sync.csv');

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function rowToCsv(row, headers) {
  return headers.map((header) => toCsvValue(row[header])).join(',');
}

async function main() {
  const uri = process.env.DATABASE || process.env.DATABASE_URL;
  if (!uri) throw new Error('Missing env DATABASE or DATABASE_URL');

  const fromDate = new Date(FROM_ISO);
  if (Number.isNaN(fromDate.getTime())) {
    throw new Error(`Invalid EXPORT_FROM_ISO: ${FROM_ISO}`);
  }

  await mongoose.connect(uri);
  try {
    const query = {
      dataTimestamp: { $gte: fromDate },
      nexus_sync: null,
    };

    const leads = await Lead.find(query)
      .select(
        '_id data dataTimestamp nome email numeroTelefono città campagna utmCampaign esito trattamento orientatori idNexus'
      )
      .sort({ dataTimestamp: -1 })
      .lean();

    const headers = [
      'id',
      'dataTimestamp',
      'data',
      'nome',
      'email',
      'numeroTelefono',
      'citta',
      'campagna',
      'utmCampaign',
      'esito',
      'trattamento',
      'orientatoreId',
      'idNexus',
    ];

    const rows = leads.map((lead) => ({
      id: lead._id || '',
      dataTimestamp: lead.dataTimestamp ? new Date(lead.dataTimestamp).toISOString() : '',
      data: lead.data || '',
      nome: lead.nome || '',
      email: lead.email || '',
      numeroTelefono: lead.numeroTelefono || '',
      citta: lead.città || '',
      campagna: lead.campagna || '',
      utmCampaign: lead.utmCampaign || '',
      esito: lead.esito || '',
      trattamento: lead.trattamento || '',
      orientatoreId: lead.orientatori || '',
      idNexus: lead.idNexus || '',
    }));

    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push(rowToCsv(row, headers));
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${csvLines.join('\n')}\n`, 'utf8');

    console.log(`[Export no-nexus-sync] FROM=${fromDate.toISOString()}`);
    console.log(`[Export no-nexus-sync] Query=${JSON.stringify(query)}`);
    console.log(`[Export no-nexus-sync] Leads found=${leads.length}`);
    console.log(`[Export no-nexus-sync] CSV saved at: ${OUTPUT_PATH}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[Export no-nexus-sync] FAILED:', err?.message || err);
  process.exit(1);
});
