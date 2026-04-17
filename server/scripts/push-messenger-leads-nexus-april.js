/**
 * Stesso criterio del filtro UI "Messenger" in client/src/components/Table/Table2.js.
 *
 * Attenzione: in Table2 la proprietà della riga usata da mapCampagnaPerLeadsystem* è `campagna`,
 * ma in fetch viene valorizzata così: `campagna: lead.utmCampaign ? lead.utmCampaign : ""`.
 * Quindi il filtro Messenger in UI si applica a **utmCampaign** nel DB, non al campo `campagna`.
 * Qui si filtra su utmCampaign (substring messenger | chatbot, case-insensitive).
 *
 * Dal 1° aprile in poi (dataTimestamp). Stampa il conteggio, poi invia a Nexus come serverCP/chatbot.
 *
 * Env:
 *   DATABASE — obbligatorio
 *   NEXUS_PUSH_FROM — ISO date (default: 2026-04-01T00:00:00.000Z)
 *   NEXUS_PUSH_SKIP_EXISTING_ID_NEXUS — true/false (default: true)
 *   NEXUS_PUSH_DRY_RUN — true/false (default: false)
 *
 * Uso: node server/scripts/push-messenger-leads-nexus-april.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const {
  syncMessengerLeadToNexus,
  isValidPhoneNumber,
} = require('./lib/nexus-chatbot-style-sync');

const FROM = new Date(
  process.env.NEXUS_PUSH_FROM || '2026-04-01T00:00:00.000Z',
);
const SKIP_EXISTING =
  (process.env.NEXUS_PUSH_SKIP_EXISTING_ID_NEXUS || 'true').toLowerCase() !==
  'false';
const DRY_RUN =
  (process.env.NEXUS_PUSH_DRY_RUN || '').toLowerCase() === 'true' ||
  process.argv.includes('--dry-run');

/** Come la UI: includes su ciò che in tabella è `row.campagna` → in Mongo è `utmCampaign`. */
function baseQuery() {
  return {
    dataTimestamp: { $gte: FROM },
    $or: [
      { utmCampaign: { $regex: 'messenger', $options: 'i' } },
      { utmCampaign: { $regex: 'chatbot', $options: 'i' } },
    ],
  };
}

async function main() {
  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');

  await mongoose.connect(uri);
  try {
    const matchOnly = baseQuery();
    const totalMatch = await Lead.countDocuments(matchOnly);

    const query = { ...matchOnly };
    if (SKIP_EXISTING) {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ idNexus: { $exists: false } }, { idNexus: null }, { idNexus: '' }] },
      ];
    }

    const total = await Lead.countDocuments(query);
    console.log(
      `[Messenger → Nexus] Lead filtro Messenger UI (utmCampaign ⊃ messenger | chatbot) da ${FROM.toISOString()}: ${totalMatch}`,
    );
    if (SKIP_EXISTING) {
      console.log(
        `[Messenger → Nexus] Da inviare (senza idNexus già valorizzato): ${total}`,
      );
    }
    console.log(
      `[Messenger → Nexus] skipExistingIdNexus=${SKIP_EXISTING} dryRun=${DRY_RUN}`,
    );

    if (DRY_RUN) {
      return;
    }

    let sent = 0;
    let skippedPhone = 0;
    let failed = 0;

    const cursor = Lead.find(query).cursor();
    for await (const lead of cursor) {
      if (!isValidPhoneNumber(lead.numeroTelefono || '')) {
        skippedPhone++;
        console.warn(
          `[Messenger → Nexus] Skip telefono invalido | _id=${lead._id}`,
        );
        continue;
      }
      const ok = await syncMessengerLeadToNexus(lead);
      if (ok) sent++;
      else failed++;
    }

    console.log(
      `[Messenger → Nexus] Fatto | inviate=${sent} | skipTelefono=${skippedPhone} | fallite=${failed}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[Messenger → Nexus] FAILED:', err?.message || err);
  process.exit(1);
});
