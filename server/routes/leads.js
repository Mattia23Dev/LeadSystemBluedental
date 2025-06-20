const express = require('express');
const {dailyCap} = require('../controllers/subs');
const User = require('../models/user');
const axios = require('axios');
const moment = require('moment');

const router = express.Router();

const {getLeadsFb, getLeadsManual, getAllLead, calculateFatturatoByUtente, calculateFatturatoByOrientatore, calculateFatturatoByOrientatoreUser, getLeadsManualWhatsapp, updateLeadRecall, getLeadsManualBase, getOtherLeads, getOrientatoreLeads, getOtherLeadsOri, getLeadById} = require('../controllers/leads');
const { createOrientatore, deleteOrientatore, createLead, deleteLead, updateLead, getOrientatori, getLeadDeleted, updateOrientatore, deleteRecall, updateAssegnazioneOrientatore } = require('../controllers/orientatore');
const { getAllLeadForCounter, LeadForMarketing } = require('../controllers/superAdmin');
const { getDataCap } = require('../controllers/comparadentista');
const Orientatore = require('../models/orientatori');
const Lead = require('../models/lead');
const { saveLead } = require('../helpers/nexus');
const LastLeadUser = require('../models/lastLeadUser');

router.post("/get-leads-fb", getLeadsFb);
router.post("/get-leads-manual", getLeadsManual);
router.post("/get-leads-manual-base", getLeadsManualBase);
router.post("/get-orientatore-lead-base", getOrientatoreLeads);
router.post("/get-other-leads", getOtherLeads);
router.post("/get-other-leads-ori", getOtherLeadsOri);
router.get('/leads/:id', getLeadById);
router.post("/get-lead-whatsapp", getLeadsManualWhatsapp);
router.post("/create-orientatore", createOrientatore);
router.delete("/delete-orientatore", deleteOrientatore);
router.post('/lead/create/:id', createLead);
router.delete("/delete-lead", deleteLead);
router.put('/lead/:userId/update/:id', updateLead);
router.get('/utenti/:id/orientatori', getOrientatori);
router.get('/getAllLeads-admin', getAllLead);
router.get('/calculateFatturatoByUtente', calculateFatturatoByUtente);
router.get('/calculateFatturatoByOrientatore', calculateFatturatoByOrientatore)
router.post('/calculateFatturatoByOrientatoreUser/:id', calculateFatturatoByOrientatoreUser);
router.get('/get-lead-deleted', getLeadDeleted);
router.put('/update-orientatore/:id', updateOrientatore);
router.post('/update-lead-recall', updateLeadRecall);
router.post('/delete-recall', deleteRecall);

router.get('/get-all-leads-for-counter', getAllLeadForCounter);

router.put('/update-orientatore-assegnazione', updateAssegnazioneOrientatore);

router.get('/leads-for-marketing', LeadForMarketing);

router.post("/lead-cap", getDataCap);

router.post('/modify-daily-cap', dailyCap);

router.post('/enable-notifications', async (req, res) => {
  try {
    const userId = req.body.userId; 
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    user.notificationsEnabled = true;
    if (req.body.subscription) {
      user.notificationSubscriptions.push(req.body.subscription);
    }
    await user.save();

    return res.status(200).json({ message: 'Notifiche abilitate per l\'utente', user });
  } catch (error) {
    console.error('Errore nell\'abilitazione delle notifiche:', error);
    res.status(500).json({ message: 'Si è verificato un errore' });
  }
});

router.post('/update-leads-rec', async (req, res) => {
  const { startDate, endDate } = req.body;
  console.log(req.body)
  try {
    const excludedOrientatoreId = '660fc6b59408391f561edc1a';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const leadsToUpdate = await Lead.find({
      esito: "Non risponde",
      //utmCampaign: /Meta Web/i,
      utente: "65d3110eccfb1c0ce51f7492",
    });
    const filteredLeads = leadsToUpdate.filter((lead) => {
      const leadDate = new Date(lead.data);
      return (
        leadDate >= start &&
        leadDate <= end &&
        Number(lead.tentativiChiamata) > 0
      );
    });
    const orientatore = await Orientatore.findById(excludedOrientatoreId);
    const numLeads = filteredLeads.length;
    console.log(numLeads);

    for (const lead of filteredLeads) {
      lead.orientatori = orientatore._id;
      lead.esito = 'Da contattare';
      await lead.save();
    }

    console.log(`Aggiornamento completato. ${numLeads} lead sono stati aggiornati.`);
    res.status(200).json({ message: `Aggiornamento completato. ${numLeads} lead sono stati aggiornati.` });
  } catch (error) {
    console.error('Si è verificato un errore durante l\'aggiornamento dei lead:', error);
    res.status(500).json({ error: 'Si è verificato un errore durante l\'aggiornamento dei lead.' });
  }
});







const locations = [
  {"name": "Bologna", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477fd5f59db02185:0x2da11204757c824?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Carpi", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477f8d6b0a375727:0x9b0945e0b953fd9b?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cesena", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132ca58c37da3f65:0xcdf609796001a167?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Ferrara", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477e4f8771971817:0xc809dab797080563?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Forlì", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132b57fb2cae34b7:0x8c85895ae84ff601?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Modena", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477fef48247edfc7:0xe80eb7e8fd8ecc33?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Parma", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47806b59d42edc09:0xf80586ca8cd9b992?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Piacenza", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4780e72527c7fc87:0x4f1abfaf06e47d80?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Ravenna", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477dfbe8ffcd4281:0x643da95362d1224c?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Reggio Emilia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47801d5c9b9f69d1:0x7cd02ab97f2502c1?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Rimini", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132cc33b1fe3e71f:0x9b4f2f839d7b0ebd?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Pordenone", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477965a0d0a88d05:0x48bd2d4e9b752dcb?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Anzio", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x1325a3b1a9c26889:0x2d588ca1c789d9f6?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Capena", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f6da4eaa9e74d:0x20cd539b9796b4f3?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cassino", "url": "https://maps.google.com/maps?hl=it&gl=it&um=1&ie=UTF-8&fb=1&sa=X&ftid=0x133abd2f5b8733e5:0x9d55bbc4f5435aa7"},
  {"name": "Ciampino", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x13258893459d96cd:0xc74a2b83a0d197c8?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Civitavecchia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x1328a4aa01aeaaab:0xa0fe0c21c6634f95?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Frosinone", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x13255a85eae87a67:0x7c563e93f441e987?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Latina", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x13250c8118e5b6c5:0xccf8bdaee735dcb3?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Ostia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x1325f02014e57f4b:0xb2a3b4e141283357?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Pomezia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x1325924c159d31d1:0x6dcf31271f05242e?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Balduina", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f60830ff22aff:0x104d535ea7c4dd79?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Casilina", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f625ccb42dbab:0xf60ed9de5b54e330?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Marconi", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x13258a9b2432182d:0xfb59f0b903b66d30?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Prati Fiscali", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f614d52c8ecbd:0x6daff65a92fe0cf7?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Tiburtina", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f617c041d2563:0x7556a6fed745d4bf?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Torre Angela", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f62d31bb69cdf:0xfc4548f3cb2fa23e?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Tuscolana", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132f627521cd057f:0x851eaf3f99726370?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Valmontone", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x13257d608345f1bb:0xdd6ef750a3115bc3?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Genova", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x12d341d08ca3b8b7:0xde91d0dce940bbd9?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Abbiategrasso", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786e552ca2526d7:0x14214b6f8e48ec52?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Bergamo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4781519f7e811607:0x35041f9d07a9b850?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Brescia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x478177ce0c2ce863:0x9340ee2b56d00b36?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Busto Arsizio", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47868d78db5d567b:0x61018b8dbd40935e?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cantù", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47869961c09e6bed:0xc1c405b3958e2007?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cinisello Balsamo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786b9dd7dc0bc7b:0x583e788e9b88d8c8?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cologno Monzese", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786b942c2b6ab59:0xbdffb1eb1d7e2a56?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Como", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47869d530fc3885f:0xad40b3f10fcbd2f8?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Cremona", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4780ffab25f28cc3:0xf2075be606ef49c3?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Desenzano del Garda", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x478195a7b7f041c5:0xf21648b8bed9127?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Lodi", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47812d69101cec0b:0x47208aac0bccb78f?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Mantova", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4781d53184a84a07:0xc55ea4a4158c13d?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Melzo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786cbaaf007024d:0x4db8835d4abf0853?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Milano", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786c6dc4b2d0a03:0xbcd2f0dfc84eb2cc?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Milano Castelli", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786cbaaf007024d:0x4db8835d4abf0853?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Milano Lomellina", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786c7182278b62d:0xf0f40b4a9a28b68c?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Milano Parenzo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786c3e3c3cdcdbb:0xd56426aef9919e60?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Monza", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786b92d01e980f1:0xae558648533c1f4d?sa=X&ved=1t:8290&hl=it&gl=it&ictx=111"},
  {"name": "Pioltello", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786c9aff159384f:0x5233949d09744d32?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Rho", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786ebb7fe630305:0x49fa301029f330f3?sa=X&ved=1t:8290&ictx=111"},
  {"name": "San Giuliano Milanese", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786cf8698980dff:0xe976491de729667d?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Seregno", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786bd70f8630457:0xa56fc6a5b36a2b?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Settimo Milanese", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786ebdb0a68d4e9:0xffdc75e5a6112dc0?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Varese", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x478681bb37edc75d:0xdef320d5f9ad2744?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Vigevano", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786fdd54a431b35:0xde7a0fe251e23568?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Biella", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4786218fc8603d71:0xef4d7aa062198a40?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Settimo Torinese", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x478871bd8511a743:0x66e382298cb16861?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Torino Botticelli", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47886db415f4263f:0xd4b9f9597b95fad7?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Torino Chironi", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47886d284299c317:0x5d1380638610925e?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Bari", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x1347e85ff9f9dd81:0xf5bf609bbed3e94e?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Cagliari", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x12e733c94b494041:0x2d093c2cb64c50b1?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Sassari", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x12dc639c6e599bd5:0x4215ed374528eb77?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Arezzo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132bed4cae327b2b:0x2f27e7b59ebcc80f?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Firenze", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132a579ea98c9f31:0x4471fd9d90796303?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Lucca", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x12d58327ea23003b:0x3b7c7e6e2d7f1086?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Prato", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132af72ff1a6570d:0xc567522ae8f9221b?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Perugia", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132ea1851883d73f:0xb8d29c2e8a107c34?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Terni", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x132efd9618803e5d:0x4e515de8a6eb36c1?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Mestre", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477eb5df52302c3f:0xcea486cc41a3f4b6?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Padova", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477edba04c406e79:0xcf2dca86802e7bef?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Rovigo", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477efb96ec40e611:0xe2ba539bb9dea5db?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Treviso", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477949b5502e0b1d:0xc046dce941327e7b?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Verona", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x4781e1fa7d071621:0xbfd07a971ea19354?sa=X&ved=1t:8290&ictx=111"},
  {"name": "Vicenza", "url": "https://www.google.com/maps/place//data=!4m2!3m1!1s0x477f31dc9815fdb3:0x3d2f1e71a6088ecb?sa=X&ved=1t:8290&ictx=111"}
];

function getLocationUrl(locationName) {
    const location = locations.find(loc => (loc.name.toLowerCase() === locationName.toLowerCase()) || locationName.toLowerCase().includes(loc.name.toLowerCase()));
    return location ? location.url : null;
}
const trigger = (lead, orientatore, flowId) => {
  const url = 'https://chat.leadsystem.app/api/users';

const data = {
  phone: lead?.numeroTelefono,
  email: lead?.email,
  first_name: lead?.nome,
  last_name: lead?.nome,
  full_name: lead?.nome,
  //gender: "male",
  actions: [
    {
      action: "add_tag",
      tag_name: "Da contattare"
    },
    {
      action: "set_field_value",
      field_name: "City",
      value: lead?.città,
    },
    {
      action: "set_field_value",
      field_name: "Numero_Operatore",
      value: orientatore?.telefono,
    },
    {
      action: "set_field_value",
      field_name: "Operatore",
      value: orientatore?.nome,
    },
    {
      action: "set_field_value",
      field_name: "Trattamento",
      value: lead?.trattamento,
    },
    {
      action: "set_field_value",
      field_name: "Esito",
      value: lead?.esito,
    },
    lead?.appDate && {
      action: "set_field_value",
      field_name: "Appuntamento_Orientatore",
      value: lead?.appDate,
    },
    lead?.luogo && {
      action: "set_field_value",
      field_name: "sede",
      value: lead?.luogo,
    },
    lead?.luogo && {
      action: "set_field_value",
      field_name: "link_sede",
      value: getLocationUrl(lead?.luogo),
    }
  ]
}

const headers = {
  'Content-Type': 'application/json',
  'X-ACCESS-TOKEN': '1832534.RwcFj0R5OfNOH4SQ0U0cHLhcUHoj0lfIIEygahubrjukN4p8'
};

axios.post(url, data, { headers })
  .then(response => {
    console.log('Response:', response.data);
    if (response.data.success){
      const id = response.data.data.id;
      axios.post(url+`/${id}/send/${flowId}`, null, {headers}).then((res) => {
        console.log(res)
      })
      .catch(error => console.log(error))
    } else {
      console.log("Nientee")
    }
  })
  .catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
  });
}

router.post('/webhook-elevenlabs', async (req, res) => {
  try {
    console.log(req.body);
    const { Citta, Data_e_Orario, Centro_Scelto, Numero_Telefono } = req.body;
    console.log('Dati ricevuti da ElevenLabs:', { Citta, Data_e_Orario, Centro_Scelto, Numero_Telefono });

    // Trova il lead più recente con l'utente specificato e numero di telefono
    const lead = await Lead.findOne({
      utente: "664c5b2f3055d6de1fcaa22b",
      $or: [
        { numeroTelefono: Numero_Telefono },
        { numeroTelefono: `+39${Numero_Telefono}` }
      ]
    }); // Ordina per data decrescente per ottenere il più recente

    if (lead) {
      console.log('Lead trovato:', lead);
      if (Data_e_Orario && Data_e_Orario !== "" && Centro_Scelto && Centro_Scelto !== "") {
        lead.appFissato = Data_e_Orario;
        lead.luogo = Centro_Scelto;
        lead.tipo = "Nuovo paziente";
        lead.trattPrenotato = "Impianti";
        lead.esito = "Da richiamare";
        lead.appVoiceBot = true;
        await lead.save();
        /*await trigger({
          nome: lead.nome,
          email: lead.email,
          numeroTelefono: lead.numeroTelefono,
          città: lead.città,
          trattamento: "Impianti",
          esito: "Fissato",
          appDate: Data_e_Orario,
          luogo: Centro_Scelto,
        }, {
          nome: "Lorenzo",
          telefono: "3514871035",
        }, "1736760347221")*/
      } else {
        console.log('Lead non ha appuntamento o centro scelto');
      }
    } else {
      console.log('Nessun lead trovato con i criteri specificati.');
    }

    res.status(200).json({ message: 'Dati ricevuti con successo' });
  } catch (error) {
    console.error('Errore nel ricevere i dati da ElevenLabs:', error);
    res.status(500).json({ message: 'Errore nel ricevere i dati' });
  }
});

router.post('/webhook-n8n-bludental', async (req, res) => {
  try {
    console.log(req.body);
    const { punteggio_qualifica, centro_scelto, user_phone, status, success } = req.body;
    console.log('Dati ricevuti da ElevenLabs:', { punteggio_qualifica, centro_scelto, user_phone, status, success });

    const user = await User.findById("65d3110eccfb1c0ce51f7492");

    const lead = await Lead.findOne({
      utente: "65d3110eccfb1c0ce51f7492",
      $or: [
        { numeroTelefono: user_phone },
        { numeroTelefono: `+39${user_phone}` }
      ]
    }); // Ordina per data decrescente per ottenere il più recente

    if (lead) {
      console.log('Lead trovato:', lead.numeroTelefono);
      if (punteggio_qualifica && punteggio_qualifica !== "") {
        lead.luogo = centro_scelto;
        lead.summary = "";
        lead.punteggio = punteggio_qualifica;
        lead.esito = "Lead qualificata";
        if (success && success == "SEGRETERIA") {
          lead.status = "segreteria";
        } else {
          lead.status = status;
        }
        lead.appVoiceBot = true;
        await lead.save();
        user.dailyLead += 1;
        user.save();

        if (lead.idNexus) {

          const leadPayload = {
            id: lead.idNexus,
            punteggio: punteggio_qualifica,
            //riassunto_chiamata: lead.summary || "",
            //data_appuntamento: lead.appFissato,
            numero_tentativi: lead.recallAgent.recallType
          };

          await saveLead(leadPayload);
        }
      } else {
        console.log('Lead non ha punteggio qualificata', user_phone);
        lead.appVoiceBot = true;        
      }
    } else {
      console.log('Nessun lead trovato con i criteri specificati.');
    }

    res.status(200).json({ message: 'Dati ricevuti con successo' });
  } catch (error) {
    console.error('Errore nel ricevere i dati da ElevenLabs:', error);
    res.status(500).json({ message: 'Errore nel ricevere i dati' });
  }
});

router.post('/webhook-elevenlabs-sql', async (req, res) => {
  try {
    console.log(req.body);
    const { Punteggio, Conversation_Summary, Centro_Scelto, Numero_Telefono } = req.body;
    console.log('Dati ricevuti da ElevenLabs:', { Punteggio, Conversation_Summary, Centro_Scelto, Numero_Telefono });

    const user = await User.findById("65d3110eccfb1c0ce51f7492");

    const lead = await Lead.findOne({
      utente: "65d3110eccfb1c0ce51f7492",
      $or: [
        { numeroTelefono: Numero_Telefono },
        { numeroTelefono: `+39${Numero_Telefono}` }
      ]
    }); // Ordina per data decrescente per ottenere il più recente

    if (lead) {
      console.log('Lead trovato:', lead);
      if (Punteggio && Punteggio !== "" && Conversation_Summary && Conversation_Summary !== "") {
        lead.luogo = Centro_Scelto;
        lead.summary = Conversation_Summary;
        lead.punteggio = Punteggio;
        lead.esito = "Lead qualificata";
        lead.appVoiceBot = true;
        await lead.save();
        user.dailyLead += 1;
        user.save();

        /*await trigger({
          nome: lead.nome,
          email: lead.email,

          numeroTelefono: lead.numeroTelefono,
          città: lead.città,
          trattamento: "Impianti",
          esito: "Fissato",
          appDate: Data_e_Orario,
          luogo: Centro_Scelto,
        }, {
          nome: "Lorenzo",
          telefono: "3514871035",
        }, "1736760347221")*/
      } else {
        console.log('Lead non ha appuntamento o centro scelto');
      }
    } else {
      console.log('Nessun lead trovato con i criteri specificati.');
    }

    res.status(200).json({ message: 'Dati ricevuti con successo' });
  } catch (error) {
    console.error('Errore nel ricevere i dati da ElevenLabs:', error);
    res.status(500).json({ message: 'Errore nel ricevere i dati' });
  }
});

async function makeOutboundCall(number, city, name, type) {
  const url = 'https://primary-production-403a.up.railway.app/webhook/bludental-attivazione';
  number = number.replace(/\s+/g, '');
  const lead = await Lead.findOne({ numeroTelefono: number });
  // Controlla e aggiusta il prefisso
  if (!number.startsWith('+39')) {
    if (number.startsWith('39') && number.length === 12) {
      number = '+' + number;
    } else if (number.length === 10) {
      number = '+39' + number;
    }
  }

  const data = {
    user_phone: number,
    user_city: city,
    user_name: name,
    type: type || null,
    user_id: lead?._id,
  };

  try {
    const response = await axios.post(url, data);
    console.log('Risposta dal server:', response.data);
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
}

function generatePhoneVariants(phoneNumber) {
  let variants = [];

  // Rimuove eventuali spazi o trattini
  phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');

  const isItalianNumber = (number) => {
    if (number.startsWith('+39')) {
      return true;
    } else if (number.startsWith('39') && number.length == 12) {
      return true;
    }
    return false;
  };

  if (isItalianNumber(phoneNumber)) {
    // Numero normale
    variants.push(phoneNumber.slice(phoneNumber.startsWith('+39') ? 3 : 2));
    
    // Aggiunge variante con 39 davanti
    variants.push(phoneNumber.startsWith('+39') ? '39' + phoneNumber.slice(3) : phoneNumber);
    
    // Aggiunge variante con +39 davanti
    variants.push(phoneNumber.startsWith('+39') ? phoneNumber : '+39' + phoneNumber);
  } else {
    variants.push(phoneNumber);

    // Aggiunge variante con 39 davanti
    variants.push('39' + phoneNumber);

    // Aggiunge variante con +39 davanti
    variants.push('+39' + phoneNumber);
  }

  // Filtra eventuali duplicati
  variants = [...new Set(variants)];

  return variants;
}
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  
  // Rimuove eventuali spazi
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  
  // Verifica i diversi formati possibili:
  // 1. +39 seguito da 10 cifre
  // 2. + seguito da 10 cifre
  // 3. 39 seguito da 10 cifre
  // 4. 10 cifre semplici
  const patterns = [
      /^\+39\d{10}$/,  // +39 seguito da 10 cifre
      /^\+\d{10}$/,    // + seguito da 10 cifre
      /^39\d{10}$/,    // 39 seguito da 10 cifre
      /^\d{10}$/       // 10 cifre semplici
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
}

function day10ago(dataV) {
  const datanuova = new Date(dataV);
  const data = moment(datanuova, 'ddd MMM DD YYYY HH:mm:ss');
  const dieciGiorniFa = moment().subtract(10, 'days');
  return data.isBefore(dieciGiorniFa);
}
router.post('/webhook-tiktok', async (req, res) => {
    console.log(req.body);
    try {
      const {
        id,
        nome,
        cognome,
        email,
        telefono,
        citta,
        trattamento,
      } = req.body;
  
      let città = citta;
  
      let lastUserReceivedLead = null;
      const lastUserLeadData = await LastLeadUser.findOne({});
      if (lastUserLeadData) {
        lastUserReceivedLead = lastUserLeadData.userId;
      }
  
      const excludedOrientatoreIds = ['660fc6b59408391f561edc1a'];
      let users = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }, utente: "65d3110eccfb1c0ce51f7492"});
  
      const lastUserId = lastUserReceivedLead;
  
      const lastIndex = users.findIndex(user => user?._id.toString() === lastUserId);
  
      let nextUserIndex = lastIndex + 1;
      if (lastIndex === -1 || nextUserIndex >= users.length) {
          nextUserIndex = 0;
      }
  
      const nextUser = users[nextUserIndex];
  
      const randomIndex = Math.floor(Math.random() * users.length);
      const randomUser = users[randomIndex];
  
      let phoneVariants = generatePhoneVariants(telefono);
    
      let conditions = [
        { numeroTelefono: { $in: phoneVariants } },
        { email: email }
      ];
  
        const userId ='65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
          let user = await User.findById(userId);
          const newLead = new Lead({
            data: new Date(),
            dataTimestamp: new Date(),
            nome: nome + " " + cognome,
            email: email || '',
            numeroTelefono: telefono || '',
            campagna: 'IRON',
            esito: 'Da contattare',
            città: città || '',
            trattamento: trattamento || 'Implantologia per singolo dente',
            orientatori: nextUser ? nextUser._id : randomUser._id,
            utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
            note: "",
            fatturato: "",
            utmContent: "TikTok",
            utmAdset: "TikTok",
            utmCampaign: 'IRON',
            tentativiChiamata: '0',
            giàSpostato: false,
            summary: "",
            last_interaction: new Date().toISOString(),
          });
          try {
  
            const mostRecentLead = await Lead.find(
              { $or: conditions },
            );
            mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
            const existingLead = mostRecentLead[0];
  
            if (!existingLead || (existingLead && day10ago(existingLead.data))) {
              if (!isValidPhoneNumber(telefono)){
                console.log("Numero non valido")
                return
              }
              await newLead.save();
              console.log(`Assegnato il lead ${newLead.nome} all'utente Dentista`);
              await makeOutboundCall(newLead.numeroTelefono, newLead.città, newLead.nome, 'bludental');
              await user.save();
            }
  
          } catch (error) {
            console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
      }
  
      res.status(200).json({ message: 'Lead salvato con successo' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error, message: 'Errore' });
    }
});

//makeOutboundCall("+393473815084", "arezzo", "Giuseppe Gio Botindari", "bludental", "Agente: Si Pronto?, ehm parlo con Giuseppe Gio Botindari? Utente: Da che telefono chiamate però? Non si sente niente. Agente: Mi scusi, signor Botindari, sembra che ci siano problemi di linea. Sto chiamando da Bludental, e la stavo contattando riguardo alla sua richiesta di informazioni sui trattamenti odontoiatrici. Mi sente meglio adesso? Utente: Sì, quello l'ho capito, ditemi. Agente: Perfetto! Visto che la linea è un po' disturbata, cercherò di essere breve. Ehm... allora, per quanto riguarda i denti fissi completi che vorrebbe mettere, ha in mente un budget massimo di spesa? Utente: Non ho idea. Agente: Capisco. Ehm... Vediamo... Da quanto tempo sta valutando di fare questo tipo di intervento? Utente: Non ho idea dei costi. Agente: Certo, capisco perfettamente. Non sono in grado di fornirle una stima precisa dei costi in questa sede, ma posso metterla in contatto con il centro Bludental più vicino a lei. Lì potranno valutare la sua situazione specifica e fornirle tutte le informazioni necessarie. Ehm... Vediamo... Le farebbe piacere fissare una visita gratuita? Utente: Che sarebbe? Agente: Lei si trova ad Arezzo, giusto? Utente: Addio patria! Agente: Ehm... Vediamo... Conferma che si trova ad Arezzo? In questo caso, il centro Bludental più vicino si trova proprio lì, in Via Leone Leoni, numero quattro. Utente: Non t'ho più sentito. Agente: Mi scusi, signor Botindari, la linea è un po' instabile. Conferma che si trova ad Arezzo? In questo modo posso metterla in contatto con il centro Bludental più vicino per una visita gratuita.\\n Utente: Da chi ami? Dall'India? Agente: Mi scusi, non capisco bene la domanda. Potrebbe riformularla? Vorrebbe sapere se il centro Bludental è in India? Oppure... Ehm... vediamo... forse intendeva... Utente: Oh God, no Emilia! Agente: Mi scusi, non riesco a capire cosa intende. Ha problemi di linea? Utente: Ma che Emilia? Agente: Mi scusi, signor Botindari, non capisco a cosa si riferisce. Forse c'è un problema di linea e non riesco a sentire bene. Posso richiamarla tra qualche minuto? Utente: Ho detto da dove chiami, dall'India?! Agente: No, signor Botindari, non chiamo dall'India. Chiamo dall'Italia, sono Andrea, assistente virtuale di Bludental. Stavo cercando di capire se lei si trova ancora ad Arezzo per metterla in contatto con il centro più vicino. Conferma? Utente: Sì, ma mi riferisco alla linea. Agente: Ah, capisco! Purtroppo non ho informazioni precise sulla provenienza della linea telefonica. Però, se mi conferma la sua posizione, posso metterla in contatto con il centro Bludental più vicino, e magari loro possono fornirle maggiori dettagli sui trattamenti. Si trova ancora ad Arezzo?\\n Utente: Benissimo! Arezzo, ho detto Arezzo. Agente: Perfetto! Allora, ad Arezzo abbiamo un centro in Via Leone Leoni, quattro. Le è comodo come zona?\\n Utente: Sì benissimo se mi mandate un messaggio con l'indirizzo o un numero di contatto li contatto io. Agente: Certo, posso farle contattare direttamente dalla collega del centro di Arezzo per fissare un appuntamento. Posso usare questo numero di telefono per metterla in contatto con loro?\\n Utente: Benissimo! Agente: Perfetto! Allora, ricapitolando, lei è interessato a un appuntamento nel centro di Arezzo, corretto?\\n Utente: ... Agente: Signor Botindari, è ancora in linea?")

router.post('/webhook-elevenlabs-errore-chiamata', async (req, res) => {
  try {
    console.log(req.body);
    const { Numero_Telefono, Motivo_Errore, Transcript } = req.body;
    console.log('Dati ricevuti da ElevenLabs:', { Numero_Telefono, Motivo_Errore, Transcript });

    // Trova il lead più recente con l'utente specificato e numero di telefono
    const lead = await Lead.findOne({
      utente: "664c5b2f3055d6de1fcaa22b",
      $or: [
        { numeroTelefono: Numero_Telefono },
        { numeroTelefono: `+39${Numero_Telefono}` }
      ]
    }); // Ordina per data decrescente per ottenere il più recente

    if (lead) {
      console.log('Lead trovato');
      lead.recallAgent.recallType += 1;
      lead.recallAgent.recallInfo.push({
        recallDate: new Date(),
        recallReason: Motivo_Errore || "Errore chiamata",
        transcript: Transcript,
      });
      await lead.save();
      /*if (Motivo_Errore === "Errore Chiamata" && lead.recallAgent.recallType < 6){
        makeOutboundCall(lead.numeroTelefono, lead.città, lead.nome, '', Transcript);
      }*/
    } else {
      console.log('Nessun lead trovato con i criteri specificati.');
    }

    res.status(200).json({ message: 'Dati ricevuti con successo' });
  } catch (error) {
    console.error('Errore nel ricevere i dati da ElevenLabs:', error);
    res.status(500).json({ message: 'Errore nel ricevere i dati' });
  }
});

router.post('/webhook-elevenlabs-sql-errore-chiamata', async (req, res) => {
  try {
    console.log(req.body);
    const { Numero_Telefono, Motivo_Errore, Transcript } = req.body;
    console.log('Dati ricevuti da ElevenLabs:', { Numero_Telefono, Motivo_Errore, Transcript });

    const user = await User.findById("65d3110eccfb1c0ce51f7492");

    const lead = await Lead.findOne({
      utente: "65d3110eccfb1c0ce51f7492",
      $or: [
        { numeroTelefono: Numero_Telefono },
        { numeroTelefono: `+39${Numero_Telefono}` }
      ]
    }); // Ordina per data decrescente per ottenere il più recente

    if (lead) {
      console.log('Lead trovato:', lead);
      lead.recallAgent.recallType += 1;
      lead.recallAgent.recallInfo.push({
        recallDate: new Date(),
        recallReason: Motivo_Errore || "Errore chiamata",
        transcript: Transcript,
      });
      await lead.save();
      /*if (Motivo_Errore === "Errore Chiamata" && lead.recallAgent.recallType < 6){
        makeOutboundCall(lead.numeroTelefono, lead.città, lead.nome, 'bludental', Transcript);
      }*/
    } else {
      console.log('Nessun lead trovato con i criteri specificati.');
    }

    res.status(200).json({ message: 'Dati ricevuti con successo' });
  } catch (error) {
    console.error('Errore nel ricevere i dati da ElevenLabs:', error);
    res.status(500).json({ message: 'Errore nel ricevere i dati' });
  }
});

module.exports = router;