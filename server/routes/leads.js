const express = require('express');
const {dailyCap} = require('../controllers/subs');
const User = require('../models/user');

const router = express.Router();

const {getLeadsFb, getLeadsManual, getAllLead, calculateFatturatoByUtente, calculateFatturatoByOrientatore, calculateFatturatoByOrientatoreUser, getLeadsManualWhatsapp, updateLeadRecall, getLeadsManualBase, getOtherLeads, getOrientatoreLeads, getOtherLeadsOri, getLeadById} = require('../controllers/leads');
const { createOrientatore, deleteOrientatore, createLead, deleteLead, updateLead, getOrientatori, getLeadDeleted, updateOrientatore, deleteRecall, updateAssegnazioneOrientatore } = require('../controllers/orientatore');
const { getAllLeadForCounter, LeadForMarketing } = require('../controllers/superAdmin');
const { getDataCap } = require('../controllers/comparadentista');
const Orientatore = require('../models/orientatori');
const Lead = require('../models/lead');

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

module.exports = router;