const nodemailer = require('nodemailer');
require('dotenv').config();

exports.sendEmail = async (req, res) => {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_GMAIL,
        pass: process.env.PASS_GMAIL,
      }
    });
  
    const mailOptions = {
      from: process.env.EMAIL_GMAIL,
      to: "mattianoris.business@gmail.com",
      subject: 'Assistenza - Modulo di contatto',
      html: `
        <p>Ciao,</p>
        <p>Hai ricevuto un nuovo messaggio di assistenza dal modulo di contatto.</p>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Messaggio:</strong> ${message}</p>
        <p>Grazie,</p>
        <p>Il tuo team di assistenza</p>
      `
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  };

  exports.sendMailConfirmPayment = (userEmail, leadCount) => {

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_GMAIL,
        pass: process.env.PASS_GMAIL,
      }
    });
    const message = `Elaboreremo la tua richiesta il prima possibile.`;
    const subject = "Pagamento ricevuto";
  
    const mailOptions = {
      from: process.env.EMAIL_GMAIL,
      to: userEmail,
      subject: subject,
      html: `
        <p>Ciao,</p>
        <p>Abbiamo ricevuto il tuo acquisto per ${leadCount} lead</p>
        <p>${message}</p>
        <p>Grazie,</p>
        <p>Il tuo team di Multiversity</p>
      `
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  };  

  exports.sendMailLeadInsufficienti = (userEmail, leadCount) => {

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_GMAIL,
        pass: process.env.PASS_GMAIL,
      }
    });
    const message = `Siamo spiacenti, ma non ci sono abbastanza lead disponibili.`;
    const subject = "Lead Insufficienti";
  
    const mailOptions = {
      from: process.env.EMAIL_GMAIL,
      to: userEmail,
      subject: subject,
      html: `
        <p>Ciao,</p>
        <p>Abbiamo ricevuto il tuo acquisto. Sfortunatamente i lead nel database sono inferiori a quelli richiesti.
        Ti preghiamo di attendere qualche giorno per ricevere ${leadCount} lead</p>
        <p><strong>Messaggio:</strong> ${message}</p>
        <p>Grazie,</p>
        <p>Il tuo team di Multiversity</p>
      `
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  };

  exports.sendEmailNewLead = async (userEmail, userName) => {
    const transporter = nodemailer.createTransport({
      host: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_GMAIL,
        pass: process.env.PASS_GMAIL,
      }
    });
  
    const subject = "Sono arrivate nuove lead!";
    const message = 'Lavorale appena puoi!';
    const message2 = 'Il tuo ruolo è fondamentale per guidare i tuoi amici nonché futuri studenti verso la scelta del loro percorso universitario ideale. Proprio perché crediamo che il consiglio di un amico valga più di tutto, ti ricordiamo che per ogni amico che si iscriverà tramite il tuo link, tu riceverai un buono Amazon di 75€ e il tuo amico di 50€.';
  
    const mailOptions = {
      from: "info@comparacorsi.it",
      to: userEmail,
      subject: subject,
      html: `
      <!doctype html>
        <html>
          <head>
            <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
              body {
                font-family: 'Poppins', sans-serif;
                background-color: #ffffff !important;
              }
              .container {
                background-color: #ffffff !important;
                padding: 0px;
                border-radius: 10px;
                margin: 20px;
              }
              .container > img {
                width: 50%;
                height: auto;
                background-color: transparent;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #333333;
              }
              .message {
                font-size: 16px;
                color: #555555;
                margin-top: 10px;
              }
              p{
                color: #555555;
              }
              li{
                color: #555555;
              }
              .footer{
                text-align: center;
                color: black;
                padding: 20px;
                font-family: 'Poppins', sans-serif;
              }
              .dati{
                font-size: 12px;
              }
              .footer img {
                width: 30%;
                height: auto; 
              }
              
              .footer-buttons {
                display: flex;
                margin-top: 10px;
                justify-content: center;
                align-items: center;
                gap: 15px;
              }
              
              .footer-buttons a {
                text-decoration: none;
                margin-left: 15px;
              }
              
              .line {
                border-top: 1px solid #555555;
                margin: 20px 0;
              }
              
              .footer-links {
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
              }
              
              .footer-links a {
                color: black;
                text-decoration: none;
                margin: 0 10px; 
                font-size: 12px;
              }
              
              /* Per email mobile */
              @media only screen and (max-width: 767px) {
                .container img::first-of-type {
                  width: 90%;
                }
                .footer img {
                  width: 60%
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src='https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png' alt='comparacorsi' />
              <p class="title">Ciao ${userName},</p>
              <p class="message">${message}</p>
              <p class="message"><i>Il Team di ComparaCorsi</i></p>
              <div class='footer'>
                <img src="https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png" alt="logo" border="0">
                <h2>Trova il <b>corso <font color='#f47140'>online</font></b> su misura per te!</h2>
                <p class='dati'>Funnel Consulting s.r.l
                Partitiva IVA 15214991000
                Via C. Ferrero di Cambiano 91, 00191
                Roma<p/>
              </div>
              <div class='line'></div>
              <div class='footer-links'>
                <a href='https://www.comparacorsi.it/privacy-policy2/'>Termini e condizioni</a>
                <a href='https://www.iubenda.com/termini-e-condizioni/62720878'>Privacy Policy</a>
              </div>
            </div>
          </body>
        </html>
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  };

//https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_BIANCO.png
  exports.sendEmailAmbassador = async (userEmail, userName, link) => {
    const transporter = nodemailer.createTransport({
      host: 'mail.comparacorsi.it',
      port: 465,
      secure: true,
      auth: {
        user: "info@comparacorsi.it",
        pass: "x7t4Ej&j6Y9^",
      }
    });
  
    const subject = "Benvenuti Ambassadors di ComparaCorsi!";
    const message = 'Benvenuto nel programma Ambassador di ComparaCorsi! Ti abbiamo inviato il link da condividere ai tuoi amici su WhatsApp!';
    const message2 = 'Il tuo ruolo è fondamentale per guidare i tuoi amici nonché futuri studenti verso la scelta del loro percorso universitario ideale. Proprio perché crediamo che il consiglio di un amico valga più di tutto, ti ricordiamo che per ogni amico che si iscriverà tramite il tuo link, tu riceverai un buono Amazon di 75€ e il tuo amico di 50€.';
  
    const mailOptions = {
      from: "info@comparacorsi.it",
      to: userEmail,
      subject: subject,
      html: `
      <!doctype html>
        <html>
          <head>
            <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
              body {
                font-family: 'Poppins', sans-serif;
                background-color: #ffffff !important;
              }
              .container {
                background-color: #ffffff !important;
                padding: 0px;
                border-radius: 10px;
                margin: 20px;
              }
              .container > img {
                width: 50%;
                height: auto;
                background-color: transparent;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #333333;
              }
              .message {
                font-size: 16px;
                color: #555555;
                margin-top: 10px;
              }
              p{
                color: #555555;
              }
              li{
                color: #555555;
              }
              .footer{
                text-align: center;
                color: black;
                padding: 20px;
                font-family: 'Poppins', sans-serif;
              }
              .dati{
                font-size: 12px;
              }
              .footer img {
                width: 30%;
                height: auto; 
              }
              
              .footer-buttons {
                display: flex;
                margin-top: 10px;
                justify-content: center;
                align-items: center;
                gap: 15px;
              }
              
              .footer-buttons a {
                text-decoration: none;
                margin-left: 15px;
              }
              
              .line {
                border-top: 1px solid #555555;
                margin: 20px 0;
              }
              
              .footer-links {
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
              }
              
              .footer-links a {
                color: black;
                text-decoration: none;
                margin: 0 10px; 
                font-size: 12px;
              }
              
              /* Per email mobile */
              @media only screen and (max-width: 767px) {
                .container img::first-of-type {
                  width: 90%;
                }
                .footer img {
                  width: 60%
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src='https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png' alt='comparacorsi' />
              <p class="title">Ciao ${userName},</p>
              <p class="message">${message}</p>
              <p class='link'>${link}</p>
              <p>${message2}</p>
              <p class="message">Ecco come puoi fare la differenza:</p>
              <p class='message'>
              <b>Condividi la tua esperienza di iscrizione con ComparaCorsi</b>: Metti in luce come il supporto di tutor e orientatori abbia semplificato la tua scelta, aiutandoti a individuare il percorso universitario perfetto per te. Sottolinea il valore dell'assistenza personalizzata e racconta come questa ti abbia consentito di risparmiare tempo nella ricerca della facoltà più adatta e nelle pratiche burocratiche, mettendo in evidenza l'importanza di avere una guida esperta per orientare le tue decisioni.
              </p>
              <p class="message">Il tuo entusiasmo e i tuoi consigli autentici sono il cuore del nostro programma Ambassador.</p>
              <p class="message">Insieme, possiamo aiutare molti studenti a fare la scelta più giusta per le loro esigenze nel mondo della formazione online.</p>
              <p class="message">Grazie per essere diventato parte di questa avventura.</p>
              <p class="message"><i>Il Team di ComparaCorsi</i></p>
              <div class='footer'>
                <img src="https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png" alt="logo" border="0">
                <h2>Trova il <b>corso <font color='#f47140'>online</font></b> su misura per te!</h2>
                <p class='dati'>Funnel Consulting s.r.l
                Partitiva IVA 15214991000
                Via C. Ferrero di Cambiano 91, 00191
                Roma<p/>
              </div>
              <div class='line'></div>
              <div class='footer-links'>
                <a href='https://www.comparacorsi.it/privacy-policy2/'>Termini e condizioni</a>
                <a href='https://www.iubenda.com/termini-e-condizioni/62720878'>Privacy Policy</a>
              </div>
            </div>
          </body>
        </html>
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  };

  exports.sendEmailANoi = async (userEmail, userName, nomeLead, emailLead, telefonoLead, nomeAmb) => {

    const transporter = nodemailer.createTransport({
      host: 'mail.comparacorsi.it',
      port: 465,
      secure: true,
      auth: {
        user: "info@comparacorsi.it",
        pass: "x7t4Ej&j6Y9^",
      }
    });
    const message = `Daje ragazzi nuova lead MGM.`;
    const subject = "Nuova lead MGM";
  
    const mailOptions = {
      from: "info@comparacorsi.it",
      to: userEmail,
      subject: subject,
      html: `
      <!doctype html>
      <html>
        <head>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
          body {
            font-family: 'Poppins', sans-serif;
            background-color: #ffffff !important;
          }
          .container {
            background-color: #ffffff !important;
            padding: 0px;
            border-radius: 10px;
            margin: 20px;
          }
          .container > img {
            width: 50%;
            height: auto;
            background-color: transparent;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #333333;
          }
          .message {
            font-size: 16px;
            color: #555555;
            margin-top: 10px;
          }
          p{
            color: #555555;
          }
          li{
            color: #555555;
          }
          .footer{
            text-align: center;
            color: black;
            padding: 20px;
            font-family: 'Poppins', sans-serif;
          }
          .dati{
            font-size: 12px;
          }
          .footer img {
            width: 30%;
            height: auto; 
          }
          
          .footer-buttons {
            display: flex;
            margin-top: 10px;
            justify-content: center;
            align-items: center;
            gap: 15px;
          }
          
          .footer-buttons a {
            text-decoration: none;
            margin-left: 15px;
          }
          
          .line {
            border-top: 1px solid #555555;
            margin: 20px 0;
          }
          
          .footer-links {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          
          .footer-links a {
            color: black;
            text-decoration: none;
            margin: 0 10px; 
            font-size: 12px;
          }
          
          /* Per email mobile */
          @media only screen and (max-width: 767px) {
            .container img::first-of-type {
              width: 90%;
            }
            .footer img {
              width: 60%
            }
          }
          </style>
        </head>
        <body>
          <div class="container">
            <img src='https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png' alt='comparacorsi' />
            <p class="title">Ciao ${userName},</p>
            <p class="message">${message}</p>
            <p class='message'>È entrata una nuova lead “invitato” dall’MGM: ${nomeLead}, ${emailLead}, ${telefonoLead}</p>
            <p class='message'>Questa lead è stata invitata dall'iscritto ${nomeAmb} (Ambassador)</p>
            <p class="message"><i>Il Team di ComparaCorsi</i></p>
            <div class='footer'>
              <img src="https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png" alt="logo" border="0">
              <h2>Trova il <b>corso <font color='#f47140'>online</font></b> su misura per te!</h2>
              <p class='dati'>Funnel Consulting s.r.l
              Partitiva IVA 15214991000
              Via C. Ferrero di Cambiano 91, 00191
              Roma<p/>
            </div>
            <div class='line'></div>
            <div class='footer-links'>
              <a href='https://www.comparacorsi.it/privacy-policy2/'>Termini e condizioni</a>
              <a href='https://www.iubenda.com/termini-e-condizioni/62720878'>Privacy Policy</a>
            </div>
          </div>
        </body>
      </html>
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  }; 

  exports.sendEmailAllaLead = async (userEmail, userName, nameAmb) => {

    const transporter = nodemailer.createTransport({
      host: 'mail.comparacorsi.it',
      port: 465,
      secure: true,
      auth: {
        user: "info@comparacorsi.it",
        pass: "x7t4Ej&j6Y9^",
      }
    });
    const message = `Grazie per averci scelto per orientarti verso il futuro accademico e professionale che sognavi!`;
    const subject = "Benvenuto in ComparaCorsi, inizia ora il tuo viaggio verso il futuro!";
  
    const mailOptions = {
      from: "info@comparacorsi.it",
      to: userEmail,
      subject: subject,
      html: `
      <!doctype html>
      <html>
        <head>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
          body {
            font-family: 'Poppins', sans-serif;
            background-color: #ffffff !important;
          }
          .container {
            background-color: #ffffff !important;
            padding: 0px;
            border-radius: 10px;
            margin: 20px;
          }
          .container > img {
            width: 50%;
            height: auto;
            background-color: transparent;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #333333;
          }
          .message {
            font-size: 16px;
            color: #555555;
            margin-top: 10px;
          }
          p{
            color: #555555;
          }
          li{
            color: #555555;
          }
          .footer{
            text-align: center;
            color: black;
            padding: 20px;
            font-family: 'Poppins', sans-serif;
          }
          .dati{
            font-size: 12px;
          }
          .footer img {
            width: 30%;
            height: auto; 
          }
          
          .footer-buttons {
            display: flex;
            margin-top: 10px;
            justify-content: center;
            align-items: center;
            gap: 15px;
          }
          
          .footer-buttons a {
            text-decoration: none;
            margin-left: 15px;
          }
          
          .line {
            border-top: 1px solid #555555;
            margin: 20px 0;
          }
          
          .footer-links {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          
          .footer-links a {
            color: black;
            text-decoration: none;
            margin: 0 10px; 
            font-size: 12px;
          }
          
          /* Per email mobile */
          @media only screen and (max-width: 767px) {
            .container img::first-of-type {
              width: 90%;
            }
            .footer img {
              width: 60%
            }
          }
        </style>
        </head>
        <body>
          <div class="container">
            <img src='https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png' alt='comparacorsi' />
            <p class="title">Ciao ${userName}, sei stato invitato da ${nameAmb}</p>
            <p class="message">${message}</p>
            <p>Il nostro obiettivo è aiutarti a trovare l'università perfetta per le tue esigenze, analizzando insieme le tue passioni, le tue aspirazioni e le tue ambizioni.</p>
            <p class="message">Un orientatore di <b>ComparaCorsi</b> si metterà presto in contatto con te per discutere le tue opzioni e aiutarti a prendere la migliore decisione per il tuo futuro.</p>
            <p class='message'>Ti incoraggiamo a riflettere sui tuoi obiettivi accademici e professionali, per approfittare al meglio della nostra consulenza personalizzata durante il nostro incontro.</p>
            <p class='message'>Per ringraziarti della tua fiducia ti ricordo che alla tua avvenuta iscrizione, riceverai un Buono Amazon di 50€ </p>
            
            <p class="message">Benvenuto nella community di <b>ComparaCorsi!</b></p>
            <p class="message"><i>Il Team di ComparaCorsi</i></p>
            <div class='footer'>
              <img src="https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png" alt="logo" border="0">
              <h2>Trova il <b>corso <font color='#f47140'>online</font></b> su misura per te!</h2>
              <p class='dati'>Funnel Consulting s.r.l
              Partitiva IVA 15214991000
              Via C. Ferrero di Cambiano 91, 00191
              Roma<p/>
            </div>
            <div class='line'></div>
            <div class='footer-links'>
              <a href='https://www.comparacorsi.it/privacy-policy2/'>Termini e condizioni</a>
              <a href='https://www.iubenda.com/termini-e-condizioni/62720878'>Privacy Policy</a>
            </div>
          </div>
        </body>
      </html>
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  }; 

  exports.sendEmailSeErrore = async (userEmail, nomeCompleto, code, email, phone) => {

    const transporter = nodemailer.createTransport({
      host: 'mail.comparacorsi.it',
      port: 465,
      secure: true,
      auth: {
        user: "info@comparacorsi.it",
        pass: "x7t4Ej&j6Y9^",
      }
    });
    const subject = "ERRORE Lead Mgm";
  
    const mailOptions = {
      from: "info@comparacorsi.it",
      to: userEmail,
      subject: subject,
      html: `  
      <!doctype html>
      <html>
        <head>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
          body {
            font-family: 'Poppins', sans-serif;
            background-color: #ffffff !important;
          }
          .container {
            background-color: #ffffff !important;
            padding: 0px;
            border-radius: 10px;
            margin: 20px;
          }
          .container > img {
            width: 50%;
            height: auto;
            background-color: transparent;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #333333;
          }
          .message {
            font-size: 16px;
            color: #555555;
            margin-top: 10px;
          }
          p{
            color: #555555;
          }
          li{
            color: #555555;
          }
          .footer{
            text-align: center;
            color: black;
            padding: 20px;
            font-family: 'Poppins', sans-serif;
          }
          .dati{
            font-size: 12px;
          }
          .footer img {
            width: 30%;
            height: auto; 
          }
          
          .footer-buttons {
            display: flex;
            margin-top: 10px;
            justify-content: center;
            align-items: center;
            gap: 15px;
          }
          
          .footer-buttons a {
            text-decoration: none;
            margin-left: 15px;
          }
          
          .line {
            border-top: 1px solid #555555;
            margin: 20px 0;
          }
          
          .footer-links {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          
          .footer-links a {
            color: black;
            text-decoration: none;
            margin: 0 10px; 
            font-size: 12px;
          }
          
          /* Per email mobile */
          @media only screen and (max-width: 767px) {
            .container img::first-of-type {
              width: 90%;
            }
            .footer img {
              width: 60%
            }
          }
        </style>
        </head>
        <body>
          <div class="container">
            <img src='https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png' alt='comparacorsi' />
            <p class="title">Ciao,</p>
            <p class="message">Ragazzi purtroppo qualcosa è andato storto</p>
            <p>Lead: ${nomeCompleto}, ${email}, ${phone}</p>
            <p>Codice: ${code}</p>
            <p class="message">Non è riuscito ad entrare nel elad system</p>
            <p class='message'><b>CONTROLLATE!</b></p>
            <p class="message"><i>Il Team di ComparaCorsi</i></p>
            <div class='footer'>
              <img src="https://www.comparacorsi.it/wp-content/uploads/2022/03/LOGO_COMPARA_CORSI_COLOR.png" alt="logo" border="0">
              <h2>Trova il <b>corso <font color='#f47140'>online</font></b> su misura per te!</h2>
              <p class='dati'>Funnel Consulting s.r.l
              Partitiva IVA 15214991000
              Via C. Ferrero di Cambiano 91, 00191
              Roma<p/>
            </div>
            <div class='line'></div>
            <div class='footer-links'>
              <a href='https://www.comparacorsi.it/privacy-policy2/'>Termini e condizioni</a>
              <a href='https://www.iubenda.com/termini-e-condizioni/62720878'>Privacy Policy</a>
            </div>
          </div>
        </body>
      </html>   
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Si è verificato un errore durante l\'invio dell\'email.');
      } else {
        console.log('Email inviata: ' + info.response);
        res.status(200).send('Grazie per averci contattato. Ti risponderemo il prima possibile.');
      }
    });
  }; 

 const sendEmailTemplateMarketing = async (leadEmail, leadName) => {

    const transporter = nodemailer.createTransport({
      host: 'mail.dentista-vicinoame.it',
      port: 465,
      secure: true,
      auth: {
        user: "info@dentista-vicinoame.it",
        pass: "9HPkxLx4m32xX94",
      }
    });
    const subject = "Il tuo impianto dentale ha un rigetto";
  
    const mailOptions = {
      from: "info@dentista-vicinoame.it",
      to: leadEmail,
      subject: subject,
      html: `
      <!doctype html>
      <html>
        <head>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap');
          body {
            font-family: 'Poppins', sans-serif !important;
            background-color: #ffffff !important;
          }
          .container {
            background-color: #ffffff !important;
            padding: 0px;
            border-radius: 10px;
            margin: 20px;
          }
          .button{
            padding: 10px;
            background-color: #1B4A58;
            color: #fff !important;
            border-radius: 20px;
            text-decoration: none;
            margin-top: 30px;
            margin-bottom: 30px;
            font-weight: bold;
          }
          .container > img {
            width: 50%;
            height: auto;
            background-color: transparent;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #333333;
          }
          .message {
            font-size: 16px;
            color: #555555;
            margin-top: 10px;
          }
          p{
            color: #555555;
          }
          li{
            color: #555555;
          }
          .footer{
            text-align: center;
            color: black;
            padding: 20px;
            font-family: 'Poppins', sans-serif;
          }
          .dati{
            font-size: 12px;
          }
          .footer img {
            width: 30%;
            height: auto; 
          }
          
          .line {
            border-top: 1px solid #555555;
            margin: 20px 0;
          }
          
          .footer-links {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .footer-links2 {
            display: flex;
            justify-content: center;
            margin: 0 auto;
            margin-bottom: 20px;
            align-items: center;
          }
          
          .footer-links a {
            color: black;
            text-decoration: none;
            margin: 0 10px; 
            font-size: 12px;
          }
          .footer-links2 a {
            color: black;
            text-decoration: none;
            margin: 0 auto; 
            font-size: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 50px;
          }
          .footer-links2 > a > img {
            width: 50px;
          }
          
          /* Per email mobile */
          @media only screen and (max-width: 767px) {
            .container img::first-of-type {
              width: 90%;
            }
            .footer img {
              width: 60%
            }
          }
          </style>
        </head>
        <body>
          <div class="container">
            <img src='https://www.comparacorsi.it/wp-content/uploads/2024/03/comparadentisti_logo_Tavola-disegno-1-copia-3.png' alt='dentista vicino a me' />
            <p class="title">Buongiorno ${leadName},</p>
            <p class="message">Sono Lucia di Dentistavicinoame, abbiamo ricevuto la tua richiesta per ricevere maggiori informazioni per un impianto dentale.</p>
            <p class="message">Noi siamo un servizio che mette in contatto i pazienti con i dentisti sul territorio. Cerchiamo di orientarvi verso il dentista più vicino a voi e più in linea con le vostre esigenze.</p>
            <p class="message">Ho provato a chiamarla, ma il numero di telefono che ci ha fornito è errato.<br />
            Se ancora le interessa, cliccando qui sotto e fornendoci il numero corretto la farò chiamare da uno specialista.</p>
            <p class="message">Le ricordo che la prima visita è totalmente gratuita e che abbiamo stipulato degli accordi che permettono ai nostri utenti di accedere a pagamenti agevolati e personalizzati.</p>
            <br /><br />
            <a class='button' href="https://leadsystembluedental-production.up.railway.app/email-marketing?leadEmail=${leadEmail}&leadName=${leadName}">Voglio parlare con uno specialista</a>
            <br /><br /><br />
            <p class="message">A presto, <br />Lucia
            </p>
          </div>
        </body>
      </html>
      `
    };
  
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Email inviata: ' + info.response);
      }
    });
  };

    const emailtosend = [
      { email: "carlopintus91@gmail.com", nome: "Carlopintus" },
      { email: "marinellacorda@gmail.com", nome: "marinella Corda" },
      { email: "elvrenz@gmail.com", nome: "Elvezia Renzi" },
      { email: "fiorenzaventurini@libero.it", nome: "Fiorenza Venturini" },
      { email: "luigileonardis89@gmail.com", nome: "Luigi Leonardis" },
      { email: "sebastianogiarrusso@virgilio.it", nome: "Sebastiano Giarrusso" },
      { email: "angelinivito02@gmail.com", nome: "Vito" },
      { email: "reberpereira@hotmail.com", nome: "Mariajose Pereirareber" },
      { email: "msn.hichem.ismail1967@gmail.com", nome: "Hichem Ismail" },
      { email: "arnold.putzer1969@gmail.com", nome: "Noldi Noldi" },
      { email: "mariotalone1986@gmail.com", nome: "Mario Talone" },
      { email: "soliman.lucia57@gmail.com", nome: "Soliman Lucia" },
      { email: "boschettigiovanni@hotmail.it", nome: "Boschetti Giovanni" },
      { email: "ioana_991@yahoo.com", nome: "Stanga Ioana" },
      { email: "dolcettiritaemanuela@gmail.com", nome: "Emanuela Roberta Dolci" },
      { email: "cateesposit123@gmail.com", nome: "Alberto Esposito" },
      { email: "Mollajori83@gmail.com", nome: "Orieta Mollaj" },
      { email: "vivianacruz24@hotmail.com", nome: "Viviana M Cruz" },
      { email: "flurim.haliti1970@gmail.com", nome: "Flurim Haliti" },
      { email: "patriziamiduri3@gmail.com", nome: "Patrizia Miduri" },
      { email: "eufemia63@hotmail.it", nome: "Eufemia" },
      { email: "cinziabuson05@gmail.com", nome: "Cinzia" },
      { email: "antoninisandra8@gmail.com", nome: "Antonini Sandra" },
      { email: "lagoiagiovanni@gmail.com", nome: "Giovanni" },
      { email: "adelaidevacca7@gmail.com", nome: "Adelaide" },
      { email: "famiglietti@live.it", nome: "Antonio Famiglietti" },
      { email: "umberta.ballo@gmail.com", nome: "Umberta" },
      { email: "adiladedic42@gmail.com", nome: "Adila Dedic" },
      { email: "gasparecalvaruso@yahoo.it", nome: "Gaspare Calvaruso" },
      { email: "mario59mir@gmail.com", nome: "Mario" },
      { email: "catevergari60@virgilio.it", nome: "Caterina Vergari" },
      { email: "massoneenrica4@gmail.com", nome: "Enrica" },
      { email: "monica.appolloni3@gmail.com", nome: "Monica" },
      { email: "justa2626@outlook.it", nome: "Justa janeth Cuero" },
      { email: "dzellat@libero.it", nome: "Tambino Africa" },
      { email: "epripila@gmail.com", nome: "Elena Pripila" },
      { email: "jiscanuviorel717@gmail.com", nome: "Viorel Jiscanu" },
      { email: "sanna.valeria3@gmail.com", nome: "Sanna Valeria" },
      { email: "marinrsarasato@gmail.com", nome: "Marina scarsato" },
      { email: "rotagraziella90@gmail.com", nome: "Graziella" },
      { email: "antoniolibertini1948@gmail.com", nome: "Antonio" },
      { email: "lambertolinari@gmail.com", nome: "Lamberto" },
      { email: "i.verdianacilona@gmail.com", nome: "Verdiana Cilona" },
      { email: "lorenabasiglio@gmail.com", nome: "Lorena" },
  ]
  const GetSheetEmailMarketing = async () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); 
    const year = today.getFullYear();
  
    const formattedDate = `${day}/${month}/${year}`;
    try {
      for (const { email, nome } of emailtosend) {
        try {
            await sendEmailTemplateMarketing(email, nome);
        } catch (error) {
            console.error(error)
        }
    }
    } catch (error) {
      console.log(error)
    }
  }
  //GetSheetEmailMarketing()
  //sendEmailTemplateMarketing("mattianoris23@gmail.com", "Francesca");

