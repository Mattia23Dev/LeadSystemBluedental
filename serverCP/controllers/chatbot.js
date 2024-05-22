const Lead = require("../models/lead");
const LeadChatbot = require("../models/leadChatbot");
const User = require("../models/user")
const cron = require('node-cron')
const axios = require('axios')
const moment = require('moment');
const Orientatore = require("../models/orientatori")
const LastLeadUser = require("../models/lastLeadUser");

function isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^(?:\+?39)?(?:\d{10})$/;
    return phoneRegex.test(phoneNumber);
  }

  function day10ago(dataV) {
    const data = moment(dataV, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (zz)');
  
    const dieciGiorniFa = moment().subtract(10, 'days');
  
    return data.isAfter(dieciGiorniFa);
  }

exports.saveLeadChatbotDentista = async (req, res) => {
  console.log(req.body);
  try {
    const {
      id,
      channel,
      full_name,
      first_name,
      last_name,
      email,
      phone,
      last_interaction,
      custom_fields
    } = req.body;

    let conversation_summary = '';
    let canale = '';
    let città = '';
    const specificField = custom_fields.find(field => field.id === '305667');
    const specificFieldApp = custom_fields.find(field => field.id === '579539');
    if (specificField && specificField.type === '0') {
      conversation_summary = specificField.value;
    }
    const specificFieldCitta = custom_fields.find(field => field.id === '401880');
    if (specificFieldCitta && specificFieldCitta.value) {
      città = specificFieldCitta.value;
    }
    const date = new Date(parseInt(last_interaction));
    const formattedDate = date.toLocaleString();

    let lead = await LeadChatbot.findOne({ idLead: id });

    let lastUserReceivedLead = null;
    const lastUserLeadData = await LastLeadUser.findOne({});
    if (lastUserLeadData) {
      lastUserReceivedLead = lastUserLeadData.userId;
    }

    const excludedOrientatoreIds = ['660fc6b59408391f561edc1a'];
    let users = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }, utente: "664c5b2f3055d6de1fcaa22b"});

    const lastUserId = lastUserReceivedLead;

    const lastIndex = users.findIndex(user => user?._id.toString() === lastUserId);

    let nextUserIndex = lastIndex + 1;
    if (lastIndex === -1 || nextUserIndex >= users.length) {
        nextUserIndex = 0;
    }

    const nextUser = users[nextUserIndex];

    if(channel === "5"){
      canale = "Whatsapp"
    }else if (channel === "0"){
      canale = "Messenger"
    }else if (channel === "8"){
      canale = "Telegram"
    }else {
      canale = "Nessuno"
    }

    let conditions = [
      { numeroTelefono: phone },
      {idLeadChatic: id},
    ];
    
    /*if (email && email.trim() !== "") {
      conditions.push({ email: email });
    }*/

 if (lead) {
      lead.channel = canale;
      lead.fullName = full_name;
      lead.nome = full_name;
      lead.cognome = last_name;
      lead.email = email;
      lead.numeroTelefono = phone;
      lead.last_interaction = formattedDate;
      lead.conversation_summary = conversation_summary;
      lead.appointment_date = specificFieldApp.value;

      await lead.save();
      console.log('Lead aggiornata con successo nel database!');
      if (città !== ''){
        const userId = '664c5b2f3055d6de1fcaa22b'; //'65d3110eccfb1c0ce51f7492'; JESSICA
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || "",
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser._id,
          utente: "664c5b2f3055d6de1fcaa22b", //'65d3110eccfb1c0ce51f7492'; JESSICA
          note: "",
          fatturato: "",
          utmContent: canale || "",
          utmAdset: canale || "",
          utmCampaign: 'AI chatbot',
          tentativiChiamata: '0',
          giàSpostato: false,
          idLeadChatic: id,
          appDate: specificFieldApp.value || "",
          summary: conversation_summary || "",
          last_interaction: formattedDate || "",
        });
        try {

          const existingLead = await Lead.findOne({ $or: conditions });

          if (!existingLead || (existingLead && day10ago(existingLead.data))) {
            if (!isValidPhoneNumber(phone)){
              console.log("Numero non valido")
              return
            }
            lead.assigned = true;
            await lead.save();
            await newLead.save();
            console.log(`Assegnato il lead ${lead.nome} all'utente Dentista`);
            await user.save();
          } else {
            console.log(`Già assegnato il lead ${lead.nome} all'utente Dentista`)
            if (!isValidPhoneNumber(phone)){
              console.log('Numero non valido')
              return
            }
            if(email !== ""){
              existingLead.email = email;
            };
            existingLead.summary = conversation_summary;
            existingLead.appDate = specificFieldApp.value;
            existingLead.numeroTelefono = phone;
            existingLead.nome = full_name;
            await existingLead.save()
            console.log('Lead aggiornato')
          }

        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
      }
    } else {
      lead = new LeadChatbot({
        data: new Date(),
        idLead: id,
        channel: canale,
        fullName: full_name,
        nome: full_name,
        cognome: last_name,
        email: email,
        numeroTelefono: phone,
        last_interaction: formattedDate,
        conversation_summary: conversation_summary,
        appointment_date: specificFieldApp.value,
        tag: "unusual",
      });

      await lead.save();
      console.log('Lead salvato con successo nel database!');
      if (città !== ''){
        const userId ='664c5b2f3055d6de1fcaa22b'; //'65d3110eccfb1c0ce51f7492'; JESSICA
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || '',
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser._id,
          utente: "664c5b2f3055d6de1fcaa22b", //'65d3110eccfb1c0ce51f7492'; JESSICA
          note: "",
          fatturato: "",
          utmContent: canale || "",
          utmAdset: canale || "",
          utmCampaign: 'AI chatbot',
          tentativiChiamata: '0',
          giàSpostato: false,
          idLeadChatic: id,
          appDate: specificFieldApp.value || "",
          summary: conversation_summary || "",
          last_interaction: formattedDate || "",
        });
        try {

          const existingLead = await Lead.findOne({ $or: conditions });

          if (!existingLead || (existingLead && day10ago(existingLead.data))) {
            if (!isValidPhoneNumber(phone)){
              console.log("Numero non valido")
              return
            }
            lead.assigned = true;
            await lead.save();
            await newLead.save();
            console.log(`Assegnato il lead ${lead.nome} all'utente Dentista`);
            await user.save();
          } else {
            console.log(`Già assegnato il lead ${lead.nome} all'utente Dentista`)
            if (!isValidPhoneNumber(phone)){
              return
            }
            if(email !== ""){
              existingLead.email = email;
            };
            existingLead.summary = conversation_summary;
            existingLead.appDate = specificFieldApp.value;
            existingLead.numeroTelefono = phone;
            existingLead.nome = full_name;
            await existingLead.save()
          }

        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
      }
    }

    res.status(200).json({ message: 'Successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error, message: 'Errore' });
  }
};