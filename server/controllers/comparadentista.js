const Lead = require('../models/lead');
const LeadWordpress = require('../models/leadWordpress');
var cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const axios = require('axios');
const moment = require("moment");
const LeadFacebook = require('../models/leadFacebook');

exports.getDataCap = async (req, res) => { 
    console.log(req.body);
    const nome = req.body.nomeCompleto || '';
    const email = req.body.email || '';
    const numeroTelefono = req.body.cellulare;
    const città = req.body.capString
    const utmCampaign = req.body.utmCampaign ? req.body.utmCampaign : 'Meta Web G';
    const utmSource = req.body.utmSource !== null ? req.body.utmSource : "Meta Web G";
    const utmContent = req.body.utmContent ? req.body.utmContent : 'Meta Web G';
    const utmAdset = req.body.utmAdset ? req.body.utmAdset : "Meta Web G";
    const utmAdgroup = req.body.utmAdgroup ? req.body.utmAdgroup : "Meta Web G";

    try {
  
      const existingLead = await LeadWordpress.findOne({ $or: [{ email }, { numeroTelefono }] });
      const existingLeadAss = await Lead.findOne({ $or: [{ email }, { numeroTelefono }] });

      if (!existingLead || !existingLeadAss) {
        const newLead = new Lead({
          data: new Date(),
          nome: nome,
          email: email,
          numeroTelefono: numeroTelefono,
          campagna: 'Meta Web G',
          utente: "65d3110eccfb1c0ce51f7492",
          utmCampaign: utmCampaign,
          città: città,
          utmSource: utmSource,
          utmContent: utmContent,
          esito: "Da contattare",
          utmAdset: utmAdset,
          utmAdgroup: utmAdgroup,
          trattamento: 'Implantologia a carico immediato',
          tentativiChiamata: '0',
          giàSpostato: false,
          note: "",
          fatturato: "",
        });
  
          await newLead.save();
          console.log('Lead salvato dal comparatore:', newLead);
          res.status(200).json({ success: true });
      } else {
          console.log('Lead already exists');
          res.status(200).json({ success: true });
      }

    } catch (error) {
      console.error('Errore durante il salvataggio del lead:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const GetSheetAffiliateData = async () => {
    const sheetBestResponse = await axios.get('https://sheet.best/api/sheets/f2be492b-4096-43fc-b2a9-0847abecd283');
    const sheetData = sheetBestResponse.data;
    console.log(sheetData);

    for (const row of sheetData) {
      const { email } = row;

      const existingLead = await LeadWordpress.findOne({ email });
      const existingLeadAss = await Lead.findOne({ email });

      if (!existingLead && !existingLeadAss) {
        const newLead = new LeadWordpress({
          data: new Date(),
          nome: row.first_name,
          cognome: row.last_name,
          email: email,
          numeroTelefono: row.phone_number,
          corsoDiLaurea: row["quale_percorso_di_studi_ti_interessa?"],
          facolta: "",
          università: row["frequenti_già_l’università?"] == 'Si' ? true : false,
          campagna: 'affiliati',
          utmCampaign: "Affiliati",
          utmSource: "Affiliati",
          orario: row.fascia_oraria,
          lavoro: row["stai_già_lavorando?"] == 'Si' ? true : false,
          universita: row["frequenti_già_l’università?"] == 'Si' ? true : false,
          provincia: row.province,
          utmContent: "Affiliati",
        });
        await newLead.save();
      }
    }
  }

  const GetSheetAffiliateChatbotData = async () => {
    const sheetBestResponse = await axios.get('https://sheet.best/api/sheets/dd9f587c-abe2-452b-a780-2c631b2183b5');
    const sheetData = sheetBestResponse.data;
    console.log(sheetData.length);

    for (const row of sheetData) {
      const { 'Submission Date': submissionDate, Nome, Cognome, 'Città' : city, 'Perfetto! Adesso inserisci il tuo numero di telefono': telefono, 'Come ultima cosa inserisci il tuo indirizzo Email ?': email, 'Ti contatteremo per l’offerta migliore come da informativa sulla privacy policy': consenso, 'Submission ID': submissionID } = row;

      const existingLead = await LeadWordpress.findOne({ email });
      const existingLeadAss = await Lead.findOne({ email });

      if (!existingLead && !existingLeadAss) {
        const newLead = new LeadWordpress({
          data: new Date(),
          nome: Nome,
          cognome: Cognome,
          email: email,
          numeroTelefono: telefono,
          facolta: "",
          campagna: 'chatbot',
          utmCampaign: "Chatbot",
          utmSource: "Chatbot",
          provincia: city,
          utmContent: "Chatbot",
        });
        await newLead.save();
        console.log('Salvato')
      } else {
        console.log('Già salvato');
      }
    }
  }

  //4/0AfJohXmw53r7PYXyh1ZmtDXHguBre1V0Xh0H3UQbS83FRW24t09vz8_CQfGTPoYH1XTUOA


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
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

/**
 * Load or request or authorization to call APIs.
 *
 */
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
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/17pmPgqtw4DNzYvczEZuZPSQg6k49lPnOURibUMpbN7s/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
const dataMeta = [];

const writeDataMGM = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    return lead.campagna === "Mgm"; 
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      lead.campagna ? lead.campagna : "",
      lead.utmCampaign ? lead.utmCampaign.toString() : '', 
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.motivo ? lead.motivo : "",
      lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data',
      lead.leadAmbassador ? lead.leadAmbassador.firstName + ' ' + lead.leadAmbassador.lastName : "",
      lead.leadAmbassador ? lead.leadAmbassador.uniqueCode : "",
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };

  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'MGM!A1',
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
}

const writeDataEntrati = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  const ieri = new Date('2024-01-01');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await LeadWordpress.find();

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= oggi; // || lead.campagna == "wordpress" || lead.campagna == "Wordpress"
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      lead.assigned ? "Assegnato" : "Non assegnato",
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '17pmPgqtw4DNzYvczEZuZPSQg6k49lPnOURibUMpbN7s',
      range: 'EXPORT!A1',
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
}




//CAMPAGNE META
//act_881135543153413/insights?time_range{"since":"2023-11-14","until":"2023-11- 15"}
//act_881135543153413/campaigns?fields=name,insights.time_range({"since":"2023-11-14","until":"2023-11-15"})
const selectedToken = "EAAN2JZAnVsjYBO2hx7fRaHJ7WzXWGrZBSPz5kPPMdImQyVTawtFWwxQujRrsPTVfcC7w44wEZBV4fa8sE2LUmZAHjRzB039NZCZAyvEHvSADue6JBFZAjCQ7ZC2ZAIiezlL6vVZBVqz9yZBeDPZABP6l3w0ZAcklGVQTP8kSIaZAskpIQszuOm7iYVrL1XUpEo";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const logs = [];
const getRequestFromFacebook = async () => {
  logs.splice(0, logs.length);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  //const firstJanuary2024 = new Date('2024-01-21');

  const todayFormatted = formatDate(today);
  //const yesterdayFormatted = formatDate(yesterday);
  const yesterdayFormatted = formatDate(yesterday);
  const url = 'https://graph.facebook.com/v17.0/act_881135543153413/campaigns';
  const params = {
    fields: `name,insights.time_range({"since":"${yesterdayFormatted}","until":"${yesterdayFormatted}"}){spend,impressions,clicks}`,
    access_token: selectedToken,
  };

  axios.get(url, { params })
    .then( async (response) => {
      const dataFromFacebook = response.data.data;
      if (Array.isArray(dataFromFacebook)) {
        console.log(dataFromFacebook)
        for (const element of dataFromFacebook) {
          const { name, insights, id } = element;

          if (insights && insights.data && insights.data.length > 0) {
            for (const ins of insights.data) {
                //console.log(ins);
                const log = [
                      yesterdayFormatted,
                      name,
                      ins.spend,
                      ins.clicks,
                      ins.impressions,
                      id,
                ];
                    logs.push(log);
            }
          }
        }

        console.log(logs);
        await authorize()
        .then(writeMetaReports)
        .catch(console.error);
      } else {
        console.error("dataFromFacebook non è un array");
      }
    })
    .catch(error => {
      console.error('Errore:', error);
    });
};

const writeMetaReports = async (auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const ieri = new Date();
  ieri.setDate(ieri.getDate() - 1);
  ieri.setHours(0, 0, 0, 0);

  const resource = {
    values: logs,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '17pmPgqtw4DNzYvczEZuZPSQg6k49lPnOURibUMpbN7s',
      range: 'EXPORT!A1',
      valueInputOption: 'RAW',
      resource: resource,
    },
    (err, result) => {
      if (err) {
        // Handle error
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
}



const writeDataComparatore = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-11-18');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani && lead.campagna === "comparatore"; // || lead.campagna == "wordpress" || lead.campagna == "Wordpress"
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      lead.campagna ? lead.campagna : "",
      lead.utmSource ? lead.utmSource.toString() : '', 
      lead.utmContent ? lead.utmContent.toString() : '', 
      lead.utmCampaign ? lead.utmCampaign.toString() : '', 
      lead.utmTerm ? lead.utmTerm.toString() : '',
      lead.utmAdgroup ? lead.utmAdgroup.toString() : '',
      lead.utmAdset ? lead.utmAdset.toString() : '',
      lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
      lead.facolta ? lead.facolta : '',
      lead.budget ? lead.budget : '',
      lead.enrollmentTime ? lead.enrollmentTime : '',
      lead.frequentiUni == true ? "Si" : "No",
      lead.lavoro == true ? "Si" : "No",
      lead.oreStudio ? lead.oreStudio : "",
      lead.categories ? lead.categories : "",
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.università ? lead.università : "",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'Import!A1',
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
        runExport(writeDataSocial);
      }
    }
  );
}


const writeDataManual = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-11-18');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani && lead.manualLead === true; // || lead.campagna == "wordpress" || lead.campagna == "Wordpress"
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      lead.manualLead == true ? "Ecp" : "",
      lead.utmSource ? lead.utmSource.toString() : '', 
      lead.utmContent ? lead.utmContent.toString() : '', 
      lead.utmCampaign ? lead.utmCampaign.toString() : '', 
      lead.utmTerm ? lead.utmTerm.toString() : '',
      lead.utmAdgroup ? lead.utmAdgroup.toString() : '',
      lead.utmAdset ? lead.utmAdset.toString() : '',
      lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
      lead.facolta ? lead.facolta : '',
      lead.budget ? lead.budget : '',
      lead.enrollmentTime ? lead.enrollmentTime : '',
      lead.frequentiUni == true ? "Si" : "No",
      lead.lavoro == true ? "Si" : "No",
      lead.oreStudio ? lead.oreStudio : "",
      lead.categories ? lead.categories : "",
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.università ? lead.università : "",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'Import!A1',
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
        runExport(writeDataAffiliati);
      }
    }
  );
}

const writeDataSocial = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-02-20');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani;
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.email,
      lead.numeroTelefono,
      lead.campagna ? lead.campagna.trim().toLocaleLowerCase() === 'messenger' ? "Messenger" : lead.campagna : '',
      "meta",
      "Lead form",
      lead.utmCampaign ? lead.utmCampaign.toString() : lead.campagna.trim().toLocaleLowerCase() === 'messenger' ? "Messenger" : '', 
      lead.utmAdset ? lead.utmAdset.toString() : lead.campagna.trim().toLocaleLowerCase() === "messenger" ? 'Messenger' : '',
      lead.utmContent ? lead.utmContent.toString() : lead.campagna.trim().toLocaleLowerCase() === "messenger" ? 'Messenger' : '',
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
      lead.tipo ? lead.tipo : "",
      lead.trattPrenotato ? lead.trattPrenotato : "", 
      lead.luogo ? lead.luogo : "",
      lead.trattamento ? lead.trattamento : "",
      lead.tentativiChiamata ? lead.tentativiChiamata : "",
      lead.città ? lead.città : "",
      lead.giàSpostato ? lead.giàSpostato : "NO",
      lead.note ? lead.note : "",
      "Meta web"
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '17pmPgqtw4DNzYvczEZuZPSQg6k49lPnOURibUMpbN7s',
      range: 'EXPORT!A1',
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
        //runExport(writeDataManual);
      }
    }
  );
};

const formatDateString = (inputDate) => {
  const parsedDate = moment(inputDate, 'YY-MM-DD HH:mm');                
  const formattedDate = parsedDate.format('DD/MM/YYYY HH:mm');        
  return formattedDate;
};

const writeDataCallCenter = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-02-20');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find({utente: "664c5b2f3055d6de1fcaa22b"}).populate('orientatori').populate('utente');
  console.log(leads.length)
  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani;
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.email,
      lead.numeroTelefono,
      lead.campagna ? lead.campagna.trim().toLocaleLowerCase() === 'messenger' ? "Messenger" : lead.campagna : '',
      "meta",
      "Lead form",
      lead.utmCampaign ? lead.utmCampaign.toString() : lead.campagna.trim().toLocaleLowerCase() === 'messenger' ? "Messenger" : '', 
      lead.utmAdset ? lead.utmAdset.toString() : lead.campagna.trim().toLocaleLowerCase() === "messenger" ? 'Messenger' : '',
      lead.utmContent ? lead.utmContent.toString() : lead.campagna.trim().toLocaleLowerCase() === "messenger" ? 'Messenger' : '',
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
      lead.tipo ? lead.tipo : "",
      lead.trattPrenotato ? lead.trattPrenotato : "", 
      lead.luogo ? lead.luogo : "",
      lead.trattamento ? lead.trattamento : "",
      lead.tentativiChiamata ? lead.tentativiChiamata : "",
      lead.città ? lead.città : "",
      lead.giàSpostato ? lead.giàSpostato : "NO",
      lead.note ? lead.note : "",
      "Meta web",
      lead.appFissato ? formatDateString(lead.appFissato) : "",
      lead.appDate ? formatDateString(lead.appDate) : "",
      lead.recallType ? lead.recallType : ""
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '17pmPgqtw4DNzYvczEZuZPSQg6k49lPnOURibUMpbN7s',
      range: 'EXPORT-CALL-CENTER!A1',
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
};

const writeDataWordpress = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-11-18');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani && (lead.campagna == "wordpress" || lead.campagna == "Wordpress"); // || lead.campagna == "wordpress" || lead.campagna == "Wordpress"
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      lead.campagna ? lead.campagna : "",
      "wordpress",
      "", 
      '', 
      '',
      '',
      '',
      lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
      lead.facolta ? lead.facolta : '',
      lead.budget ? lead.budget : '',
      lead.enrollmentTime ? lead.enrollmentTime : '',
      lead.frequentiUni == true ? "Si" : "No",
      lead.lavoro == true ? "Si" : "No",
      lead.oreStudio ? lead.oreStudio : "",
      lead.categories ? lead.categories : "",
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.università ? lead.università : "",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'Import!A1',
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
        runExport(writeDataAffiliatiChatbot);
      }
    }
  );
}

const writeDataAffiliati = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-11-18');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani && lead.campagna == "affiliati";
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      "Federica",
      "Federica",
      "", 
      '', 
      '',
      '',
      '',
      lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
      lead.facolta ? lead.facolta : '',
      lead.budget ? lead.budget : '',
      lead.enrollmentTime ? lead.enrollmentTime : '',
      lead.frequentiUni == true ? "Si" : "No",
      lead.lavoro == true ? "Si" : "No",
      lead.oreStudio ? lead.oreStudio : "",
      lead.categories ? lead.categories : "",
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.università ? lead.università : "",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'Import!A1',
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
        runExport(writeDataWordpress);
      }
    }
  );
}

const writeDataAffiliatiChatbot = async (auth) => {
  const dataToUpdate = [];
  const sheets = google.sheets({ version: 'v4', auth });
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  //oggi.setDate(oggi.getDate())
  oggi.setHours(0, 0, 0, 0);
  domani.setHours(0, 0, 0, 0);
  const ieri = new Date('2023-11-18');
  ieri.setHours(0, 0, 0, 0);

  const todayFormatted = formatDate(oggi);
  const yesterdayFormatted = formatDate(ieri);

  const leads = await Lead.find().populate('orientatori').populate('utente');

  const assegnatiLeadsComp = leads.filter((lead) => {
    const leadDate = new Date(lead.data);
    return leadDate >= ieri && leadDate <= domani && lead.campagna == "chatbot";
  });

  assegnatiLeadsComp.forEach((lead) => {
    const leadData = [
      lead.data ? formatDate(new Date(lead.data)) : '', 
      lead.nome,
      lead.cognome,
      lead.email,
      lead.numeroTelefono,
      "chatbot",
      "chatbot",
      "", 
      '', 
      '',
      '',
      '',
      lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
      lead.facolta ? lead.facolta : '',
      lead.budget ? lead.budget : '',
      lead.enrollmentTime ? lead.enrollmentTime : '',
      lead.frequentiUni == true ? "Si" : "No",
      lead.lavoro == true ? "Si" : "No",
      lead.oreStudio ? lead.oreStudio : "",
      lead.categories ? lead.categories : "",
      lead.utente ? lead.utente.nameECP : "",
      lead.orientatori && lead.orientatori !== null ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : "Non assegnato",
      lead.università ? lead.università : "",
      lead.motivo ? lead.motivo : "",
      lead.esito === "Non interessato" ? "Lead persa" : lead.esito.toString(),
      lead.dataCambiamentoEsito ? formatDate(lead.dataCambiamentoEsito) : 'Nessuna Data', 
    ];
  
    dataToUpdate.push(leadData);
  });

  const resource = {
    values: dataToUpdate,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: '19uw4QtH8HgiAvK3toIqvF3vpF_gBdXhxAEtUU2O1tbU',
      range: 'Import!A1',
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
}

const runDailyJob = () => {
  authorize()
    .then(writeDataEntrati)
    .catch(console.error);
};

const runExport = (exportFunction) => {
  authorize()
    .then(exportFunction)
    .catch(console.error);
};

async function fetchEmailsFromSheet() {
  const authClient = await authorize();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1kKa_lDiRToed9H_4SEo6lDd4hzdyEeXzi87T7OZFilo',
    range: 'Sheet1!B2:B1000',
  });

  const rows = response.data.values;
  console.log(response.data)
  if (rows.length) {
    return rows.map(row => row[0]);
  } else {
    console.log('No data found.');
    return [];
  }
}

async function findLeadsByEmails(emails) {
  for (const email of emails) {
    const lead = await LeadFacebook.findOne({
      "fieldData": {
        "$elemMatch": {
          "name": "email",
          "values": email.trim()
        }
      }
    });
    if (lead) {
      console.log(`Lead trovato: ${email}`);
      lead.assigned = false;
      await lead.save()
    } else {
      console.log(`Lead non trovato: ${email}`);
    }
  }
}

/*(async () => {
  try {
    const emails = await fetchEmailsFromSheet();
    await findLeadsByEmails(emails);
  } catch (error) {
    console.error('Errore:', error);
  }
})();*/

//runExport(writeDataComparatore);
//runDailyJob();
//getRequestFromFacebook();

/*const runDailyMeta = () => {
  getRequestFromFacebook();
};

cron.schedule('0 1 * * *', () => {
  runExport(writeDataComparatore);
});

cron.schedule('10 1 * * *', () => {
  runDailyJob();
});
*/
cron.schedule('30 1 * * *', () => {
  runExport(writeDataSocial);
})

cron.schedule('30 2 * * *', () => {
  runExport(writeDataCallCenter);
})

/*cron.schedule('20 8,9,10,11,12,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  GetSheetAffiliateData();
});

cron.schedule('30 8,9,10,11,12,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  GetSheetAffiliateChatbotData();
});*/

/*cron.schedule('0 2 * * *', () => {
  runDailyMeta();
});*/