const express = require('express');
const {dailyCap} = require('../controllers/subs');
const User = require('../models/user');

const router = express.Router();

const {getLeadsFb, getLeadsManual, getAllLead, calculateFatturatoByUtente, calculateFatturatoByOrientatore, calculateFatturatoByOrientatoreUser, getLeadsManualWhatsapp, updateLeadRecall, getLeadsManualBase, getOtherLeads, getOrientatoreLeads, getOtherLeadsOri} = require('../controllers/leads');
const { createOrientatore, deleteOrientatore, createLead, deleteLead, updateLead, getOrientatori, getLeadDeleted, updateOrientatore, deleteRecall } = require('../controllers/orientatore');
const { getAllLeadForCounter, LeadForMarketing } = require('../controllers/superAdmin');
const { getDataCap } = require('../controllers/comparadentista');

router.post("/get-leads-fb", getLeadsFb);
router.post("/get-leads-manual", getLeadsManual);
router.post("/get-leads-manual-base", getLeadsManualBase);
router.post("/get-orientatore-lead-base", getOrientatoreLeads);
router.post("/get-other-leads", getOtherLeads);
router.post("/get-other-leads-ori", getOtherLeadsOri);
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

module.exports = router;