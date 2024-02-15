const Lead = require('../models/lead');
const User = require('../models/user');
const LeadFacebook = require("../models/leadFacebook");
const LeadWordpress = require("../models/leadWordpress");

exports.modifyCounter = async (req, res) => {
  console.log(req.body);
    try {
      const { userId, counterValue } = req.body;
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(500).json({ success: false, message: 'Utente non trovato' });
      }
  
      user.monthlyLeadCounter = counterValue;
      await user.save();
  
      res.status(200).json({ success: true, message: 'Contatore modificato con successo' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

exports.updateUserStatus = async (req, res) => {
    try {
      const { userId, active } = req.body;
  
      const user = await User.findByIdAndUpdate(userId, { active }, { new: true });
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
  
      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato dell\'utente:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  exports.getAllLeadForCounter = async (req, res) => {
    try {
      const allLeads = await Lead.find();
      const allFacebookLeads = await LeadFacebook.find();
      const allWordpressLeads = await LeadWordpress.find();
  
      const leadsData = {
        leads: allLeads,
        facebookLeads: allFacebookLeads,
        wordpressLeads: allWordpressLeads,
      };
  
      res.status(200).json(leadsData);
    } catch (error) {
      console.error('Errore nel recupero dei lead:', error);
      res.status(500).json({ error: 'Si è verificato un errore nel recupero dei lead.' });
    }
  };

  exports.LeadForMarketing = async (req, res) => {
    try {
      const startDate = new Date('2023-09-26T00:00:00.000Z');
      const endDate = new Date('2023-10-17T23:59:59.999Z');
      const leadTrovati = await Lead.find();

      const filteredLeads = leadTrovati.filter((lead) => {
        const leadDate = new Date(lead.data);
        return leadDate >= startDate && leadDate <= endDate;
      });

      const leadConId = await Promise.all(
        leadTrovati.map(async (lead) => {
          const emailDaCercare = lead.email;
      
          const leadCampagna = {
            data: lead.data,
            nome: lead.nome,
            cognome: lead.cognome,
            email: lead.email,
            telefono: lead.numeroTelefono,
            esito: lead.esito,
            dataCambiamentoEsito: lead.dataCambiamentoEsito ? lead.dataCambiamentoEsito : 'Data non specificata',
            id: null,
            nomeCampagna: "Campagna non specificata",
          };
      
          if (lead.campagna === 'Social') {

            const leadTrovato = await LeadFacebook.findOne({
              'fieldData.name': 'email',
              'fieldData.values.0': emailDaCercare,
            });
      
            leadCampagna.nomeCampagna = lead.nameCampagna;
            if (leadTrovato) {
              leadCampagna.id = leadTrovato.id;
            }
          } else if (lead.campagna === 'Wordpress') {
            leadCampagna.nomeCampagna = lead.utmCampaign;
          }
      
          return leadCampagna;
        })
      );

      res.status(200).json({message: 'Ok', data: leadConId});
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };