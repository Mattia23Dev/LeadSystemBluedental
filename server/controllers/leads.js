const User = require('../models/user');
const LeadFacebook = require('../models/leadFacebook');
const Orientatore = require('../models/orientatori');
const Lead = require('../models/lead');

  exports.getLeadsFb = async (req, res) => {
    try {
      const userId = req.body._id;
      const leads = await LeadFacebook.find({ utente: userId });
      res.json(leads);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: "Errore nel recupero dei lead" });
    }
  };

  exports.getLeadsManual = async (req, res) => {
    try {
      const userId = req.body._id;
  
      // Cerca tutti i lead che hanno l'ID dell'utente nel campo "utente"
      const leads = await Lead.find({ utente: userId }).populate('orientatori');
  
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };

  exports.getLeadsManualBase = async (req, res) => {
    try {
      const userId = req.body._id;
  
      // Cerca tutti i lead che hanno l'ID dell'utente nel campo "utente" e non hanno esito "Non valido" o "Non interessato"
      const leads = await Lead.find({ 
        utente: userId,
        $and: [
          { esito: { $ne: "Non valido" } }, 
          { esito: { $ne: "Non interessato" } }
        ]
      }).populate('orientatori');
  
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };

  exports.getOrientatoreLeads = async (req, res) => {
    try {
      const userId = req.body._id;
  
      const leads = await Lead.find({ 
        orientatori: userId,
        $and: [
          { esito: { $ne: "Non valido" } }, 
          { esito: { $ne: "Non interessato" } }
        ]
      }).populate('orientatori');
  
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };

  exports.getOtherLeads = async (req, res) => {
    try {
      const userId = req.body._id;
  
      const otherLeads = await Lead.find({ 
        utente: userId,
        $or: [
          { esito: "Non valido" },
          { esito: "Non interessato" }
        ]
      }).populate('orientatori');
  
      res.json(otherLeads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero delle lead' });
    }
  };

  exports.getOtherLeadsOri = async (req, res) => {
    try {
      const userId = req.body._id;
  
      const otherLeads = await Lead.find({ 
        orientatori: userId,
        $or: [
          { esito: "Non valido" },
          { esito: "Non interessato" }
        ]
      }).populate('orientatori');
  
      res.json(otherLeads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero delle lead' });
    }
  };

  exports.getLeadsManualWhatsapp = async (req, res) => {
    try {
      const userId = req.body._id;
  
      // Cerca tutti i lead che hanno l'ID dell'utente nel campo "utente"
      const leads = await Lead.find({ utente: userId, campagna:'Whatsapp' }).populate('orientatori');
  
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };
  exports.getAllLead = async (req, res) => {
    try {
      //const leads = await Lead.find().populate('orientatori').populate('utente');
      const leads = await Lead.find()
    
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };

  exports.calculateFatturatoByUtente = async (req, res) => {
    try {
      // Recupera tutti gli utenti
      const users = await User.find({});
    
      const fatturatoByUtente = [];
    
      // Per ogni utente, filtra i lead corrispondenti e calcola la somma del fatturato
      for (const user of users) {
        const leads = await Lead.find({ utente: user._id, esito: 'Venduto' });
    
        const sommaFatturato = leads.reduce((sum, lead) => sum + parseInt(lead.fatturato), 0);
    
        const utenteData = {
          utente: user,
          sommaFatturato: sommaFatturato,
        };
    
        fatturatoByUtente.push(utenteData);
      }
    
      res.json(fatturatoByUtente);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel calcolo del fatturato per utente' });
    }
  };

  exports.calculateFatturatoByOrientatore = async (req, res) => {
    try {
      const orientatori = await Lead.distinct('orientatori');
    
      const fatturatoByOrientatore = [];
    
      for (const orientatoreId of orientatori) {
        if (!orientatoreId) {
          continue; 
        }
        const leads = await Lead.find({ orientatori: orientatoreId, esito: 'Venduto' });
    
        const sommaFatturato = leads.reduce((sum, lead) => sum + parseInt(lead.fatturato), 0);
    
        const orientatore = await Orientatore.findById(orientatoreId);
    
        const orientatoreData = {
          orientatore: orientatore,
          sommaFatturato: sommaFatturato,
        };
    
        fatturatoByOrientatore.push(orientatoreData);
      }
    
      res.json(fatturatoByOrientatore);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel calcolo del fatturato per orientatore' });
    }
  };

  exports.calculateFatturatoByOrientatoreUser = async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Recupera tutti gli orientatori distinti presenti nei lead dell'utente
      const orientatori = await Lead.distinct('orientatori', { utente: userId });
  
      const fatturatoByOrientatore = [];
  
      // Per ogni orientatore, filtra i lead corrispondenti e calcola la somma del fatturato
      for (const orientatoreId of orientatori) {
        if (!orientatoreId) {
          continue;
        }
        const leads = await Lead.find({ orientatori: orientatoreId, esito: 'Venduto' });
  
        const sommaFatturato = leads.reduce((sum, lead) => sum + parseInt(lead.fatturato), 0);
  
        const orientatore = await Orientatore.findById(orientatoreId);
  
        const orientatoreData = {
          orientatore: orientatore,
          sommaFatturato: sommaFatturato,
        };
  
        fatturatoByOrientatore.push(orientatoreData);
      }
  
      res.json(fatturatoByOrientatore);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel calcolo del fatturato per orientatore' });
    }
  };

  exports.updateLeadRecall = async (req, res) => {
    try {
      const { leadId, recallDate, recallHours } = req.body;
  
      const lead = await Lead.findById(leadId);
  
      if (!lead) {
        return res.status(404).json({ error: 'Lead non trovata' });
      }
  
      lead.recallDate = recallDate;
      lead.recallHours = recallHours;
  
      await lead.save();
  
      // Restituisci l'oggetto della lead aggiornata
      res.json(lead.toObject());
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della lead:', error.message);
      res.status(500).json({ error: 'Errore durante l\'aggiornamento della lead' });
    }
  };