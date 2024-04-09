const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const {readdirSync} = require('fs');
const webpush = require('web-push');
require("dotenv").config();
const path = require("path");
const Lead = require('./models/lead');
const bodyParser = require("body-parser")

const app = express();

mongoose.set('strictQuery', false); 
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("DB Connessoo!"))
  .catch((err) => console.log("DB Connection Error ", err));

  app.use(express.static(path.join(__dirname, 'client', 'public')));
  app.use(bodyParser.urlencoded({ extended: true }));

 const publicVapidKey = "BA4JFmsO2AigZr9o4BH8lqQerqz2NKytP2nsxOcHIKbl5g98kbOzLECvxXYrQyMTfV_W7sHTUG6_GuWtTzwLlCw";
 const privateVapidKey = "f33Ot0HGNfYCJRR69tW_LwRsbDQtS0Jk9Ya57l0XWQQ";

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.COMPARACORSI, process.env.APP_COMPARACORSI, "https://test-comparatore.netlify.app", "https://leadsystem-test.netlify.app", "https://cap.dentista-vicinoame.it", "http://localhost:3000"],
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

  const idsToRemove = leadDuplicate.map(lead => lead._id); // Ottieni gli ID delle lead duplicate
}
//checkLeadDoppie()

//deleteAllLeads();
const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
