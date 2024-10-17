const Lead = require('../models/lead');
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

  exports.getDataFromLanding = async (req, res) => { // Converte il corpo della richiesta in una stringa JSON
    const nome = req.body['Nome e cognome'];
    const email = req.body.Email;
    const numeroTelefono = req.body['Numero di telefono'];
    const utmCampaign = req.body.utm_campaign ? req.body.utm_campaign : '';
    const utmSource = req.body.utm_source ? req.body.utm_source : '';
    const utmMedium = req.body.utm_medium ? req.body.utm_medium : '';
    const utmTerm = req.body.utm_term ? req.body.utm_term : '';
    const trattamento = req.body['Tipo di trattamento'] ? req.body['Tipo di trattamento'] : '';
    const città = req.body['Città'] ? req.body['Città'] : '';
    const note = req.body['Note aggiuntive'] ? req.body['Note aggiuntive'] : ''
    try {
  
      console.log('webhook ricevuto', req.body);
      // Crea un nuovo oggetto LeadWordpress e mappa i campi
      const newLead = new Lead({
        data: new Date(),
        nome: nome,
        email: email,
        numeroTelefono: numeroTelefono,
        campagna: 'wordrpess',
        utmCampaign: utmCampaign,
        utmSource: utmSource,
        utmMedium: utmMedium,
        utmTerm: utmTerm,
        città: città ? città : '',
        trattamento: 'Impianti singolo dente',
        esito: "Da contattare",
        orientatori: null,
        utente: "65d3110eccfb1c0ce51f7492",
        note: note,
        fatturato: "",
        tentativiChiamata: '0',
        giàSpostato: false,
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
  
  
  
  
  
  
  