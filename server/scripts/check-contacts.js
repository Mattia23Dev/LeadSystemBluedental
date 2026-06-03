/**
 * Verifica se due contatti specifici esistono nel database.
 * Cerca per idNexus (id_lead) e per nome/cognome.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const LeadDeleted = require('../models/leadDeleted');

const targets = [
  {
    label: 'Angelo Nessuno',
    id_lead: '136b1f7f-2a10-bc5c-c65b-69f71f08c8ed',
    nome: 'Angelo',
    cognome: 'Nessuno',
  },
  {
    label: 'Costi Costi',
    id_lead: '72ba025a-2567-50fc-2890-69ffb4ec0151',
    nome: 'Costi',
    cognome: 'Costi',
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.DATABASE);

    for (const t of targets) {
      console.log(`\n========== ${t.label} ==========`);

      // 1) Match esatto su idNexus
      const byNexusId = await Lead.find({ idNexus: t.id_lead }).lean();
      console.log(`Lead.idNexus == "${t.id_lead}": ${byNexusId.length} risultati`);
      byNexusId.forEach((l) =>
        console.log(
          ` - _id=${l._id} nome="${l.nome}" tel=${l.numeroTelefono} esito="${l.esito}" data=${l.data}`
        )
      );

      // 2) Match esatto su idDeasoft (al volo, anche se nei dati è null)
      const byDeasoft = await Lead.find({ idDeasoft: t.id_lead }).lean();
      if (byDeasoft.length) {
        console.log(`Lead.idDeasoft == "${t.id_lead}": ${byDeasoft.length} risultati`);
      }

      // 3) Match su nome (case-insensitive). Schema usa solo "nome" intero (es "Mario Rossi")
      const fullName = `${t.nome} ${t.cognome}`;
      const byName = await Lead.find({
        nome: { $regex: `^${t.nome}\\s+${t.cognome}\\s*$`, $options: 'i' },
      })
        .select('_id nome numeroTelefono email esito data idNexus idDeasoft campagna utmCampaign')
        .lean();
      console.log(`Lead.nome ~ "${fullName}": ${byName.length} risultati`);
      byName.forEach((l) =>
        console.log(
          ` - _id=${l._id} nome="${l.nome}" tel=${l.numeroTelefono} esito="${l.esito}" data=${l.data} idNexus=${l.idNexus || '-'} idDeasoft=${l.idDeasoft || '-'}`
        )
      );

      // 4) Match parziale (solo cognome) per controllare possibili varianti
      const byPartial = await Lead.find({
        nome: { $regex: t.cognome, $options: 'i' },
      })
        .select('_id nome numeroTelefono esito data idNexus')
        .limit(20)
        .lean();
      console.log(`Lead.nome contiene "${t.cognome}": ${byPartial.length} risultati (max 20)`);
      byPartial.forEach((l) =>
        console.log(
          ` - _id=${l._id} nome="${l.nome}" tel=${l.numeroTelefono} esito="${l.esito}" data=${l.data} idNexus=${l.idNexus || '-'}`
        )
      );

      // 5) Controllo anche su LeadDeleted (per cognome)
      const deleted = await LeadDeleted.find({
        $or: [
          { nome: { $regex: t.nome, $options: 'i' } },
          { cognome: { $regex: t.cognome, $options: 'i' } },
        ],
      }).lean();
      console.log(`LeadDeleted match su nome/cognome: ${deleted.length} risultati`);
      deleted.forEach((l) =>
        console.log(` - _id=${l._id} nome="${l.nome}" cognome="${l.cognome}" tel=${l.numeroTelefono}`)
      );
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e?.message || e);
    process.exit(1);
  }
})();
