const Lead = require('../models/lead');
const User = require('../models/user');
const crypto = require('crypto-js');

'use strict';

const FACEBOOK_PAGE_ACCESS_TOKEN = 'EAAN2JZAnVsjYBAIqoTFS7IMLdTV1oNZABrR5W0PcTfFlx0eZACHrQ92637PvmFyvU8mnfWNaUSMpQRIGcZAy6UUVC2rLI4Lwujge81fvwQneK0TiJZBSiRnlAaJ3zEjWe8eItYrPkvkJ3jHcODPv5ncwkVga3RzzrswzHxDyO4jZAHUQ2ptwRF';
const FACEBOOK_USER_ACCESS_TOKEN = 'EAAN2JZAnVsjYBAPLagvYX4jsN69WDc2hYUZAZAfr0knhSLpP17lhwICUhtwZACKcPb1PzQR5HuaGu0xn7Ec0W1Y6J6T2XZBBklKvZBL4fYEKGLa15JnDViI7fd6bGSNN3KLSrGZBweqBTJ8Nx2z7DKThOkrb2gRz5uEZBPzJkMvtVwwxbUvT4bbk';
const token_webhook = '123abc123abc';
const APP_TOKEN = '974328796918326|bmC5qJbAVVUWO55uCqmc2Mh26iM';
const app_secret = '16ae7d42162c0a2189d3709f6abf84a0';
const app_id = '974328796918326';
const page_id = '100405676306923';

exports.getWebhook = async(req, res) => {
  // Questo è l'endpoint che Facebook utilizzerà per la verifica

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === token_webhook) {
    // Verifica riuscita, restituisci la challenge a Facebook
    res.status(200).send(challenge);
  } else {
    // Verifica fallita, restituisci un errore
    res.sendStatus(403);
  }
};

exports.postWebhook = async (req, res) => {
  // Facebook will be sending an object called "entry" for "leadgen" webhook event
  if (!req.body.entry) {
      return res.status(500).send({ error: 'Invalid POST data received' });
  }

  // Travere entries & changes and process lead IDs
  for (const entry of req.body.entry) {
      for (const change of entry.changes) {
          // Process new lead (leadgen_id)
          await processNewLead(change.value.leadgen_id);
      }
  }

  // Success
  res.send({ success: true });
};


async function processNewLead(leadId) {
  let response;

  try {
      // Get lead details by lead ID from Facebook API
      response = await axios.get(`https://graph.facebook.com/v9.0/${leadId}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`);
      console.log(response);
  }
  catch (err) {
      // Log errors
      return console.warn(`An invalid response was received from the Facebook API:`, err.response ? err.response : null);
  }

  // Ensure valid API response returned
  if (!response.data || (response.data && (response.data.error || !response.data.field_data))) {
      return console.warn(`An invalid response was received from the Facebook API: ${response}`);
  }

  // Lead fields
  const leadForm = [];

  // Extract fields
  for (const field of response.data.field_data) {
      // Get field name & value
      const fieldName = field.name;
      const fieldValue = field.values[0];

      // Store in lead array
      leadForm.push(`${fieldName}: ${fieldValue}`);
  }

  // Implode into string with newlines in between fields
  const leadInfo = leadForm.join('\n');

  // Log to console
  console.log('A new lead was received!\n', leadInfo);

  // Use a library like "nodemailer" to notify you about the new lead
  // 
  // Send plaintext e-mail with nodemailer
  // transporter.sendMail({
  //     from: `Admin <admin@example.com>`,
  //     to: `You <you@example.com>`,
  //     subject: 'New Lead: ' + name,
  //     text: new Buffer(leadInfo),
  //     headers: { 'X-Entity-Ref-ID': 1 }
  // }, function (err) {
  //     if (err) return console.log(err);
  //     console.log('Message sent successfully.');
  // });
}

const verifyRequestWhatsapp = (req) => {
    const secretKey = 'YOUR_SECRET_KEY'; // Sostituisci con la tua chiave segreta
  
    // Ottenere l'header 'X-WABA-Signature' dalla richiesta
    const signature = req.headers['x-waba-signature'];
  
    // Genera la firma locale utilizzando la chiave segreta e il corpo della richiesta
    const localSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(req.body))
      .digest('base64');
  
    // Confronta la firma locale con la firma ricevuta
    return signature === localSignature;
  };

  exports.saveWhatsLead = async (req, res) => {
    // Verifica che la richiesta provenga da WhatsApp Business API
    const isVerified = verifyRequest(req);
    if (!isVerified) {
      // Se la richiesta non è autenticata, invia una risposta di errore
      return res.status(401).json({ error: 'Richiesta non autenticata.' });
    }
  
    // Gestisci il contenuto del messaggio ricevuto
    const { body } = req;
  
    // Estrai i dati del lead dal messaggio ricevuto
    const leadData = {
      nome: body.messages[0].from.name,
      telefono: body.messages[0].from.phoneNumber,
      testoMessaggio: body.messages[0].text,
      // Puoi estrarre altri campi desiderati dal messaggio
    };
  
    try {
      // Crea un nuovo oggetto Lead utilizzando il modello
      const newLead = new Lead(leadData);
  
      // Salva il lead nel database
      await newLead.save();
  
      // Invia una risposta di successo a WhatsApp Business API
      res.sendStatus(200);
    } catch (error) {
      console.error('Errore durante il salvataggio del lead:', error);
      res.status(500).json({ error: 'Si è verificato un errore durante il salvataggio del lead.' });
    }
  };
  

exports.saveFacebookLeads = async(req, res) => {
    try {
      const { nome, email, telefono } = req.body;
  
      // Verifica che l'utente sia autorizzato ad accedere a questa funzione
      // Esempio: controlla il token o l'autenticazione dell'utente
  
      // Crea un nuovo oggetto Lead
      const newLead = new Lead({
        nome,
        email,
        telefono
      });
  
      // Salva il lead nel database
      await newLead.save();
  
      res.json({ message: 'Lead salvato con successo.' });
    } catch (error) {
      console.error('Errore durante il salvataggio del lead:', error);
      res.status(500).json({ error: 'Si è verificato un errore durante il salvataggio del lead.' });
    }
  };