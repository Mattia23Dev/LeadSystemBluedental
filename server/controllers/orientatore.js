const Orientatore = require('../models/orientatori');
const Lead = require('../models/lead');
const User = require('../models/user');
const LeadDeleted = require("../models/leadDeleted");
const {hashPassword, comparePassword} = require('../helpers/auth');
const nodemailer = require('nodemailer');

exports.createOrientatore = async (req, res) => {
    try {
      const { nome, cognome, email, telefono } = req.body;
  
      const userId = req.body.utente;
      if (!userId) {
        return res.status(400).json({ error: 'ID utente non fornito' });
      }
      const hashedPassword = await hashPassword('12345678');
      const orientatore = new Orientatore({
        nome,
        cognome,
        email,
        telefono,
        utente: userId,
        password: hashedPassword,
        role: 'orientatore',
        new: true,
      });
  
      const nuovoOrientatore = await orientatore.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_GMAIL,
          pass: process.env.PASS_GMAIL,
        }
      });

      const url = "https://bluedental-leadsystem.netlify.app/login"
  
      const mailOptions = {
        from: process.env.EMAIL_GMAIL,
        to: email,
        subject: 'Benvenuto nel LeadSystem!',
        html: `
          <html>
            <body>
              <p>Gentile ${nome},</p>
              <p>Ti diamo il benvenuto come nel tuo LeadSystem di Bluedental! Di seguito trovi le tue informazioni di accesso:</p>
              <p>Email: ${email}</p>
              <p>Password: 12345678</p>
              <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #3471CC; color: #fff; text-decoration: none; border-radius: 5px;">Cambia password</a>
              <p>Ti consigliamo di cambiare la tua password temporanea appena possibile. Grazie e buon lavoro!</p>
            </body>
          </html>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Errore nell\'invio dell\'email:', error);
        } else {
          console.log('Email inviata con successo:', info.response);
        }
      });
  
      res.status(201).json(nuovoOrientatore);
    } catch (err) {
      res.status(500).json({ error: err.message });
      console.log(err.message);
    }
  };

  exports.deleteOrientatore = async (req, res) => {
    //console.log(req.body.id);
    try {
      const orientatoreId = req.body.id;
      const orientatore = await Orientatore.findById(orientatoreId);
      if (!orientatore) {
        return res.status(404).json({ error: 'Orientatore non trovato' });
      }
  
      await Orientatore.findByIdAndDelete(orientatoreId);
  
      res.status(200).json({ message: 'Orientatore eliminato con successo' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
  
  exports.createLead = async (req, res) => {
    //console.log(req.body.from);
    try {

      const utenteId = req.params.id;
  
      const utente = await User.findById(utenteId);
      if (!utente) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const orientatoreId = req.body.orientatori;
      const orientatore = await Orientatore.findById(orientatoreId);
      //console.log(orientatore);
      if (req.body.from === 'superadmin') {
        utente.monthlyLeadCounter -= 1;
        const leadData = {
          data: req.body.data,
          nome: req.body.nome + ' ' + req.body.cognome,
          cognome: req.body.cognome,
          email: req.body.email,
          numeroTelefono: req.body.numeroTelefono,
          campagna: req.body.campagna,
          orientatori: orientatore === undefined ? null : orientatore,
          utente: utenteId,
          esito: req.body.esito,
          note: req.body.note,
          trattamento: req.body.trattamento,
          città: req.body.città,
          manualLead: true,
          utmCampaign: req.body.campagna,
        };
    
        const lead = new Lead(leadData);
        await lead.save();
        await utente.save();
    } else {
      const leadData = {
        data: req.body.data,
        nome: req.body.nome + ' ' + req.body.cognome,
        cognome: req.body.cognome,
        email: req.body.email,
        numeroTelefono: req.body.numeroTelefono,
        campagna: req.body.campagna,
        orientatori: orientatore === undefined ? null : orientatore,
        utente: utenteId,
        esito: req.body.esito,
        note: req.body.note,
        trattamento: req.body.trattamento,
        città: req.body.città,
        manualLead: true,
        utmCampaign: req.body.campagna
      };
  
      const lead = new Lead(leadData);
      await lead.save();
    }
  
      res.status(201).json({ message: 'Lead aggiunto con successo' });
    } catch (err) {
      res.status(500).json({ error: err.message });
      console.log(err.message);
    }
  };

  exports.deleteLead = async (req, res) => {
    try {
      // Get the lead ID from the request
      const leadId = req.body.id;
  
      // Find the lead by ID and check if it exists
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(400).json({ error: 'Lead not found' });
      }

      const userId = lead.utente;
  
      const leadDeleted = {
        data: lead.data,
        nome: lead.nome,
        cognome: lead.cognome,
        email: lead.email,
        numeroTelefono: lead.numeroTelefono,
        campagna: lead.campagna,
        corsoDiLaurea: lead.corsoDiLaurea,
        frequentiUni: lead.frequentiUni,
        lavoro: lead.lavoro,
        facolta: lead.facolta,
        oreStudio: lead.oreStudio,
        orientatori: lead.orientatori ? lead.orientatori : null,
        utente: lead.utente,
        esito: lead.esito,
        università: lead.università,
        provincia: lead.provincia,
        note: lead.note,
        fatturato: lead.fatturato
      };
  
      const leadDeletedSave = new LeadDeleted(leadDeleted);
  
      await leadDeletedSave.save();
  
      await Lead.findByIdAndDelete(leadId);

      const userLeads = await Lead.find({ utente: userId, _id: { $ne: leadId } });
  
      res.status(200).json({ message: 'Lead deleted successfully', userLeads });
    } catch (err) {
      res.status(500).json({ error: err.message });
      console.log(err.message);
    }
  };

  exports.getLeadDeleted = async (req, res) => {
    try {
      // Cerca tutti i lead nel database
      const leads = await LeadDeleted.find().populate('orientatori').populate('utente');
    
      res.json(leads);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Errore nel recupero dei lead' });
    }
  };


  exports.updateLead = async (req, res) => {
    try {

      const leadId = req.params.id;
      const userId = req.params.userId;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
  
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead non trovato' });
      }
  
      if (req.body.esito && req.body.esito !== lead.esito) {
        lead.dataCambiamentoEsito = new Date();
      }

      if ('orientatori' in req.body) {
        if (typeof req.body.orientatori === 'string' && req.body.orientatori.trim() === '') {
          req.body.orientatori = null;
        }
      }
  
      Object.assign(lead, req.body);
      lead.lastModify = new Date().toISOString();
      if (lead.esito === "Non risponde"){
        if (lead.giàSpostato === false && parseInt(req.body.tentativiChiamata) > 1 ){
          const orientatoriDisponibili = await Orientatore.find({ _id: { $ne: lead.orientatori } });
          if (orientatoriDisponibili.length > 0) {
            const orientatoreCasuale = orientatoriDisponibili[Math.floor(Math.random() * orientatoriDisponibili.length)];
            lead.orientatori = orientatoreCasuale._id;
            lead.giàSpostato = true;
          }        
        }
      }
      await lead.save();
      
      const updatedLead = await lead.populate('orientatori');
  
      res.status(200).json({ message: 'Lead modificato con successo', updatedLead: updatedLead  });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ error: err.message });
    }
  };

  exports.deleteRecall = async (req, res) => {
    try {
      const leadId = req.body.leadId;
  
      const lead = await Lead.findById(leadId);
      if (!lead) {
        console.log(`Il lead non è stato trovato`);
        return res.status(404).json({ error: 'Lead non trovato' });
      }

      lead.recallDate = null;
      lead.recallHours = null;

      await lead.save();
      
      res.status(200).json({message: "Recall eliminata"})
    } catch (error) {
      console.error(error);
      res.status(500).json({error: error.message, })
    }
  }

  exports.getOrientatori = async (req, res) => {
    try {
      console.log(req.params.id);
      const userId = req.params.id;
  
      // Cerca gli orientatori dell'utente per ID utente
      const orientatori = await Orientatore.find({ utente: userId });
  
      res.status(200).json({ orientatori });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  exports.updateOrientatore = async (req, res) => {
    try {
      const orientatoreId = req.params.id;
  
      const orientatore = await Orientatore.findById(orientatoreId);
      if (!orientatore) {
        return res.status(404).json({ error: 'Orientatore non trovato' });
      }

  
      Object.assign(orientatore, req.body);
      await orientatore.save();
  
      res.status(200).json({ message: 'Lead modificato con successo' });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ error: err.message });
    }
  };