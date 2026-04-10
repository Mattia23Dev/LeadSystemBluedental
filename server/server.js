const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const {readdirSync} = require('fs');
const webpush = require('web-push');
require("dotenv").config();
const path = require("path");
const Lead = require('./models/lead');
const bodyParser = require("body-parser")
const axios = require('axios')
const XLSX = require('xlsx');
const { fetchLeads } = require('./helpers/nexus');

const esportaLeadIeri = async () => {
  try {
    // Imposta l'intervallo di tempo per ieri dalle 9:00 alle 22:00
    const ieri = new Date('2024-03-29T09:00:00');
    
    const inizioIntervallo = new Date('2024-03-29T09:00:00');
    
    const fineIntervallo = new Date('2024-04-02T20:00:00');

    // Trova le lead che corrispondono ai criteri
    const leads = await Lead.find({
      utente: "65d3110eccfb1c0ce51f7492",
      dataTimestamp: {
        $gte: inizioIntervallo,
        $lte: fineIntervallo
      },
      utmCampaign: { $regex: /Meta Web/i }
    }).lean();

    console.log('Intervallo di ricerca:');
    console.log('Inizio:', inizioIntervallo.toISOString());
    console.log('Fine:', fineIntervallo.toISOString());
    console.log(`Trovate ${leads.length} lead`);
    
    // Verifica alcune lead per debug
    if (leads.length > 0) {
      console.log('Esempio di lead trovata:');
      console.log('Data:', leads[0].dataTimestamp);
      console.log('UTM Campaign:', leads[0].utmCampaign);
    }
  } catch (error) {
    console.error('Errore durante l\'esportazione delle lead:', error);
  }
};

const searchGoldLeads = async () => {
  try {
    // Set the date range for March 2024
    const startDate = new Date('2025-07-10T00:00:00');
    const endDate = new Date('2025-07-16T23:59:59');

    // Find leads matching the criteria
    const leadsAmbra = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      utmCampaign: { 
        $regex: /ambra/i  // Case-insensitive search for 'gold'
      }
    }).lean();

    const leadChiamate = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      chiamato: true,
    }).lean();

    const leadsGold = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      utmCampaign: { 
        $regex: /gold/i  // Case-insensitive search for 'gold'
      }
    }).lean();

    const leadsMetaWeb = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      utmCampaign: { 
        $regex: /meta web/i  // Case-insensitive search for 'gold'
      }
    }).lean();

    const leadsGFU = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      utmCampaign: { 
        $regex: /gfu/i  // Case-insensitive search for 'gold'
      }
    }).lean();

    const leadsTotal = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      /*utmCampaign: { 
        $regex: /meta web/i  // Case-insensitive search for 'gold'
      }*/
    }).lean();

    const leadsAIChatbot = await Lead.find({
      dataTimestamp: {
        $gte: startDate,
        $lte: endDate
      },
      //utente: "65d3110eccfb1c0ce51f7492",
      //esito: "Da richiamare"
      utmCampaign: { 
        $regex: /ai chatbot/i  // Case-insensitive search for 'gold'
      }
    }).lean();

    console.log('Search results:');
    console.log('Start date:', startDate.toISOString());
    console.log('End date:', endDate.toISOString());

    console.log(leadsAmbra.length);
    console.log(leadsGold.length);
    console.log(leadsMetaWeb.length);
    console.log(leadChiamate.length);
    console.log(leadsGFU.length);
    console.log(leadsTotal.length);
    console.log(leadsAIChatbot.length);
    // Log some example leads for verification
    /*if (leads.length > 0) {
      console.log('Example leads found:');
      leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\nLead ${index + 1}:`);
        console.log('Date:', lead.dataTimestamp);
        console.log('UTM Campaign:', lead.utmCampaign);
        console.log('Name:', lead.nome);
      });
    }*/

    return {
      leadsAmbra: leadsAmbra,
      leadsGold: leadsGold,
      leadsMetaWeb: leadsMetaWeb,
      leadsGFU: leadsGFU,
      leadsTotal: leadsTotal,
      leadsAIChatbot: leadsAIChatbot
    };
  } catch (error) {
    console.error('Error searching for gold leads:', error);
    throw error;
  }
};

const getUniqueCampaigns = async () => {
  try {
    // Get unique campaign values
    const uniqueCampagne = await Lead.distinct('campagna');
    const uniqueUtmCampaigns = await Lead.distinct('utmCampaign');

    // Filter out null, undefined, and empty string values
    const cleanCampagne = uniqueCampagne.filter(campaign => campaign && campaign.trim() !== '');
    const cleanUtmCampaigns = uniqueUtmCampaigns.filter(campaign => campaign && campaign.trim() !== '');

    console.log('\nUnique Campagna values:');
    console.log(cleanCampagne);
    
    console.log('\nUnique UTM Campaign values:');
    console.log(cleanUtmCampaigns);

    return {
      campagne: cleanCampagne,
      utmCampaigns: cleanUtmCampaigns
    };
  } catch (error) {
    console.error('Error getting unique campaigns:', error);
    throw error;
  }
};

const app = express();

mongoose.set('strictQuery', false); 
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB Connessoo!"))
  .catch((err) => console.log("DB Connection Error ", err));

  app.use(express.static(path.join(__dirname, 'client', 'public')));
  app.use(bodyParser.urlencoded({ extended: true }));

// Configurazione body-parser con gestione errori
const publicVapidKey = "BA4JFmsO2AigZr9o4BH8lqQerqz2NKytP2nsxOcHIKbl5g98kbOzLECvxXYrQyMTfV_W7sHTUG6_GuWtTzwLlCw";
const privateVapidKey = "f33Ot0HGNfYCJRR69tW_LwRsbDQtS0Jk9Ya57l0XWQQ";

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.COMPARACORSI, process.env.APP_COMPARACORSI, "https://test-comparatore.netlify.app", "https://leadsystem-test.netlify.app", "https://cap.dentista-vicinoame.it", "http://localhost:3000", "https://test-bludental.netlify.app", "https://bluedental-test.netlify.app"],
  })
);

readdirSync("./routes").map((r) => app.use("/api", require(`./routes/${r}`)));

webpush.setVapidDetails( "mailto:info@funnelconsulting.it", publicVapidKey, privateVapidKey);

app.post('/api/subscribe', (req, res) => {
  console.log(req.body);
  const subscription = req.body;
  res.status(201).json({});
  const payload = JSON.stringify({ title: "", body: "" });

  webpush.sendNotification(subscription, payload).catch((err) => console.log(err));
});

const deleteAllLeads = async () => {
  try {
    const result = await Lead.deleteMany({});
    console.log(`${result.deletedCount} lead eliminate.`);
  } catch (error) {
    console.error('Si è verificato un errore durante l\'eliminazione delle lead:', error);
  }
};

//esportaLeadIeri()


app.get('/email-marketing', async (req,res) => {
  const { leadEmail, leadName} = req.query;
  try {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grazie per averci contattato!</title>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
            body {
                font-family: 'Poppins', sans-serif;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
            }
            p {
                color: #666;
                margin-bottom: 20px;
            }
            .logo {
                max-width: 200px;
                margin: 0 auto;
            }
            .button{
              padding: 8px 20px;
              border: 1px solid #000;
              cursor: pointer;
              border-radius: 20px;
            }
            input{
              padding: 3px 7px;
              border-radius: 10px;
              border: 1px solid #000;
              outline: none;
              margin: 20px 0;
            }
            select{
              padding: 3px 7px;
              border-radius: 10px;
              margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img class="logo" src="https://www.comparacorsi.it/wp-content/uploads/2024/03/comparadentisti_logo_Tavola-disegno-1-copia-3.png" alt="dentistavicinoame">
            <h1>Compila il modulo per essere ricontattato!</h1>
            <form id="contactForm" action="/submit" method="post">
              <input type="hidden" name="leadEmail" value="${leadEmail}">
              <input type="hidden" name="leadName" value="${leadName}">
              <label for="telefono">Numero di Telefono:</label>
              <input type="tel" id="telefono" name="telefono" required><br><br>
              <label for="orario">Orario di Contatto:</label>
              <select id="orario" name="orario" required>
                <option value="">Seleziona un orario</option>
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:00">12:00</option>
                <option value="13:00">13:00</option>
                <option value="14:00">14:00</option>
                <option value="15:00">15:00</option>
                <option value="16:00">16:00</option>
                <option value="17:00">17:00</option>
                <option value="18:00">18:00</option>
              </select><br><br>
              <input class='button' type="submit" value="Prenota chiamata gratuita">
            </form>
        </div>
    </body>
    </html>
`); 
  } catch (error) {
    console.error(error)
  }
})

app.post('/submit', async (req, res) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); 
  const year = today.getFullYear();

  const formattedDate = `${day}/${month}/${year}`;
  console.log(req.body)
  const telefono = req.body.telefono;
  const email = req.body.leadEmail;
  const nome = req.body.leadName;
  const orario = req.body.orario;
  try {
    await fetch("https://sheet.best/api/sheets/4070a63e-91a2-42d2-aa8f-ae61f2b20875", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      Nome: nome,
      Email: email,
      Cellulare: telefono,
      Orario: orario,
      Data: formattedDate,
    })
  })
  .then(response => {
    res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Grazie per averci contattato!</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
          body {
              font-family: 'Poppins', sans-serif;
              background-color: #f9f9f9;
              margin: 0;
              padding: 0;
          }
          .container {
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background-color: #fff;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              text-align: center;
          }
          h1 {
              color: #333;
              margin-bottom: 20px;
          }
          p {
              color: #666;
              margin-bottom: 20px;
          }
          .logo {
              max-width: 200px;
              margin: 0 auto;
          }
          .button{
            padding: 8px 20px;
            border: 1px solid #000;
            cursor: pointer;
            border-radius: 20px;
          }
          input{
            padding: 3px 7px;
            border-radius: 10px;
            border: 1px solid #000;
            outline: none;
            margin: 20px 0;
          }
          select{
            padding: 3px 7px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <img class="logo" src="https://www.comparacorsi.it/wp-content/uploads/2024/03/comparadentisti_logo_Tavola-disegno-1-copia-3.png" alt="dentistavicinoame">
          <h1>Grazie, sarai ricontattato al più presto!</h1>
      </div>
  </body>
  </html>
`); 
    if (response.ok) {
      console.log("Lead salvata con successo");
    } else {
      console.error("Errore durante il salvataggio della lead:", response);
    }
  })
  } catch (error) {
    console.error(error)
  }
});

const trigger = () => {
  const url = 'https://app.chaticmedia.com/api/users';

const data = {
  phone: "3313869850",
  email: "francesca@gmail.com",
  first_name: "Francesca",
  last_name: "Di lallo",
  full_name: "Francesca",
  gender: "female",
  actions: [
    {
      action: "add_tag",
      tag_name: "Da contattare"
    },
    {
      action: "set_field_value",
      field_name: "City",
      value: "Nepal"
    },
    {
      action: "set_field_value",
      field_name: "Numero Operatore",
      value: "3313869850"
    },
    {
      action: "set_field_value",
      field_name: "Operatore",
      value: "Gian nicola"
    },
    {
      action: "set_field_value",
      field_name: "Trattamento",
      value: "Operazione estetica"
    },
  ]
}

const headers = {
  'Content-Type': 'application/json',
  'X-ACCESS-TOKEN': '1114716.GhZ5kU8ZaFOGZ4YXnpZbX4cHWg6Y5zXJ80hxdRr28Mb'
};

axios.post(url, data, { headers })
  .then(response => {
    console.log('Response:', response.data);
    if (response.data.success){
      const id = response.data.data.id;
      axios.post(url+`/${id}/send/1715849419797`, null, {headers}).then((res) => {
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
//trigger()

const getUser = () => {
  const url = 'https://app.chaticmedia.com/api/users/3333333';

const headers = {
  'Content-Type': 'application/json',
  'X-ACCESS-TOKEN': '1099113.cLsOisMrC8yUje3XROuIksvZGZeDSfwSYZXFOV'
};

axios.get(url, { headers })
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
  });
}
//getUser()

const checkLeadDoppie = async () => {
  const leadDuplicate = await Lead.aggregate([
    { 
      $group: {
        _id: {nome: "$nome", email: "$email" },
        count: { $sum: 1 }
      }
    },
    { $match: { count: 2 } },
    { $match: { esito: "Da contattare" } },
  ]);
  console.log(leadDuplicate)

  const idsToRemove = leadDuplicate.map(lead => lead._id);
}
//checkLeadDoppie()
//esportaLeadIeri();
//deleteAllLeads();

const getUltimeLead = async () => {
  try {
    const leads = await Lead.find({
      //utmCampaign: { $regex: /Meta Web/i },
    })
      .sort({ dataTimestamp: -1 }) // Ordina per data decrescente
      .limit(50) // Limita a 50 risultati
      .lean();

    console.log(`Trovate ${leads.length} lead`);
    
    // Prepara i dati per l'export Excel
    const excelData = leads.map(lead => ({
      'Data': lead.dataTimestamp ? new Date(lead.dataTimestamp).toLocaleString() : '',
      'Nome': lead.nome || '',
      'Email': lead.email || '',
      'Telefono': lead.numeroTelefono || '',
      //'UTM Campaign': lead.utmCampaign || '',
      "Città": lead.città || '',
      "Trattamento": lead.trattamento || '',
      'Esito': lead.esito || '',
      'Note': lead.note || ''
    }));

    // Crea un nuovo workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Aggiungi il worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    
    // Genera il nome del file con la data corrente
    const today = new Date();
    const fileName = `leads_export_${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.xlsx`;
    
    // Salva il file
    XLSX.writeFile(workbook, fileName);
    
    console.log(`File Excel creato con successo: ${fileName}`);
    
    return leads;
  } catch (error) {
    console.error('Errore durante il recupero delle lead:', error);
    throw error;
  }
};

// Per testare la funzione, puoi decommentare questa riga:
//getUltimeLead();
//fetchLeads();

async function makeOutboundCall(number, city, name, type, id) {
  const url = 'https://primary-production-403a.up.railway.app/webhook/bludental-attivazione';
  //const url = 'https://cd9f-185-199-103-50.ngrok-free.app/outbound-call';
  number = number.replace(/\s+/g, '');
  const lead = await Lead.findOne({ numeroTelefono: number });
  // Controlla e aggiusta il prefisso
  if (!number.startsWith('+39')) {
    if (number.startsWith('39') && number.length === 12) {
      number = '+' + number;
    } else if (number.length === 10) {
      number = '+39' + number;
    }
  }

  const data = {
    user_phone: number,
    user_city: city,
    user_name: name,
    type: type || null,
    user_id: id,
  };

  try {
    const response = await axios.post(url, data);
    console.log('Risposta dal server:', response.data);
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
}
const chiamaLeadIeriOggi = async () => {
  try {
    // Calcola le date per l'intervallo richiesto
    const oggi = new Date();
    const ieri = new Date(oggi);
    ieri.setDate(oggi.getDate() - 1);
    
    // Imposta ieri alle 09:00 italiane
    const inizioIntervallo = new Date(ieri);
    inizioIntervallo.setHours(9, 30, 0, 0);
    
    // Imposta oggi alle 08:00 italiane
    const fineIntervallo = new Date(oggi);
    fineIntervallo.setHours(8, 0, 0, 0);
    
    console.log('Cercando lead tra:');
    console.log('Inizio:', inizioIntervallo.toISOString());
    console.log('Fine:', fineIntervallo.toISOString());
    
    // Trova tutte le lead nell'intervallo specificato
    const leads = await Lead.find({
      dataTimestamp: {
        $gte: inizioIntervallo,
        $lte: fineIntervallo
      }
    }).lean();
    
    console.log(`Trovate ${leads.length} lead da chiamare`);
    
    // Per ogni lead, esegui la chiamata outbound
    for (const lead of leads) {
      console.log(`Chiamando lead: ${lead.nome} - ${lead.numeroTelefono}`);
      
      try {
        await makeOutboundCall(
          lead.numeroTelefono,
          lead.città,
          lead.nome,
          lead.trattamento,
          lead._id
        );
        
        // Aggiungi un piccolo delay tra le chiamate per evitare sovraccarichi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Errore durante la chiamata per ${lead.nome}:`, error);
      }
    }
    
    console.log('Processo di chiamate completato');
    
  } catch (error) {
    console.error('Errore durante il processo di chiamate:', error);
  }
};

// Per eseguire la funzione, decommenta la riga seguente:
//chiamaLeadIeriOggi();

/*searchGoldLeads()
  .then(leads => {
    console.log('Total leads found:', leads.leadsTotal.length);
    console.log('Total ambra leads found:', leads.leadsAmbra.length);
    console.log('Total meta web leads found:', leads.leadsMetaWeb.length);
    console.log('Total gold leads found:', leads.leadsGold.length);
    console.log('Total gfu leads found:', leads.leadsGFU.length);
    console.log('Total ai chatbot leads found:', leads.leadsAIChatbot.length);
  })
  .catch(error => {
    console.error('Error:', error);
  });
*/

const getLeadsByDate = async () => {
  try {
  const leads = await Lead.find({
    dataTimestamp: {
      $gte: new Date('2025-09-06T00:00:00'),
      $lte: new Date('2025-09-09T23:59:59')
    },
    esito: { $nin: ["Fissato"] },
    email: { $regex: /p:\+/, $options: 'i' }
  });
  console.log(leads.length)
  for (const lead of leads) {
    //lead.deleteOne();
  }

  } catch (error) {
    console.error('Error:', error);
  }
}
//getLeadsByDate()

// Execute the function
/*getUniqueCampaigns()
  .then(result => {
    console.log('\nTotal unique campaigns found:');
    console.log('Campagne:', result.campagne.length);
    console.log('UTM Campaigns:', result.utmCampaigns.length);
  })
  .catch(error => {
    console.error('Error:', error);
  });*/

const port = process.env.PORT || 8000;
// Register Nexus nightly cron (no startup execution here).
require('./scripts/nexus-nightly-sync');
app.listen(port, () => console.log(`Server is running on port ${port}`));
