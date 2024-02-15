const LeadWordpress = require('../models/leadWordpress');

exports.getDataFromWordpress = async (req, res) => { // Converte il corpo della richiesta in una stringa JSON
    console.log(req.body);
    const nome = req.body.yourName;
    const cognome = req.body.yourSurname;
    const email = req.body.email;
    const numeroTelefono = req.body.number;
    const università = req.body.universita ? req.body.universita : null;
    const corsoDiLaurea = req.body.percorsodistudio ? req.body.percorsodistudio : null;
    const facolta = req.body.settore ? req.body.settore : null;   
    const utmCampaign = req.body.utm_campaign ? req.body.utm_campaign : '';
    const utmSource = req.body.utm_source ? req.body.utm_source : '';
    const universita = req.body.universita ? req.body.universita == 'Si' ? true : false : false;
    const lavoro = req.body.lavoro ? req.body.lavoro == 'Si' ? true : false : false;
    const orario = req.body.orario ? req.body.orario : '';
    const provincia = req.body.Provincia ? req.body.Provincia : '';
    try {
  
      console.log('webhook ricevuto', req.body);
      // Crea un nuovo oggetto LeadWordpress e mappa i campi
      const newLead = new LeadWordpress({
        data: new Date(),
        nome: nome,
        cognome: cognome,
        email: email,
        numeroTelefono: numeroTelefono,
        corsoDiLaurea: corsoDiLaurea,
        facolta: facolta,
        università: università,
        campagna: 'wordrpess',
        utmCampaign: utmCampaign,
        utmSource: utmSource,
        orario: orario,
        lavoro: lavoro,
        universita: universita,
        provincia: provincia,
      });
  
      // Salva il nuovo lead nel database dopo un timeout di 5 secondi
          await newLead.save();
          console.log('Lead salvato:', newLead);
          res.status(200).json({ success: true });
    } catch (error) {
      console.error('Errore durante il salvataggio del lead:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
  
  
  
  
  
  