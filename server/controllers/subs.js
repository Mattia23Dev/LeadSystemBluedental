const User = require('../models/user');
const LeadFacebook = require('../models/leadFacebook');
const LeadWordpress = require("../models/leadWordpress");
const Lead = require('../models/lead');
var cron = require('node-cron');
const { sendEmailLeadArrivati } = require('../middlewares');
const { getDentistaLead, getTagLeads, getTagLeads2, getDentistaLead2, getDentistaLead3, getBludentalLead, getThlLead1, getThlLead2 } = require('./Facebook');
const Orientatore = require('../models/orientatori');
const LastLeadUser = require('../models/lastLeadUser');
const axios = require('axios')

let lastUserReceivedLead = null;
function filterOldLeads(leads) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  return leads.filter(lead => new Date(lead.data) < fourteenDaysAgo);
}

const trigger = (lead, orientatore) => {
  const url = 'https://app.chaticmedia.com/api/users';

const data = {
  phone: lead?.numeroTelefono,
  email: lead?.email,
  first_name: lead?.nome,
  last_name: lead?.nome,
  full_name: lead?.nome,
  gender: "male",
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
      field_name: "Numero Operatore",
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

const calculateAndAssignLeadsEveryDay = async () => {
  try {
    //const excludedOrientatoreIds = ['660fc6b59408391f561edc1a'];

    let users = await Orientatore.find({ 
      //_id: { $nin: excludedOrientatoreIds }, 
      utente: "65d3110eccfb1c0ce51f7492",
      daAssegnare: true,
    });
    console.log(users.length)
    let leads = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      $and: [
        { name: { $not: { $regex: /Meta Web/, $options: 'i' } } },
        { name: { $not: { $regex: /ESTETICA/, $options: 'i' } } }
      ] // 'i' per ignorare il case sensitivity
    }).limit(100);
    const totalLeads = leads.length;
    console.log('Iscrizioni:', totalLeads);
    console.log( 'Utenti:'+ users.length);

    if (totalLeads === 0) {
      console.log('Nessun lead disponibile');
      return;
    }

    const lastUserLeadData = await LastLeadUser.findOne({});
    if (lastUserLeadData) {
      lastUserReceivedLead = lastUserLeadData.userId;
    }

    let userIndex = 0;

    const lastUser = lastUserReceivedLead && users.find(user => user?._id.toString() === lastUserReceivedLead.toString());

    if (!lastUser) {
      userIndex = 0;
    } else {
        userIndex = users.indexOf(lastUser) + 1;
    }
    while (leads.length > 0) {
      const user = users[userIndex % users.length]; //users[userIndex && userIndex < 11 ? userIndex : 0];
      const leadsNeeded = Math.min(leads.length, 1); //Math.min(user.monthlyLeadCounter, 1);

      if (leadsNeeded === 0) {
        console.log(`Il contatore mensile dell'utente ${user.nameECP} è insufficiente. Non vengono assegnati ulteriori lead.`);
        userIndex++;
        continue;
      }

      if (!user) {
        console.error('Nessun utente disponibile per l\'indice', userIndex);
        continue;
      }

      const leadsForUser = leads.splice(0, leadsNeeded);

      for (const leadWithoutUser of leadsForUser) {
        if (leadWithoutUser.assigned) {
          console.log(`Il lead ${leadWithoutUser?._id} è già stato assegnato.`);
          continue;
        }

        const userData = {
          first_name: "",
          email: "",
          phone_number: "",
          trattamento: "",
          città: '',
          quando: "",
        };

        for (const field of leadWithoutUser.fieldData) {
          if (field.name === "full_name") {
            userData.first_name = field.values[0];
          } else if (field.name === "email" || field.name === "e-mail") {
            userData.email = field.values[0];
          } else if (field.name === "phone_number") {
            userData.phone_number = field.values[0];
          } else if (field.name === "seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni" || field.name === "tipo_di_trattamento_"){
            userData.trattamento = field.values[0].replace(/_/g, " ");
          } else if ( field.name == "seleziona_il_centro_più_vicino_a_te" ){
            userData.città = field.values[0].replace(/_/g, " ");
          } else if (field.name == "quando_preferiresti_essere_contattata?_"){
            userData.quando = field.values[0];
          }
        }

        const newLead = new Lead({
          data: new Date(),
          nome: userData.first_name,
          email: userData.email,
          numeroTelefono: userData.phone_number,
          campagna: 'Social',
          città: userData.città ? userData.città : '',
          trattamento: userData.trattamento ? userData.trattamento : 'Implantologia a carico immediato',
          esito: "Da contattare",
          orientatori: user._id,
          utente: "65d3110eccfb1c0ce51f7492",
          note: "",
          fatturato: "",
          utmContent: leadWithoutUser.annunci ? leadWithoutUser.annunci : '',
          utmAdset: leadWithoutUser.adsets ? leadWithoutUser.adsets : '',
          utmCampaign: leadWithoutUser.name ? leadWithoutUser.name : '',
          tentativiChiamata: '0',
          giàSpostato: false,
        });

        const leadsVerify = await Lead.find({
          $or: [
            { email: userData.email.trim().toLowerCase() },
            { phone: userData.phone_number },
          ]
        });

        try {
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length > 0)){
            await newLead.save();
            //await trigger(newLead, user)
            lastUserReceivedLead = user?._id;
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);

            console.log(`Assegnato il lead ${leadWithoutUser?._id} all'utente ${user.nome}`);            
          } else {
            //await trigger(newLead, user)
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);

            console.log(`Già assegnato il lead ${leadWithoutUser?._id}`);               
          }
        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }

        const leadIndex = leads.findIndex(lead => lead._id.toString() === leadWithoutUser._id.toString());
        if (leadIndex !== -1) {
          leads.splice(leadIndex, 1);
        }
      }

      userIndex++;
      if (userIndex >= users.length) {
        userIndex = 0;
      }
    }

    if (totalLeads === 0) {
      console.log('LeadFacebook terminati prima che tutti gli utenti abbiano il contatore a 0');
    }
    if (lastUserReceivedLead == null || lastUserReceivedLead == undefined) {
      await LastLeadUser.findOneAndUpdate({}, { userId: '65ddbe8676b468245d701bc2' }, { upsert: true });
    } else {
       await LastLeadUser.findOneAndUpdate({}, { userId: lastUserReceivedLead }, { upsert: true });
    }

  } catch (error) {
    console.log(error.message);
  }
};

const calculateAndAssignLeadsEveryDayEstetica = async () => {
  try {
    const orientatoreId = "65ddbe8676b468245d701bc2"
    let users = await Orientatore.findById(orientatoreId);
    let leads = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $regex: /ESTETICA/, $options: 'i' }
    }).limit(50);
    const totalLeads = leads.length;
    console.log('Iscrizioni:', totalLeads);

    if (totalLeads === 0) {
      console.log('Nessun lead disponibile');
      return;
    }

      for (const leadWithoutUser of leads) {
        if (leadWithoutUser.assigned) {
          console.log(`Il lead ${leadWithoutUser?._id} è già stato assegnato.`);
          continue;
        }

        const userData = {
          first_name: "",
          email: "",
          phone_number: "",
          trattamento: "",
          città: '',
          quando: "",
        };

        for (const field of leadWithoutUser.fieldData) {
          if (field.name === "full_name") {
            userData.first_name = field.values[0];
          } else if (field.name === "email" || field.name === "e-mail") {
            userData.email = field.values[0];
          } else if (field.name === "phone_number") {
            userData.phone_number = field.values[0];
          } else if (field.name === "seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni" || field.name === "tipo_di_trattamento_"){
            userData.trattamento = field.values[0].replace(/_/g, " ");
          } else if ( field.name == "seleziona_il_centro_più_vicino_a_te" ){
            userData.città = field.values[0].replace(/_/g, " ");
          } else if (field.name == "quando_preferiresti_essere_contattata?_"){
            userData.quando = field.values[0];
          }
        }

        const newLead = new Lead({
          data: new Date(),
          nome: userData.first_name,
          email: userData.email,
          numeroTelefono: userData.phone_number,
          campagna: 'Social',
          città: userData.città ? userData.città : '',
          trattamento: userData.trattamento ? userData.trattamento : 'Implantologia a carico immediato',
          esito: "Da contattare",
          orientatori: orientatoreId,
          utente: "65d3110eccfb1c0ce51f7492",
          note: "",
          fatturato: "",
          utmContent: leadWithoutUser.annunci ? leadWithoutUser.annunci : '',
          utmAdset: leadWithoutUser.adsets ? leadWithoutUser.adsets : '',
          utmCampaign: leadWithoutUser.name ? leadWithoutUser.name : '',
          tentativiChiamata: '0',
          giàSpostato: false,
        });

        const leadsVerify = await Lead.find({
          $or: [
            { email: userData.email.trim().toLowerCase() },
            { phone: userData.phone_number },
          ]
        });
        try {
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length > 0)){
            await newLead.save();
            await users.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            console.log(`Assegnato il lead ${leadWithoutUser?._id} all'utente ${users.nome}`);            
          } else {
            await users.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            console.log(`Già assegnato il lead ${leadWithoutUser?._id}`);               
          }
        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
      }

    if (totalLeads === 0) {
      console.log('LeadFacebook terminati prima che tutti gli utenti abbiano il contatore a 0');
    }
  } catch (error) {
    console.log(error.message);
  }
};

const calculateAndAssignLeadsEveryDayMetaWeb = async () => {
  try {
    const callCenter = "664c5b2f3055d6de1fcaa22b";
    const callCenterUser = await User.findById(callCenter)
    const bludental = "65d3110eccfb1c0ce51f7492";
    const excludedOrientatoreIds = ['660fc6b59408391f561edc1a'];

    let users = await Orientatore.find({ 
      //_id: { $nin: excludedOrientatoreIds }, 
      utente: "65d3110eccfb1c0ce51f7492",
      daAssegnare: true,
    });
    let leads = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $regex: /Meta Web/, $options: 'i' }
    }).limit(50);
    let leadsN = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $regex: /Meta Web/, $options: 'i' }
    });
    
    const totalLeads = leads.length;
    console.log('Iscrizioni:', leadsN.length);
    console.log( 'Utenti:'+ users.length);

    if (totalLeads === 0) {
      console.log('Nessun lead disponibile');
      return;
    }

    const leadsForCallCenterCount = Math.floor(totalLeads / 2);
    const leadsForBludentalCount = totalLeads - leadsForCallCenterCount;
    
    // Divide l'array di lead in due parti
    const leadsForCallCenter = leads.slice(0, leadsForCallCenterCount);
    let leadsForBludental = leads.slice(leadsForCallCenterCount);
    
    console.log(`Lead per Call Center: ${leadsForCallCenter.length}`);
    console.log(`Lead per Bludental: ${leadsForBludental.length}`);
    

    if (callCenterUser.dailyLead < callCenterUser.dailyCap){
      for (const lead of leadsForCallCenter) {
        if (lead.assigned) {
          console.log(`Il lead ${lead?._id} è già stato assegnato.`);
          continue;
        }

        const userData = {
          first_name: "",
          email: "",
          phone_number: "",
          trattamento: "",
          città: '',
          quando: "",
        };

        for (const field of lead.fieldData) {
          if (field.name === "full_name") {
            userData.first_name = field.values[0];
          } else if (field.name === "email" || field.name === "e-mail") {
            userData.email = field.values[0];
          } else if (field.name === "phone_number") {
            userData.phone_number = field.values[0];
          } else if (field.name === "seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni" || field.name === "tipo_di_trattamento_"){
            userData.trattamento = field.values[0].replace(/_/g, " ");
          } else if ( field.name == "seleziona_il_centro_più_vicino_a_te" ){
            userData.città = field.values[0].replace(/_/g, " ");
          } else if (field.name == "quando_preferiresti_essere_contattata?_"){
            userData.quando = field.values[0];
          }
        }

        const newLead = new Lead({
          data: new Date(),
          nome: userData.first_name,
          email: userData.email,
          numeroTelefono: userData.phone_number,
          campagna: 'Social',
          città: userData.città ? userData.città : '',
          trattamento: userData.trattamento ? userData.trattamento : 'Implantologia a carico immediato',
          esito: "Da contattare",
          orientatori: null,
          utente: callCenter,
          note: "",
          fatturato: "",
          utmContent: lead.annunci ? lead.annunci : '',
          utmAdset: lead.adsets ? lead.adsets : '',
          utmCampaign: lead.name ? lead.name : '',
          tentativiChiamata: '0',
          giàSpostato: false,
        });

        const leadsVerify = await Lead.find({
          $or: [
            { email: userData.email.trim().toLowerCase() },
            { phone: userData.phone_number },
          ]
        });
        try {
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length > 0)){
            await newLead.save();
            callCenterUser.dailyLead += 1;
            callCenterUser.save()
            //await trigger(newLead, user)

            lead.assigned = true;
            await lead.save();
            //await sendNotification(user._id);
            //await sendEmailLeadArrivati(user._id);

            console.log(`Assegnato il lead ${lead?._id} all'utente ${callCenterUser.name}`);            
          } else {
            callCenterUser.save()

            lead.assigned = true;
            await lead.save();

            console.log(`Già assegnato il lead ${lead?._id}`);   
          }
        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
      }      
    } else {
      leadsForBludental = leads;
    }

    const lastUserLeadData = await LastLeadUser.findOne({});
    if (lastUserLeadData) {
      lastUserReceivedLead = lastUserLeadData.userId;
    }

    let userIndex = 0;
    const lastUser = lastUserReceivedLead && users.find(user => user?._id.toString() === lastUserReceivedLead.toString());

    if (!lastUser) {
      userIndex = 0;
    } else {
        userIndex = users.indexOf(lastUser) + 1;
    }
    while (leadsForBludental.length > 0) {
      const user = users[userIndex % users.length]; //users[userIndex && userIndex < 11 ? userIndex : 0];
      const leadsNeeded = Math.min(leadsForBludental.length, 1); //Math.min(user.monthlyLeadCounter, 1);

      if (leadsNeeded === 0) {
        console.log(`Il contatore mensile dell'utente ${user.nameECP} è insufficiente. Non vengono assegnati ulteriori lead.`);
        userIndex++;
        continue;
      }

      if (!user) {
        console.error('Nessun utente disponibile per l\'indice', userIndex);
        continue;
      }

      const leadsForUser = leadsForBludental.splice(0, leadsNeeded);

      for (const leadWithoutUser of leadsForUser) {
        if (leadWithoutUser.assigned) {
          console.log(`Il lead ${leadWithoutUser?._id} è già stato assegnato.`);
          continue;
        }

        const userData = {
          first_name: "",
          email: "",
          phone_number: "",
          trattamento: "",
          città: '',
          quando: "",
        };

        for (const field of leadWithoutUser.fieldData) {
          if (field.name === "full_name") {
            userData.first_name = field.values[0];
          } else if (field.name === "email" || field.name === "e-mail") {
            userData.email = field.values[0];
          } else if (field.name === "phone_number") {
            userData.phone_number = field.values[0];
          } else if (field.name === "seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni" || field.name === "tipo_di_trattamento_"){
            userData.trattamento = field.values[0].replace(/_/g, " ");
          } else if ( field.name == "seleziona_il_centro_più_vicino_a_te" ){
            userData.città = field.values[0].replace(/_/g, " ");
          } else if (field.name == "quando_preferiresti_essere_contattata?_"){
            userData.quando = field.values[0];
          }
        }

        const newLead = new Lead({
          data: new Date(),
          nome: userData.first_name,
          email: userData.email,
          numeroTelefono: userData.phone_number,
          campagna: 'Social',
          città: userData.città ? userData.città : '',
          trattamento: userData.trattamento ? userData.trattamento : 'Implantologia a carico immediato',
          esito: "Da contattare",
          orientatori: user._id,
          utente: "65d3110eccfb1c0ce51f7492",
          note: "",
          fatturato: "",
          utmContent: leadWithoutUser.annunci ? leadWithoutUser.annunci : '',
          utmAdset: leadWithoutUser.adsets ? leadWithoutUser.adsets : '',
          utmCampaign: leadWithoutUser.name ? leadWithoutUser.name : '',
          tentativiChiamata: '0',
          giàSpostato: false,
        });

        const leadsVerify = await Lead.find({
          $or: [
            { email: userData.email.trim().toLowerCase() },
            { phone: userData.phone_number },
          ]
        });
        const leadesistenti = filterOldLeads(leadsVerify)
        try {
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length > 0)){
            await newLead.save();
            //await trigger(newLead, user)
            lastUserReceivedLead = user?._id;
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);

            console.log(`Assegnato il lead ${leadWithoutUser?._id} all'utente ${user.nome}`);            
          } else {
            //await trigger(newLead, user)
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);

            console.log(`Già assegnato il lead ${leadWithoutUser?._id}`);
          }
        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }

        const leadIndex = leadsForBludental.findIndex(lead => lead._id.toString() === leadWithoutUser._id.toString());
        if (leadIndex !== -1) {
          leadsForBludental.splice(leadIndex, 1);
        }
      }

      userIndex++;
      if (userIndex >= users.length) {
        userIndex = 0;
      }
    }

    if (totalLeads === 0) {
      console.log('LeadFacebook terminati prima che tutti gli utenti abbiano il contatore a 0');
    }
    if (lastUserReceivedLead == null || lastUserReceivedLead == undefined) {
      await LastLeadUser.findOneAndUpdate({}, { userId: '65ddbe8676b468245d701bc2' }, { upsert: true });
    } else {
       await LastLeadUser.findOneAndUpdate({}, { userId: lastUserReceivedLead }, { upsert: true });
    }

  } catch (error) {
    console.log(error.message);
  }
};

const calculateAndAssignLeadsEveryDayWordpressComparatore = async () => {
  try {
    const userId = '655f707143a59f06d5d4dc3b';
    let user = await User.findById(userId);
    let leads = await LeadWordpress.find({
      $or: [
        { assigned: false },
        { assigned: { $exists: false } },
      ],
      $and: [
        { $or: [{ 'campagna': 'comparatore' }, { 'campagna': 'chatbot' }]}
      ]
    });

    const totalLeads = leads.length;
    console.log('Lead Comparatore:', totalLeads);

    if (totalLeads === 0) {
      console.log('Nessun lead Comparatore disponibile');
      return;
    }

    if (user.monthlyLeadCounter == 0){
      console.log('Utente ha il comparatore a 0');
      return;
    }

    while (leads.length > 0 && user.monthlyLeadCounter > 0) {

      if (!user) {
        console.log('Utente ha il contatore a 0');
        break;
      }

      if (user.dailyCap !== undefined && user.dailyCap !== null) {
    
        if (user.dailyLead >= user.dailyCap) {
          console.log(`L'utente ${user.nameECP} ha raggiunto il dailyCap per oggi.`);
          break;
        }
      }

      const leadsNeeded = Math.min(user.monthlyLeadCounter, 1);

      if (leadsNeeded === 0) {
        console.log(`Il contatore mensile dell'utente ${user.nameECP} è insufficiente. Non vengono assegnati ulteriori lead.`);
        break;
      }

      const leadsForUser = leads.splice(0, leadsNeeded);

      for (const leadWithoutUser of leadsForUser) {
        if (leadWithoutUser.assigned == true) {
          console.log(`Il lead ${leadWithoutUser.nome} è già stato assegnato.`);
          continue;
        }

        const newLead = new Lead({
          data: new Date(),
          nome: leadWithoutUser.nome || '',
          cognome: leadWithoutUser.cognome || '',
          email: leadWithoutUser.email || '',
          numeroTelefono: leadWithoutUser.numeroTelefono || '',
          campagna: leadWithoutUser.campagna ? leadWithoutUser.campagna : '',
          corsoDiLaurea: leadWithoutUser.corsoDiLaurea || '',
          frequentiUni: leadWithoutUser.universita || false,
          lavoro: leadWithoutUser.lavoro || false,
          facolta: leadWithoutUser.facolta || "",
          oreStudio: leadWithoutUser.orario || "",
          esito: 'Da contattare',
          orientatori: null,
          utente: user._id,
          università: leadWithoutUser.università || '',
          provincia: leadWithoutUser.provincia || '',
          note: '',
          fatturato: '',
          utmCampaign: leadWithoutUser.utmCampaign || '',
          utmSource: leadWithoutUser.utmSource || '',
          utmContent: leadWithoutUser.utmContent || '',
          utmTerm: leadWithoutUser.utmTerm || '',
          utmAdgroup: leadWithoutUser.utmAdgroup || "",
          utmAdset: leadWithoutUser.utmAdset || "",
          categories: leadWithoutUser.categories || "",
          enrollmentTime: leadWithoutUser.enrollmentTime || "",
          budget: leadWithoutUser.budget || "",
          tipologiaCorso: leadWithoutUser.tipologiaCorso || "",
          leva: leadWithoutUser.leva || "",
        });

        try {
          leadWithoutUser.assigned = true;
          await leadWithoutUser.save();

          const leadsVerify = await Lead.find({});
          const existingLead = leadsVerify.find(
            (lead) =>
              lead.cognome === leadWithoutUser.cognome && lead.email === leadWithoutUser.email
          );

          if (!existingLead) {
            await newLead.save();
            console.log(`Assegnato il lead ${leadWithoutUser.cognome} all'utente con ID ${user.nameECP}`);
            user.monthlyLeadCounter -= 1;
            user.dailyLead += 1;
            await user.save();

            const leadIndex = leads.findIndex(lead => lead._id.toString() === leadWithoutUser._id.toString());
            if (leadIndex !== -1) {
              leads.splice(leadIndex, 1);
            }
          } else {
            console.log(`Già assegnato il lead ${leadWithoutUser.cognome} all'utente con ID ${user.nameECP}`)
            continue;
          }

        } catch (error) {
          console.log(`Errore nella validazione o salvataggio del lead: ${error.message}`);
        }
      }
    }

    if (totalLeads === 0) {
      console.log('Lead Comparatore terminati prima che utente abbia il contatore a 0');
    }

  } catch (error) {
    console.log(error.message);
  }
};

const resetDailyCap = async () => {
  console.log('Eseguo il reset del cap');

  try {
    const user = await User.findById("664c5b2f3055d6de1fcaa22b");

    user.dailyLead = 0;
    await user.save();

    console.log('Cap giornaliero resettato');
  } catch (err) {
    console.log(err);
  }
};

/*cron.schedule('07,20,35,50 8,9,10,11,12,13,14,15,16,17 * * *', () => {
  calculateAndAssignLeadsEveryDayTag();
  console.log('Eseguo calculate Lead Tag di prova');
});*/


cron.schedule('30 4 * * *', () => {
  resetDailyCap();
  console.log('Eseguito il reset del daily Lead');
});

cron.schedule('10,46,20 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead();
  console.log('Prendo i lead di Bluedental 1.0');
});

cron.schedule('20,56,30 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead2();
  console.log('Prendo i lead di Bluedental 2.0');
});

cron.schedule('5,36,15 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead3();
  console.log('Prendo i lead di Bluedental 3.0');
});

cron.schedule('8,49,18 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getBludentalLead();
  console.log('Prendo i lead di Bluedental');
});

cron.schedule('10,52,33 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getThlLead1();
  console.log('Prendo i lead di THL 1');
});

cron.schedule('12,44,22 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getThlLead2();
  console.log('Prendo i lead di THL 2');
});

cron.schedule('15,58,25,40 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  calculateAndAssignLeadsEveryDay();
  console.log('Assegno i lead di bludental altro');
});

cron.schedule('20,10,35,50 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  calculateAndAssignLeadsEveryDayMetaWeb();
  console.log('Assegno i lead di bludental Meta web');
});

/*cron.schedule('12 8,9,10,11,12,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  //getTagLeads();
  calculateAndAssignLeadsEveryDayWordpress();
  console.log('Eseguo calculate Wordpress');
});

cron.schedule('47 7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  console.log('Eseguo l\'assegnazione a Ecp solo comparatore');
  calculateAndAssignLeadsEveryDayWordpressComparatore();
});*/


async function updateAssignedField() {
  try {
      await LeadFacebook.updateMany({}, { assigned: true });
      console.log('Campo "assigned" aggiornato per tutte le lead.');
  } catch (error) {
      console.error('Errore durante l\'aggiornamento del campo "assigned" delle lead:', error);
  }
}
async function countFL(){
  try {
    const lead = await LeadFacebook.find();
    console.log(lead.length)
  } catch (error) {
    console.error(error)
  }
}
//countFL()
//getBludentalLead();
//updateAssignedField();
//calculateAndAssignLeadsEveryDay();

exports.dailyCap = async (req, res) => {
  try {
    const userId = req.body.userId;
    const dailyCap = req.body.dailyCap;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    user.dailyCap = dailyCap;

    await user.save();

    res.status(200).json({ message: 'Daily cap aggiornato con successo', user });  
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento del daily cap' });
  }
};

async function updateLeads() {
  try {
      const leadsToUpdate = await Lead.find({ esito: "Da contattare", orientatori: { $ne: '660fc6b59408391f561edc1a' } });
      const excludedOrientatoreIds = ['660fc6b59408391f561edc1a', '6602bc55a9b03d142783d965', "65ddbeaa76b468245d701bc5" /*ANGELICA*/, "6613a1389408391f56215308" /*STEFANIA*/];

      let orientatori = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }});
      const numLeads = leadsToUpdate.length;
      const numOrientatori = orientatori.length;
    console.log(numLeads);

    const numLeadsPerOrientatore = Math.ceil(numLeads / numOrientatori);

    let startIndex = 0;
    for (const orientatore of orientatori) {
      const endIndex = Math.min(startIndex + numLeadsPerOrientatore, numLeads);
      const leadsToAssign = leadsToUpdate.slice(startIndex, endIndex);

      for (const lead of leadsToAssign) {
        lead.orientatori = orientatore._id; // Assegna l'ID dell'orientatore alla lead
        await lead.save();
      }

      startIndex = endIndex;
    }

      console.log(`Aggiornamento completato. lead sono stati aggiornati.`);
  } catch (error) {
      console.error('Si è verificato un errore durante l\'aggiornamento dei lead:', error);
  }
}

async function updateLeadsRec() {
  const startDate = new Date('2024-06-20T00:00:00.000Z');
  const endDate = new Date('2024-06-26T23:59:59.999Z');
  try {
    const excludedOrientatoreId = '660fc6b59408391f561edc1a';
      const leadsToUpdate = await Lead.find({ esito: "Non risponde", utmCampaign: /Meta Web/i, utente: "65d3110eccfb1c0ce51f7492" });
      const filteredLeads = leadsToUpdate.filter((lead) => {
        const leadDate = new Date(lead.data);
        return (
          leadDate >= startDate &&
          leadDate <= endDate &&
          Number(lead.tentativiChiamata) > 0
        );
      });
      const orientatori = await Orientatore.findById(excludedOrientatoreId);
      const numLeads = filteredLeads.length;
    console.log(numLeads);

      /*for (const lead of filteredLeads) {
        lead.orientatori = orientatori._id;
        lead.esito = 'Da contattare';
        await lead.save();
      }*/

      console.log(`Aggiornamento completato. lead sono stati aggiornati.`);
  } catch (error) {
      console.error('Si è verificato un errore durante l\'aggiornamento dei lead:', error);
  }
}

async function cambiaUtente() {
  try {
    const leadUpd = await Lead.find({orientatori: null, utente: "664c5b2f3055d6de1fcaa22b"})
    console.log(leadUpd.length)
  } catch (error) {
    console.error(error)
  }
}

async function updateLeadsEsito() {
  try {
    const excludedOrientatoreIds = ['660fc6b59408391f561edc1a', '65ddbe8676b468245d701bc2'];
    let orientatori = await Orientatore.find({ _id: { $nin: excludedOrientatoreIds }}); 
      const leadsToUpdate = await Lead.find({orientatori: "6613a1389408391f56215308"});

      const filteredLeads = leadsToUpdate.filter((lead) => {
        return (
          lead.esito === "Da contattare"
        );
      });
      const numLeads = filteredLeads.length;
    console.log(numLeads);

      for (const lead of filteredLeads) {
        lead.orientatori = "660fc6b59408391f561edc1a";
        await lead.save();
      }

      console.log(`Aggiornamento completato. lead sono stati aggiornati.`);
  } catch (error) {
      console.error('Si è verificato un errore durante l\'aggiornamento dei lead:', error);
  }
}

async function deleteLeadsGold() {
  try {
      await LeadFacebook.deleteMany({ assigned: false });
      console.log("Eliminate")
  } catch (error) {
      console.error('Si è verificato un errore durante l\'aggiornamento dei lead:', error);
  }
}

async function updateLeadsByPhoneNumber(phoneNumbers) {
  for (const telefono of phoneNumbers) {
      const lead = await Lead.findOne({ numeroTelefono: telefono });
      if (lead) {
          console.log('Lead trovata per il numero di telefono:', telefono);
          lead.orientatori = '660fc6b59408391f561edc1a';
          await lead.save();
          console.log('Campo orientatori aggiornato per la lead con numero di telefono:', telefono);
      } else {
          console.log('Lead non trovata per il numero di telefono:', telefono);
      }
  }
}

async function updateLeadsToOrieDallaCampagna() {
      const leads = await Lead.find({
        utmCampaign: /ESTETICA/i,
        utente: "65d3110eccfb1c0ce51f7492"
      });
      console.log(leads.length)
      for (const lead of leads){
        lead.orientatori = "65ddbe8676b468245d701bc2";
        await lead.save();
      }
      console.log('Campo orientatori aggiornato per le lead estetica');
}

async function updateLeadPerErrore() {
  const leads = await Lead.find({
    orientatori: ["665d9194d7d57110edf34d3d", "6661aadad7d57110edfd4f30"],
    utente: "65d3110eccfb1c0ce51f7492"
  })
  .sort({ data: -1 })
  .limit(100);
  let users = await Orientatore.find({
    //_id: { $nin: excludedOrientatoreIds }, 
    utente: "65d3110eccfb1c0ce51f7492",
    daAssegnare: true,
  });
  console.log(leads.length)
  let userIndex = 6;
  while (leads.length > 0) {
    const user = users[userIndex % users.length]; //users[userIndex && userIndex < 11 ? userIndex : 0];
    const leadsNeeded = Math.min(leads.length, 1); //Math.min(user.monthlyLeadCounter, 1);

    if (leadsNeeded === 0) {
      console.log(`Il contatore mensile dell'utente ${user.nameECP} è insufficiente. Non vengono assegnati ulteriori lead.`);
      userIndex++;
      continue;
    }

    if (!user) {
      console.error('Nessun utente disponibile per l\'indice', userIndex);
      continue;
    }

    const leadsForUser = leads.splice(0, leadsNeeded);

    for (const leadWithoutUser of leadsForUser) {
      if (leadWithoutUser.assigned) {
        console.log(`Il lead ${leadWithoutUser?._id} è già stato assegnato.`);
        continue;
      }
      leadWithoutUser.orientatori = user._id;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
      leadWithoutUser.data = threeDaysAgo;
      await leadWithoutUser.save();
      console.log("assegnato la lead " + leadWithoutUser.email + ' a ' + user.nome)
      const leadIndex = leads.findIndex(lead => lead._id.toString() === leadWithoutUser._id.toString());
      if (leadIndex !== -1) {
        leads.splice(leadIndex, 1);
      }
    }

    userIndex++;
    if (userIndex >= users.length) {
      userIndex = 0;
    }
  }
  console.log('Campo orientatori aggiornato per le lead estetica');
}

async function updateLeadsOriToOri() {
  const leads = await Lead.find({
    esito: "Da contattare",
    orientatori: "6613a0bd9408391f562152f5"
  });
  console.log(leads.length)
  for (const lead of leads){
    lead.orientatori = "65ddbe8676b468245d701bc2";
    await lead.save();
  }
  console.log('Campo orientatori aggiornato per le lead estetica');
}

async function eliminaEstetica() {

  try {
    // Trova le lead che corrispondono ai criteri utmCampaign e utente
    const lead = await LeadFacebook.find({
      name: /ESTETICA/i,
      assigned: false,
    });
    const leadAss = await LeadFacebook.find({
      assigned: false
    })

    console.log('Total leads found:', lead.length);
    console.log(leadAss.length)

    const leadIdsToDelete = lead.map((lead) => lead._id);

    await LeadFacebook.deleteMany({
      _id: { $in: leadIdsToDelete }
    });

    console.log('Deleted leads count:', lead.length);
  } catch (error) {
    console.error('Error deleting leads:', error);
  }
}

//eliminaEstetica()
//updateLeadsByPhoneNumber(phoneNumbers)
//deleteLeadsGold()
//updateLeads();
//updateLeadsEsito();
//updateLeadsRec(); //DEI NON RISPONDE OGNI INIZIO SETTIMANA

const emails = [
  'pinupste92@gmail.com',
  'archlucioreggiani@gmail.com',
  'dinoraffog@gmail.com',
  'ndiayeali7@gmail.com',
  'irini.scannicchio@gmail.com',
  'pilarnv3@gmail.com',
  'raffaello.ch@libero.it',
  'biondailenia@gmail.com',
  'marcodifazio@gimoil.it',
  'mdmalusilva47@gmail.com',
  'mirthaelisabeth@hotmail.com',
  'Bellissimo1982@gmail.it',
  'marcorinaldo40@gmail.com',
  '2369rpll@libero.it',
  'ferraram274@gmail.com',
  'annaconca915@gmail.com',
  'dichiarolisa1967@gmail.com',
  'angelamaria.virgilio.61@gmail.com',
  'berryred@libero.it',
  'franca13matilde@gmail.com',
  'fabrybonomelli78@gmail.com',
  'matteben95@gmail.com',
  'chettimaiuri@gmail.com',
  'ottaviozambetti@gmail.com',
  'murtasliliana@gmail.com',
  'Jacquesnaim@yahoo.com',
  'salvator.serra@tiscali.it',
  'giorgiosmirh@gmail.com',
  'cassiopella@hotmail.com',
  'teikoutadiarra@gmail.com',
  'albert.deiana@gmail.com',
  'angelamazzuca7@gmail.com',
  'meaccimusluvittoria@gmail.com',
  'rhitachaibi@gmail.com',
  'luigi.medau.45@gmail.com',
  'aldoavvocato@libero.it',
  'dicandiapatrizia0@gmail.com',
  'nicolettafilippi@gmail.com',
  'immacolatatene@gmail.com',
  'vilma.chef55@gmail.com',
  'cristinasecchi9@gmail.com',
  'cumpamariamagdalena@gmail.com',
  'fatimabenhbaiba@gmail.com',
  'massimobigalli412@gmail.com',
  'dianavalarezo@hotmail.es',
  'halynashumylo22@gmail.com',
  'c.biggiogero@outlook.com',
  'rahmmanisuat150@gmail.com',
  'maridore64@gmail.com',
  'cagol.fabrizio@gmail.com',
  'gabri.sole59@gmail.con',
  'ivaniramfs@gmail.com',
  'lapianaanna073@gmail.com',
  'paola.davio@yahoo.it',
  'danielabrancolini17@gmail.com',
  'miriamdelcarmencarocaleyton@gmail.com',
  'michelaionel@yahoo.com',
  'annamoretti20@gmail.com',
  'pri.mo42@yahoo.it',
  'ivan.brunetta@gmail.com',
  'silviamaria.petri@gmail.com',
  'mateoklara@hotmail.it',
  'anto2634@hotmail.it',
  'viaverdi@gmail.com',
  'mellusom@gmail.com',
  'gabriella.lavalle@yahoo.it',
  'Sheyron82@gmail.com',
  'fracchiolla72@gmail.com',
  'dea.anna66@gmail.com',
  'slisi1581972@gmail.com',
  'jamadbadr@gmail.com',
  'imamericangirl@yahoo.it',
  'gianlucarutigliano30@libero.it',
  'salvatoretoriello@libero.it',
  'fugazz8mary@yahoo.it',
  'anachicu82@gmail.com',
  'hiandrivola12@gmail.com',
  'barletta.mia@gmail.com',
  'anna.bussu67@virlio.it',
  'aliagapatillah@gmail.com',
  'enzo.battista.tablet@gmail.com',
  'lotta120477@gmail.com',
  'nat.minervini@gmail.com',
  'tonycucino@libero.it',
  'manuel.michelessi92@gmail.com',
  'Danielvalesi11@gmail.com',
  'cristian.foddai@hotmail.com',
  'kessycatacchio@libero.it',
  'anna005678@gmail.com',
  'cr.info65@gmail.com',
  'tonysimo906@gmail.com',
  'ciammix@gmail.com',
  'eliabarrale12@gmail.com',
  'eleonora_russo@live.it',
  'lucabenevent@gmail.com',
  'giuse_99_@live.it',
  'miriamfedele@libero.it',
  'jorlibeth007-torres@hotmail.com',
  'roxanne.bejan@gmail.com',
  'farciv@tiscali.it',
  'gentiluomo.r@gmail.com',
  'pietro.gallucci@gmail.com',
  'alexc87.salemi@yahoo.it',
  'enzarusso71@virgilio.it',
  'cardonef@live.it',
  'ilaria.rocchini@outlook.it',
  'Teamjennifer@libero.it',
  'vaniamaritan@gmail.com',
  'operativoservice1@gmail.com',
  'elyodetto@gmail.com',
  '81rita28@gmail.com',
  'angiola.polimeno@gmail.com',
  'marialasorsa1974@gmail.com',
  'valdacorreiadesouza2@gmail.com',
  'mercuryenterprises.costruzioni@gmail.com',
  'danielacolella72ore@gmail.com',
  'katia.reggiani84@gmail.com',
  'stedani10@yahoo.it',
  'libellula8633@gmail.com',
  'jessicasarti.fisioterapista@gmail.com',
  'catiazetti@gmail.com',
  'lillideruvo@gmail.com',
  'fat_hasnaa@hotmail.fr',
  'dexmype@gmail.com',
  'jamil.ahmad.mughal@gmail.com',
  'nsalucci@me.com',
  'leprincedemilano@hotmail.com',
  'silvianannipieri@yahoo.it',
  'roscam83@gmail.com',
  'florapelleatti33@gmail.com',
  'pezzonil@hotmail.it',
  'nadiapasquadibisceglie15@gmail.co.com',
  'pietrodizinno@msn.com',
  'ababeielena44@yahoo.com',
  'manuel233@yahoo.it',
  'yallayallasourya@gmail.com',
  'Baglionilaura@hotmail.it',
  'enzomesiti3@gmail.com',
  'sarafestino91@gmail.com',
  'gattimarco80parma@gmail.com',
  'angela.lategola@virgilio.it',
  'Costea@imbox.ru',
  'Fedecerone99@gmail.com',
  'miki.pagliaro4@hotmail.com',
  'misa7114@gmail.com',
  'mirella.corsini67@gmail.com',
  'gpcaceresrivera@gmail.com',
  'patriziabelloi22@gmail.com',
  'tobaldisilvia.78@gmail.com',
  'pietroluongofabrizio@yahoo.it',
  'emadnous6@gmail.com',
  'e.colace@alfa-legal.it',
  'angdic71@gmail.com',
  'ballini168@gmail.com',
  'noemi.yauri@icloud.com',
  'marta.hyska@yahoo.it',
  'giusyginestrina@libero.it',
  'eleonorapavan85@virgilio.it',
  'rosaferreira2007@gmail.com',
  'schfrancy@live.it',
  'aquila6587@gmail.com',
  'anet.lutecka@gmail.com',
  'visanimaebe97@gmail.com',
  'robi.mucchi@gmail.com',
  'senalithelisinghe98@gmail.com',
  'gioiart@hotmail.it',
  'carissima87@hotmail.fr',
  'dome.telese@gmail.com',
  'andrea.mac003@gmail.com',
  'hamzachafra7@gmail.com'
];

const checkEmails = async () => {

  for (const email of emails) {
    const lead = await Lead.find({
      fieldData: {
        $elemMatch: {
          name: 'email',
          value: email
        }
      }
    });
    if (lead.length > 0) {
      console.log(`${email}: Si`);
    } else {
      console.log(`${email}: No`);
    }
  }
};