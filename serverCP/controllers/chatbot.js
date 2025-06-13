const Lead = require("../models/lead");
const LeadChatbot = require("../models/leadChatbot");
const User = require("../models/user")
const cron = require('node-cron')
const axios = require('axios')
const moment = require('moment');
const Orientatore = require("../models/orientatori")
const LastLeadUser = require("../models/lastLeadUser");

const flows = {
  daContattare: "1734106160819",
  fissato: "1734106194251",
  nonRisponde: "1734106232317",
}
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

function isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    // Rimuove eventuali spazi
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Verifica i diversi formati possibili:
    // 1. +39 seguito da 10 cifre
    // 2. + seguito da 10 cifre
    // 3. 39 seguito da 10 cifre
    // 4. 10 cifre semplici
    const patterns = [
        /^\+39\d{10}$/,  // +39 seguito da 10 cifre
        /^\+\d{10}$/,    // + seguito da 10 cifre
        /^39\d{10}$/,    // 39 seguito da 10 cifre
        /^\d{10}$/       // 10 cifre semplici
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
}

  function day10ago(dataV) {
    const datanuova = new Date(dataV);
    const data = moment(datanuova, 'ddd MMM DD YYYY HH:mm:ss');
    const dieciGiorniFa = moment().subtract(10, 'days');
    return data.isBefore(dieciGiorniFa);
  }

  function generatePhoneVariants(phoneNumber) {
    let variants = [];
  
    // Rimuove eventuali spazi o trattini
    phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
  
    const isItalianNumber = (number) => {
      if (number.startsWith('+39')) {
        return true;
      } else if (number.startsWith('39') && number.length == 12) {
        return true;
      }
      return false;
    };
  
    if (isItalianNumber(phoneNumber)) {
      // Numero normale
      variants.push(phoneNumber.slice(phoneNumber.startsWith('+39') ? 3 : 2));
      
      // Aggiunge variante con 39 davanti
      variants.push(phoneNumber.startsWith('+39') ? '39' + phoneNumber.slice(3) : phoneNumber);
      
      // Aggiunge variante con +39 davanti
      variants.push(phoneNumber.startsWith('+39') ? phoneNumber : '+39' + phoneNumber);
    } else {
      variants.push(phoneNumber);
  
      // Aggiunge variante con 39 davanti
      variants.push('39' + phoneNumber);
  
      // Aggiunge variante con +39 davanti
      variants.push('+39' + phoneNumber);
    }
  
    // Filtra eventuali duplicati
    variants = [...new Set(variants)];
  
    return variants;
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

    const randomIndex = Math.floor(Math.random() * users.length);
    const randomUser = users[randomIndex];

    if(channel === "5"){
      canale = "Whatsapp"
    }else if (channel === "0"){
      canale = "Messenger"
    }else if (channel === "8"){
      canale = "Telegram"
    }else {
      canale = "Nessuno"
    }

    let phoneVariants = generatePhoneVariants(phone);
  
    let conditions = {
      $or: [
        { numeroTelefono: { $in: phoneVariants } },
        { idLeadChatic: id }
      ]
    };
    
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
      lead.città = città;

      await lead.save();
      console.log('Lead aggiornata con successo nel database!');

      const userId = '65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || "",
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
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

          const mostRecentLead = await Lead.find(
            conditions,
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

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
        città: città,
        tag: "unusual",
      });

      await lead.save();
      console.log('Lead salvato con successo nel database!');

      const userId ='65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || '',
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
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

          const mostRecentLead = await Lead.find(
            conditions,
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

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
              console.log("Cell non valido")
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

    res.status(200).json({ message: 'Successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error, message: 'Errore' });
  }
};

exports.saveLeadChatbotDentistaNew = async (req, res) => {
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
    const specificField = custom_fields.find(field => field.id === '959203');
    const specificFieldApp = custom_fields.find(field => field.id === '940106');
    if (specificField && specificField.type === '0') {
      conversation_summary = specificField.value;
    }
    const specificFieldCitta = custom_fields.find(field => field.id === '534634');
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
    let users = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }, utente: "65d3110eccfb1c0ce51f7492"});

    const lastUserId = lastUserReceivedLead;

    const lastIndex = users.findIndex(user => user?._id.toString() === lastUserId);

    let nextUserIndex = lastIndex + 1;
    if (lastIndex === -1 || nextUserIndex >= users.length) {
        nextUserIndex = 0;
    }

    const nextUser = users[nextUserIndex];

    const randomIndex = Math.floor(Math.random() * users.length);
    const randomUser = users[randomIndex];

    if(channel === "5"){
      canale = "Whatsapp"
    }else if (channel === "0"){
      canale = "Messenger"
    }else if (channel === "8"){
      canale = "Telegram"
    }else {
      canale = "Nessuno"
    }

    let phoneVariants = generatePhoneVariants(phone);
  
    let conditions = [
      { numeroTelefono: { $in: phoneVariants } },
      { idLeadChatic: id }
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
      lead.città = città;

      await lead.save();
      console.log('Lead aggiornata con successo nel database!');

      const userId = '65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || "",
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
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

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

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
            /*await trigger({
              nome: newLead.nome,
              email: newLead.email,
              numeroTelefono: newLead.numeroTelefono,
              città: newLead.città,
              trattamento: newLead.trattamento,
              esito: "Da contattare",
            }, {
              nome: "Lorenzo",
              telefono: "3514871035",
            }, flows.daContattare)*/
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
        città: città,
        tag: "AI chatbot",
      });

      await lead.save();
      console.log('Lead salvato con successo nel database!');

      const userId ='65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'AI chatbot',
          esito: 'Da contattare',
          città: città || '',
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
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

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

          if (!existingLead || (existingLead && day10ago(existingLead.data))) {
            if (!isValidPhoneNumber(phone)){
              console.log("Numero non valido")
              return
            }
            lead.assigned = true;
            await lead.save();
            await newLead.save();
            /*await trigger({
              nome: newLead.nome,
              email: newLead.email,
              numeroTelefono: newLead.numeroTelefono,
              città: newLead.città,
              trattamento: newLead.trattamento,
              esito: "Da contattare",
            }, {
              nome: "Lorenzo",
              telefono: "3514871035",
            }, flows.daContattare)*/
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

    res.status(200).json({ message: 'Successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error, message: 'Errore' });
  }
};

exports.saveSomaLead = async (req, res) => {
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
      custom_fields,
      appointment_date
    } = req.body;

    let conversation_summary = '';
    let canale = '';
    let città = '';
    const specificField = custom_fields.find(field => field.id === '959203');
    const specificFieldApp = custom_fields.find(field => field.id === '940106');
    if (specificField && specificField.type === '0') {
      conversation_summary = specificField.value;
    }
    if (appointment_date && appointment_date !== "") {
      specificFieldApp.value = appointment_date;
    }
    const specificFieldCitta = custom_fields.find(field => field.id === '379546');
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
    let users = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }, utente: "65d3110eccfb1c0ce51f7492"});

    const lastUserId = lastUserReceivedLead;

    const lastIndex = users.findIndex(user => user?._id.toString() === lastUserId);

    let nextUserIndex = lastIndex + 1;
    if (lastIndex === -1 || nextUserIndex >= users.length) {
        nextUserIndex = 0;
    }

    const nextUser = users[nextUserIndex];

    const randomIndex = Math.floor(Math.random() * users.length);
    const randomUser = users[randomIndex];

    if(channel === "5"){
      canale = "Whatsapp"
    }else if (channel === "0"){
      canale = "Messenger"
    }else if (channel === "8"){
      canale = "Telegram"
    }else {
      canale = "Nessuno"
    }

    let phoneVariants = generatePhoneVariants(phone);
  
    let conditions = [
      { numeroTelefono: { $in: phoneVariants } },
      { idLeadChatic: id }
    ];
    
    /*if (email && email.trim() !== "") {
      conditions.push({ email: email });
    }*/

 /*if (lead) {
      lead.channel = canale;
      lead.fullName = full_name;
      lead.nome = full_name;
      lead.cognome = last_name;
      lead.email = email;
      lead.numeroTelefono = phone;
      lead.last_interaction = formattedDate;
      lead.conversation_summary = conversation_summary;
      lead.appointment_date = specificFieldApp.value;
      lead.città = città;

      await lead.save();
      console.log('Lead aggiornata con successo nel database!');

      const userId = '65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'SOMA',
          esito: 'Da contattare',
          città: città || "",
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
          note: "",
          fatturato: "",
          utmContent: canale || "",
          utmAdset: canale || "",
          utmCampaign: 'SOMA',
          tentativiChiamata: '0',
          giàSpostato: false,
          idLeadChatic: id,
          appDate: specificFieldApp.value || "",
          summary: conversation_summary || "",
          last_interaction: formattedDate || "",
        });
        try {

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

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
        città: città,
        tag: "SOMA",
      });

      await lead.save();
      console.log('Lead salvato con successo nel database!');

      const userId ='65d3110eccfb1c0ce51f7492'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phone || '',
          campagna: 'SOMA',
          esito: 'Da contattare',
          città: città || '',
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "65d3110eccfb1c0ce51f7492", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
          note: "",
          fatturato: "",
          utmContent: canale || "",
          utmAdset: canale || "",
          utmCampaign: 'SOMA',
          tentativiChiamata: '0',
          giàSpostato: false,
          idLeadChatic: id,
          appDate: specificFieldApp.value || "",
          summary: conversation_summary || "",
          last_interaction: formattedDate || "",
        });
        try {

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

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
    }*/

    res.status(200).json({ message: 'Successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error, message: 'Errore' });
  }
};

exports.saveLeadChatbotDentistaNewCallCenter = async (req, res) => {
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
    let esito = '';
    const specificFieldEsito = custom_fields.find(field => field.id === '317146');
    if (specificFieldEsito && specificFieldEsito.value) {
      esito = specificFieldEsito.value;
    }
    const specificField = custom_fields.find(field => field.id === '959203');
    const specificFieldApp = custom_fields.find(field => field.id === '940106');
    if (specificField && specificField.type === '0') {
      conversation_summary = specificField.value;
    }
    const specificFieldCitta = custom_fields.find(field => field.id === '534634');
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

    const randomIndex = Math.floor(Math.random() * users.length);
    const randomUser = users[randomIndex];

    if(channel === "5"){
      canale = "Whatsapp"
    }else if (channel === "0"){
      canale = "Messenger"
    }else if (channel === "8"){
      canale = "Telegram"
    }else {
      canale = "Nessuno"
    }

    let phoneFormatted = phone;

    if (phone.startsWith('+') && phone.length === 11) {
      phoneFormatted = phone.slice(1);
    }

    let phoneVariants = generatePhoneVariants(phoneFormatted);
  
    let conditions = [
      { numeroTelefono: { $in: phoneVariants } },
      { idLeadChatic: id }
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
      lead.numeroTelefono = phoneFormatted;
      lead.last_interaction = formattedDate;
      lead.conversation_summary = conversation_summary;
      lead.appointment_date = specificFieldApp.value;
      lead.città = città;

      await lead.save();
      console.log('Lead aggiornata con successo nel database!');

      const userId = '664c5b2f3055d6de1fcaa22b'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phoneFormatted || '',
          campagna: 'SOMA',
          esito: specificFieldApp.value && specificFieldApp.value !== "" ? "Appuntamento" : 'Da contattare',
          città: città || "",
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "664c5b2f3055d6de1fcaa22b", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
          note: "",
          fatturato: "",
          utmContent: canale || "",
          utmAdset: canale || "",
          utmCampaign: 'SOMA',
          tentativiChiamata: '0',
          giàSpostato: false,
          idLeadChatic: id,
          appDate: specificFieldApp.value || "",
          summary: conversation_summary || "",
          last_interaction: formattedDate || "",
        });
        try {

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

          if (!existingLead || (existingLead && day10ago(existingLead.data))) {
            if (!isValidPhoneNumber(phoneFormatted)){
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
            if (!isValidPhoneNumber(phoneFormatted)){
              console.log('Numero non valido')
              return
            }
            if(email !== ""){
              existingLead.email = email;
            };
            existingLead.summary = conversation_summary;
            existingLead.appDate = specificFieldApp.value;
            if (specificFieldApp.value && specificFieldApp.value !== "" && existingLead.esito !== "Fissato"){
              existingLead.esito = "Appuntamento";
            }
            if (esito && esito === "Annullato"){
              existingLead.esito = "Annullato";
            }
            if (esito && esito === "Lead persa"){
              existingLead.esito = "Non interessato";
            }
            existingLead.numeroTelefono = phoneFormatted;
            existingLead.nome = full_name;
            await existingLead.save()
            console.log('Lead aggiornato')
          }

        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
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
        numeroTelefono: phoneFormatted,
        last_interaction: formattedDate,
        conversation_summary: conversation_summary,
        appointment_date: specificFieldApp.value,
        città: città,
        tag: "unusual",
      });

      await lead.save();
      console.log('Lead salvato con successo nel database!');

      const userId ='664c5b2f3055d6de1fcaa22b'; //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
        let user = await User.findById(userId);
        const newLead = new Lead({
          data: new Date(),
          dataTimestamp: new Date(),
          nome: full_name,
          email: email || '',
          numeroTelefono: phoneFormatted || '',
          campagna: 'AI chatbot',
          esito: specificFieldApp.value && specificFieldApp.value !== "" ? "Appuntamento" : 'Da contattare',
          città: città || '',
          trattamento: "Implantologia per singolo dente",
          orientatori: nextUser ? nextUser._id : randomUser._id,
          utente: "664c5b2f3055d6de1fcaa22b", //'664c5b2f3055d6de1fcaa22b'; CALL CENTER
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

          const mostRecentLead = await Lead.find(
            { $or: conditions },
          );
          mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
          const existingLead = mostRecentLead[0];

          if (!existingLead || (existingLead && day10ago(existingLead.data))) {
            if (!isValidPhoneNumber(phoneFormatted)){
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
            if (!isValidPhoneNumber(phoneFormatted)){
              return
            }
            if(email !== ""){
              existingLead.email = email;
            };
            existingLead.summary = conversation_summary;
            existingLead.appDate = specificFieldApp.value;
            if (specificFieldApp.value && specificFieldApp.value !== "" && existingLead.esito !== "Fissato"){
              existingLead.esito = "Appuntamento";
            }
            existingLead.numeroTelefono = phoneFormatted;
            existingLead.nome = full_name;
            await existingLead.save()
          }

        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
    }

    res.status(200).json({ message: 'Successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error, message: 'Errore' });
  }
};

const funzione = async () => {
  try {
    const phone = "+393898719009"
    let phoneVariants = generatePhoneVariants(phone)
    let conditions = {
      $or: [
      { numeroTelefono: { $in: phoneVariants } },
      {idLeadChatic: "8032942406750263"},
      ]
    };
    const mostRecentLead = await Lead.find(
      conditions,
    );
    mostRecentLead.sort((a, b) => new Date(b.data) - new Date(a.data));
    const existingLead = mostRecentLead[0];

    console.log(existingLead)
    if (!existingLead || (existingLead && day10ago(existingLead.data))) {
      console.log(`Assegnato all'utente Dentista`);
    } else {
      console.log(`Già assegnato all'utente Dentista`)
    }
  } catch (error) {
    console.error(error)
  }
}
//funzione()