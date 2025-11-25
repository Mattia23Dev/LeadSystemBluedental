const Orientatore = require('../models/orientatori');
const Lead = require('../models/lead');
const User = require('../models/user');
const LeadDeleted = require("../models/leadDeleted");
const {hashPassword, comparePassword} = require('../helpers/auth');
const nodemailer = require('nodemailer');
const axios = require('axios');

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
          ...(req.body.punteggio !== undefined && { punteggio: req.body.punteggio }),
          ...(req.body.appVoiceBot !== undefined && { appVoiceBot: req.body.appVoiceBot }),
          ...(req.body.chiamato !== undefined && { chiamato: req.body.chiamato }),
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
        utmCampaign: req.body.campagna,
        ...(req.body.punteggio !== undefined && { punteggio: req.body.punteggio }),
        ...(req.body.appVoiceBot !== undefined && { appVoiceBot: req.body.appVoiceBot }),
        ...(req.body.chiamato !== undefined && { chiamato: req.body.chiamato }),
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

  // Funzione per annullare un run su Trigger.dev
  const cancelTriggerRun = async (runId) => {
    try {
      const triggerApiKey = process.env.TRIGGER_DEV_API_KEY || process.env.TRIGGER_API_KEY;
      if (!triggerApiKey) {
        console.error('TRIGGER_DEV_API_KEY non configurata');
        return false;
      }

      const response = await axios.post(
        `https://api.trigger.dev/v1/runs/${runId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${triggerApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`Run ${runId} annullato con successo`);
      return true;
    } catch (error) {
      console.error(`Errore nell'annullamento del run ${runId}:`, error.response?.data || error.message);
      return false;
    }
  };

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
      const appuntamentoFissato = lead.appFissato;
      if (req.body.esito && req.body.esito !== lead.esito) {
        lead.dataCambiamentoEsito = new Date();

        if (!lead.dataPrimaModifica) {
          lead.dataPrimaModifica = new Date();
        }
      }

      if ('orientatori' in req.body) {
        if (typeof req.body.orientatori === 'string' && req.body.orientatori.trim() === '') {
          req.body.orientatori = null;
        }
      }

      if (req.body.esito === "Fissato" && lead.esito !== "Fissato" && userId == "664c5b2f3055d6de1fcaa22b"){
        await trigger({
          nome: lead.nome,
          email: lead.email,
          numeroTelefono: lead.numeroTelefono,
          città: lead.città,
          trattamento: req.body.trattPrenotato,
          esito: req.body.esito,
          appDate: req.body.appFissato,
          luogo: req.body.luogo,
        }, {
          nome: "Lorenzo",
          telefono: "3514871035",
        }, "1736760347221")
      }
      if (req.body.esito === "Non risponde" && lead.esito !== "Non risponde" && userId == "664c5b2f3055d6de1fcaa22b"){
        await trigger({
          nome: lead.nome,
          email: lead.email,
          numeroTelefono: lead.numeroTelefono,
          città: lead.città,
          esito: "Non risponde",
        }, {
          nome: "Lorenzo",
          telefono: "3514871035",
        }, "1734106232317")
      }

      const mantenereAppFissato = lead.utente.toString() === "664c5b2f3055d6de1fcaa22b" && req.body.esito !== "Fissato" && lead.esito === "Fissato";
  
      // Verifica se l'esito sta cambiando a uno dei valori che richiedono la cancellazione dei recallIds
      const esitiDaCancellare = ["Venduto", "Lead persa", "Non interessato"];
      const esitoPrecedente = lead.esito;
      const nuovoEsito = req.body.esito;
      const deveCancellareRecallIds = nuovoEsito && 
                                       nuovoEsito !== esitoPrecedente && 
                                       esitiDaCancellare.includes(nuovoEsito) &&
                                       lead.recallIds && 
                                       lead.recallIds.length > 0;

      Object.assign(lead, req.body);

      if (mantenereAppFissato) {
        lead.appFissato = appuntamentoFissato;
      }
      
      lead.lastModify = new Date().toISOString();

      // Annulla tutti i recallIds se l'esito è cambiato a uno dei valori specificati
      if (deveCancellareRecallIds) {
        console.log(`Annullamento di ${lead.recallIds.length} recallIds per esito: ${nuovoEsito} per lead: ${lead.email} - ${lead.numeroTelefono}`);
        const recallIdsToCancel = [...lead.recallIds]; // Copia l'array per evitare modifiche durante l'iterazione
        
        for (const recallId of recallIdsToCancel) {
          if (recallId && recallId !== "") {
            await cancelTriggerRun(recallId);
          }
        }
        
        // Svuota l'array recallIds dopo averli cancellati
        lead.recallIds = [];
      }
      if (lead.utente.toString === "65d3110eccfb1c0ce51f7492"){
      if (lead.esito === "Non risponde"){
        if (lead.giàSpostato === false && parseInt(req.body.tentativiChiamata) > 1 ){
          const orientatoriDisponibili = await Orientatore.find({ _id: { $ne: lead.orientatori }, utente: "65d3110eccfb1c0ce51f7492" });
          if (orientatoriDisponibili.length > 0) {
            const orientatoreCasuale = orientatoriDisponibili[Math.floor(Math.random() * orientatoriDisponibili.length)];
            lead.orientatori = orientatoreCasuale._id;
            lead.giàSpostato = true;
          }        
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

  exports.updateAssegnazioneOrientatore = async (req, res) => {
    const { updatedFields, id } = req.body;
    try {
      const updatedOrientatore = await Orientatore.findByIdAndUpdate(
        id,
        { daAssegnare: updatedFields.daAssegnare },
        { new: true }
      );
  
      if (!updatedOrientatore) {
        return res.status(404).json({ message: 'Orientatore non trovato' });
      }
  
      res.json(updatedOrientatore);
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dell\'orientatore:', error);
      res.status(500).json({ message: 'Errore server durante l\'aggiornamento dell\'orientatore' });
    }
  };