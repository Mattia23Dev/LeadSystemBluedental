const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const {readdirSync} = require('fs');
const webpush = require('web-push');
require("dotenv").config();
const path = require("path");
const Lead = require('./models/lead');

const app = express();

mongoose.set('strictQuery', false); 
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB Connessoo!"))
  .catch((err) => console.log("DB Connection Error ", err));

  app.use(express.static(path.join(__dirname, 'client', 'public')));

 const publicVapidKey = "BA4JFmsO2AigZr9o4BH8lqQerqz2NKytP2nsxOcHIKbl5g98kbOzLECvxXYrQyMTfV_W7sHTUG6_GuWtTzwLlCw";
 const privateVapidKey = "f33Ot0HGNfYCJRR69tW_LwRsbDQtS0Jk9Ya57l0XWQQ";

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.COMPARACORSI, process.env.APP_COMPARACORSI, "https://test-comparatore.netlify.app", "https://leadsystem-test.netlify.app"],
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
            body {
                font-family: Arial, sans-serif;
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
        </style>
    </head>
    <body>
        <div class="container">
            <img class="logo" src="https://www.comparacorsi.it/wp-content/uploads/2024/03/comparadentisti_logo_Tavola-disegno-1-copia-3.png" alt="dentistavicinoame">
            <h1>Compila il modulo per essere ricontattato!</h1>
            <form action="/submit" method="post">
              <input type="hidden" name="leadEmail" value=${leadEmail}>
              <input type="hidden" name="leadName" value=${leadName}>
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
              <input type="submit" value="Prenota chiamata gratuita">
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
  const telefono = req.body.telefono;
  const orario = req.body.orario;
  await fetch("https://sheet.best/api/sheets/4070a63e-91a2-42d2-aa8f-ae61f2b20875", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      Nome: leadName,
      Cognome: leadSurname,
      Email: leadEmail,
      Cellulare: leadPhone,
      Richiesta: "Si",
      Data: formattedDate,
      Ecp: leadEcp || "",
      Orientatore: leadOrientatore || "",
    })
  })
  .then(response => {
    if (response.ok) {
      console.log("Lead salvata con successo");
    } else {
      console.error("Errore durante il salvataggio della lead:", response);
    }
  })
  console.log('Numero di Telefono:', telefono);
  console.log('Orario di Contatto:', orario);
  res.send('Grazie per aver compilato il modulo! Verrai ricontattato presto.');
});

//deleteAllLeads();
const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
