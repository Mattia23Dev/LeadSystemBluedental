const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
require("dotenv").config();
const {google} = require('googleapis');
const path = require("path");
const cron = require('node-cron');
const { parse } = require('json2csv');
const LeadChatbot = require('./models/leadChatbot');
const {authenticate} = require('@google-cloud/local-auth');
const { saveLeadChatbotDentista, saveLeadChatbotDentistaNew, saveLeadChatbotDentistaNewCallCenter, saveSomaLead } = require('./controllers/chatbot');
const axios = require('axios');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const app = express();

mongoose.set('strictQuery', false); 
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB Connessoo!"))
  .catch((err) => console.log("DB Connection Error ", err));

  app.use(express.static(path.join(__dirname, 'client', 'public')));

app.use(express.json({ limit: "10mb" }));
app.use(cors());

/*async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}*/
/*sync function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}*/

async function exportChatbot(auth) {
  try {
    const dataToUpdate = [];
    const sheets = google.sheets({ version: 'v4', auth });
    const leadChatbots = await LeadChatbot.find();
    leadChatbots.forEach((lead) => {
      const leadData = [
        lead.data ? lead.data : '', 
        lead.fullName,
        lead.nome,
        lead.cognome,
        lead.numeroTelefono,
        lead.email,
        lead.idLead,
        lead.channel,
        lead.appointment_date || '',
        lead.last_interaction,
        lead.conversation_summary || ''
      ];
    
      dataToUpdate.push(leadData);
    });
  
    const resource = {
      values: dataToUpdate,
    };
    sheets.spreadsheets.values.append(
      {
        spreadsheetId: '1q0U8F3YcSQkF9eLVYf3O8Umu6wRWMSwFWvfmXnj_1wI',
        range: 'gpt!A1',
        valueInputOption: 'RAW',
        resource: resource,
      },
      async (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log(
            '%d cells updated on range: %s',
            result.data.updates.updatedCells,
            result.data.updates.updatedRange
          );
        }
      }
    );
  } catch (error) {
    console.log(error) 
  }
}

const exportLeadsToCSV = async () => {
  try {
      const leads = await LeadChatbot.find({});
      const csv = parse(leads, {
          fields: ["idLead", "channel", "data", "fullName", "nome", "cognome", "email", "numeroTelefono", "last_interaction", "appointment_date", "conversation_summary", "assigned"]
      });
      fs.writeFileSync('./leadchatbot.csv', csv);
      console.log('File CSV scritto con successo!');
  } catch (error) {
      console.error('Errore durante l\'esportazione dei leads:', error);
  } finally {
      mongoose.connection.close();
  }
};

//exportLeadsToCSV()
app.post('/api/save-chatbot-dentista', saveLeadChatbotDentista);
app.post('/api/save-chatbot-dentista-new', saveLeadChatbotDentistaNew);
app.post('/api/save-chatbot-dentista-new-callcenter', saveLeadChatbotDentistaNewCallCenter);
app.post('/api/save-soma-lead', saveSomaLead);

app.post('/api/webhook-test-deepsystem', function(req, res) {
  try {
    console.log(req.body)
    res.status(200).json({ message: 'ok!' });
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'error!' });
  }
});

const inviaWebhookFlow = async (customerData) => {
  try {
    const response = await axios.post('http://localhost:3000/webhooks/flows/29b87450-335f-442d-88f6-813bf9db3a04', {
      customerName: customerData.nome,
      phoneNumber: customerData.telefono,
      productId: customerData.prodottoId,
      message: customerData.messaggio
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Risposta dal webhook:', response.data);
    return response.data;

  } catch (error) {
    console.error('Errore durante l\'invio del webhook:', error.message);
    throw error;
  }
};

// Esempio di utilizzo:

/*inviaWebhookFlow({
  nome: "Mattia",
  telefono: "+393513257290",
  prodottoId: "PROD123",
  messaggio: "Ciao, vorrei informazioni sul prodotto PROD123"
});*/


/*const runDailyJob = () => {
  authorize()
    .then(exportChatbot)
    .catch(console.error);
};*/

//cron.schedule('10 2 * * *', runDailyJob);

const port = process.env.PORT || 8001;
app.listen(port, () => console.log(`Server is running on port ${port}`));
