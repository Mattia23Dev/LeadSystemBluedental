/**
 * Lead SOMA: campagna o utmCampaign uguale a "soma" (case-insensitive).
 * Dal 1° aprile in poi (dataTimestamp). Stampa il conteggio, poi invia a Nexus come serverCP/chatbot (Gold).
 *
 * NEXUS_PUSH_DRY_RUN: default false — se true o flag --dry-run, solo conteggi niente invio a Nexus.
 *
 * Env: come push-messenger-leads-nexus-april.js (DATABASE, NEXUS_PUSH_FROM, NEXUS_PUSH_DRY_RUN, …)
 *
 * Uso: node server/scripts/push-soma-leads-nexus-april.js
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
const DRY_RUN = false;

const SOMA_REGEX = /^soma$/i;

function baseQuery() {
  return {
    dataTimestamp: { $gte: FROM },
    $or: [
      { campagna: { $regex: SOMA_REGEX } },
      { utmCampaign: { $regex: SOMA_REGEX } },
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
      `[Soma → Nexus] Lead SOMA campagna/utm (da ${FROM.toISOString()}): ${totalMatch}`,
    );
    if (SKIP_EXISTING) {
      console.log(
        `[Soma → Nexus] Da inviare (senza idNexus già valorizzato): ${total}`,
      );
    }
    console.log(
      `[Soma → Nexus] skipExistingIdNexus=${SKIP_EXISTING} dryRun=${DRY_RUN}`,
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
        console.warn(`[Soma → Nexus] Skip telefono invalido | _id=${lead._id}`);
        continue;
      }
      const ok = await syncMessengerLeadToNexus(lead);
      if (ok) sent++;
      else failed++;
    }

    console.log(
      `[Soma → Nexus] Fatto | inviate=${sent} | skipTelefono=${skippedPhone} | fallite=${failed}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[Soma → Nexus] FAILED:', err?.message || err);
  process.exit(1);
});
