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
const fs = require('fs');
const csv = require('csv-parser');

let lastUserReceivedLead = null;
function filterOldLeads(leads) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 10);

  return leads.filter(lead => new Date(lead.data) > fourteenDaysAgo);
}

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

async function makeOutboundCall(number, city, name, type) {
  const url = 'https://twilio-11labs-call-agent-production.up.railway.app/outbound-call';
  //const url = 'https://cd9f-185-199-103-50.ngrok-free.app/outbound-call';
  number = number.replace(/\s+/g, '');

  // Controlla e aggiusta il prefisso
  if (!number.startsWith('+39')) {
    if (number.startsWith('39') && number.length === 12) {
      number = '+' + number;
    } else if (number.length === 10) {
      number = '+39' + number;
    }
  }

  const data = {
    number: number,
    citta: city,
    nome: name,
    type: type || null,
  };

  try {
    const response = await axios.post(url, data);
    console.log('Risposta dal server:', response.data);
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
}

let lastFunctionExecuted = "calculateAndAssignLeadsEveryDay";

//makeOutboundCall('+393409610597', 'Roma', 'Alessandro Grandoni', 'bludental');
//makeOutboundCall('+393313869850', 'Roma', 'Mattia Noris');

//Da contattare
/*trigger({
  nome: "Francesca Di Lallo",
  email: "francescadilallo@example.com",
  numeroTelefono: "+393400559975",
  città: "Roma",
  trattamento: "Implantologia a carico immediato",
  esito: "Da contattare",
}, {
  nome: "Lorenzo",
  telefono: "3514871035",
}, flows.daContattare)*/

//Fissato
/*trigger({
  nome: "Mario Rossi",
  email: "mario.rossi@example.com",
  numeroTelefono: "+393313869850",
  città: "Roma",
  trattamento: "Implantologia a carico immediato",
  esito: "Fissato",
  appDate: "02-01-2025 15:00",
}, {
  nome: "Gianni",
  telefono: "3334478306",
}, flows.fissato)*/

const calculateAndAssignLeadsEveryDay = async () => {
  try {
    //const excludedOrientatoreIds = ['660fc6b59408391f561edc1a'];
    let bludentalUser = await User.findById("65d3110eccfb1c0ce51f7492");
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
        { name: { $not: { $regex: /ESTETICA/, $options: 'i' } } },
        { name: { $not: { $regex: /GFU/, $options: 'i' } } }
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
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length == 0)){
            await newLead.save();
            //await trigger(newLead, user)
            lastUserReceivedLead = user?._id;
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);
            const currentHour = new Date().getHours();
            /*if (lastFunctionExecuted !== 'calculateAndAssignLeadsEveryDay' && bludentalUser.dailyLead < bludentalUser.dailyCap && currentHour >= 9 && currentHour <= 20) {
              console.log("Eseguo la chiamata di Ambra e Gold");
              await makeOutboundCall(newLead.numeroTelefono, newLead.città, newLead.nome, 'bludental');
              lastFunctionExecuted = 'calculateAndAssignLeadsEveryDay';
            }
*/
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

//calculateAndAssignLeadsEveryDay()

async function setCapDailyToTen() {
  try {
    await Orientatore.updateMany({}, { capDaily: 10 });
    console.log("Cap impostato a 10 per tutti gli orientatori.");
  } catch (error) {
    console.error("Errore durante l'aggiornamento del cap:", error);
  }
}

async function checkAndInsertLeadsFromCSV() {
  const filePath = './AMBRA.csv';

  try {
    let users = await Orientatore.find({
      utente: "65d3110eccfb1c0ce51f7492",
      daAssegnare: true,
    });

    if (users.length === 0) {
      console.log('Nessun orientatore disponibile.');
      return;
    }

    let userIndex = 0; // Iniziamo dal primo orientatore

    // Leggi i dati dal file CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email ? row.email.trim() : '';
        const numeroTelefono = row.phone_number ? row.phone_number.replace(/^p:/, '').trim() : '';

        if (email) {
          const leadData = {
            data: new Date(),
            nome: row.full_name,
            email: email,
            numeroTelefono: numeroTelefono,
            campagna: 'Social',
            città: row.seleziona_il_centro_più_vicino_a_te ? row.seleziona_il_centro_più_vicino_a_te.replace(/_/g, " ") : '',
            trattamento: row.seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni ? row.seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni.replace(/_/g, " ") : 'Implantologia a carico immediato',
            esito: "Da contattare",
            orientatori: users[userIndex % users.length]._id, // Assegna la lead all'orientatore corrente
            utente: "65d3110eccfb1c0ce51f7492",
            note: "",
            fatturato: "",
            utmContent: row.ad_name ? row.ad_name : '',
            utmAdset: row.adset_name ? row.adset_name : '',
            utmCampaign: row.campaign_name ? row.campaign_name : '',
            tentativiChiamata: '0',
            giàSpostato: false,
          };

          Lead.findOne({ email: email })
            .then(existingLead => {
              if (existingLead) {
                console.log(`Esiste: email: ${email}`);
              } else {
                console.log(`Non esiste: email: ${email}, creando la lead...`);
                Lead.create(leadData)
                  .then(() => console.log(`Lead creata per email: ${email}`))
                  .catch(err => console.error(`Errore durante la creazione della lead: ${err}`));
              }
            })
            .catch(err => console.error(`Errore durante la ricerca della lead: ${err}`));

          userIndex++; // Aggiorna l'indice per il prossimo orientatore
        }
      })
      .on('end', () => {
        console.log('Verifica e creazione completate.');
      });
  } catch (error) {
    console.error('Errore durante la verifica e creazione delle lead:', error);
  }
}
//checkAndInsertLeadsFromCSV()

async function checkLeadsFromCSV() {
  const filePath = './AMBRA.csv';

  try {
    // Array per memorizzare le lead dal CSV
    const leads = [];

    // Leggi i dati dal file CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email ? row.email.trim() : '';
        const numeroTelefono = row.phone_number ? row.phone_number.replace(/^p:/, '').trim() : '';

        if (email) {
          leads.push({ email, numeroTelefono });
        }
      })
      .on('end', async () => {
        console.log(`Trovate ${leads.length} lead nel file CSV. Verifica in corso...`);

        // Itera su ogni lead per verificare l'esistenza nel database
        for (const lead of leads) {
          const existingLead = await Lead.findOne({ email: lead.email });

          if (existingLead) {
            console.log(`Esiste: email: ${lead.email}`);
          } else {
            console.log(`Non esiste: email: ${lead.email}`);
          }
        }

        console.log('Verifica completata.');
      });
  } catch (error) {
    console.error('Errore durante la verifica delle lead:', error);
  }
}
//checkLeadsFromCSV()

async function countAndRemoveLeadsWithP() {
  try {
    // Trova tutte le lead che hanno 'p:' all'inizio del numero di telefono
    const leadsWithP = await Lead.find({ numeroTelefono: { $regex: /^p:/ } });
    
    // Conta quante lead hanno il prefisso 'p:'
    const count = leadsWithP.length;
    console.log(`Trovate ${count} lead con il prefisso 'p:' nel numero di telefono.`);

    if (count > 0) {
      // Elimina tutte le lead che hanno 'p:' nel numero di telefono
      const deleteResult = await Lead.deleteMany({ numeroTelefono: { $regex: /^p:/ } });
      console.log(`${deleteResult.deletedCount} lead eliminate.`);
    } else {
      console.log('Nessuna lead da eliminare.');
    }

  } catch (error) {
    console.error('Errore durante il conteggio o l\'eliminazione delle lead:', error);
  }
}

const quanteLead = async () => {
  let leads = await LeadFacebook.find({
    $or: [{ assigned: false }, { assigned: { $exists: false } }],
  });
  const totalLeads = leads.length;
  console.log('Iscrizioni:', totalLeads);

  /*for (const lead of leads) {
    lead.assigned = true;
    await lead.save();
  }*/
  console.log('Tutte le lead sono state aggiornate con assigned: true');
};

const prova = async () => {
  try {
    const leadsVerify = await Lead.find({
      $or: [
        { email: "e-cipollone@hotmail.it" },
        { phone: "+393334478306" },
      ]
    });
    console.log(leadsVerify.length)

    if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length == 0)){
      console.log("diocane:", filterOldLeads(leadsVerify))
    } else {
      console.log("cazzo dici")
    }
  } catch (error) {
    console.error(error)
  }
}

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
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length == 0)){
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
    let bludentalUser = await User.findById(bludental);
    let users = await Orientatore.find({ 
      //_id: { $nin: excludedOrientatoreIds }, 
      utente: "65d3110eccfb1c0ce51f7492",
      daAssegnare: true,
    });
    let leads = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $regex: /Meta Web/, $options: 'i' }
    }).limit(50);
    let leadsGfu = await LeadFacebook.find({
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $regex: /GFU/, $options: 'i' }
    });
    
    const totalLeads = leads.length;
    console.log('Iscrizioni:', leadsGfu.length);
    console.log( 'Utenti:'+ users.length);

    if (totalLeads === 0) {
      console.log('Nessun lead disponibile');
      return;
    }

    const leadsForCallCenterCount = Math.floor(totalLeads / 2);
    const leadsForBludentalCount = totalLeads - leadsForCallCenterCount;
    
    // Divide l'array di lead in due parti
    const leadsForCallCenter = leadsGfu;
    let leadsForBludental = leads;
    
    console.log(`Lead per Call Center: ${leadsForCallCenter.length}`);
    console.log(`Lead per Bludental: ${leadsForBludental.length}`);
    
    const today = new Date();
    const isWeekend = today.getDay() === 6 || today.getDay() === 0; // 6 = Sabato, 0 = Domenica
    //if (!isWeekend && callCenterUser.dailyLead < callCenterUser.dailyCap){
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
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length == 0)){
            await newLead.save();
            callCenterUser.dailyLead += 1;
            callCenterUser.save()
            //await trigger(newLead, user)

            lead.assigned = true;
            await lead.save();
            await trigger({
              nome: newLead.nome,
              email: newLead.email,
              numeroTelefono: newLead.numeroTelefono,
              città: newLead.città,
              trattamento: newLead.trattamento,
              esito: "Da contattare",
            }, {
              nome: "Lorenzo",
              telefono: "3514871035",
            }, flows.daContattare)

            const currentHour = new Date().getHours();
            /*if (currentHour >= 9 && currentHour < 20) {
                makeOutboundCall(newLead.numeroTelefono, newLead.città, newLead.nome);
            }*/
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
    //} else {
    //  leadsForBludental = leads;
    //}

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
          if (leadsVerify.length === 0 || (leadsVerify.length > 0 && filterOldLeads(leadsVerify).length == 0)){
            const currentHour = new Date().getHours();
            newLead.outHour = currentHour < 8 || currentHour > 20;
            await newLead.save();
            //await trigger(newLead, user)
            lastUserReceivedLead = user?._id;
            await user.save();

            leadWithoutUser.assigned = true;
            await leadWithoutUser.save();

            //await sendNotification(user._id);

            //await sendEmailLeadArrivati(user._id);
            console.log(currentHour)
            if (/*lastFunctionExecuted !== 'calculateAndAssignLeadsEveryDayMetaWeb' &&*/ currentHour >= 7 && currentHour <= 19) {
              console.log("Eseguo la chiamata di Meta web");
              await makeOutboundCall(newLead.numeroTelefono, newLead.città, newLead.nome, 'bludental');
              lastFunctionExecuted = 'calculateAndAssignLeadsEveryDayMetaWeb';
            }

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

console.log(new Date().getHours())
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
    const user = await User.findById("65d3110eccfb1c0ce51f7492");

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

cron.schedule('10,46,20 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead();
  console.log('Prendo i lead di Bluedental 1.0');
});

cron.schedule('20,56,30 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead2();
  console.log('Prendo i lead di Bluedental 2.0');
});

cron.schedule('5,36,15 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead3();
  console.log('Prendo i lead di Bluedental 3.0');
});

cron.schedule('8,49,18 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getBludentalLead();
  console.log('Prendo i lead di Bluedental');
});

/*cron.schedule('10,52,33 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getThlLead1();
  console.log('Prendo i lead di THL 1');
});

cron.schedule('12,44,22 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getThlLead2();
  console.log('Prendo i lead di THL 2');
});*/

async function updateDataTimestampForAllLeads() {
  try {
    const leads = await Lead.find({ dataTimestamp: { $exists: false } });
    let updatedCount = 0;

    for (const lead of leads) {
      if (lead.data) {
        console.log(lead.nome)
        const dataDate = new Date(lead.data);
        if (!isNaN(dataDate)) {
          lead.dataTimestamp = dataDate;
          await lead.save();
          updatedCount++;
          console.log(`Aggiornato lead numero: ${updatedCount}`);
        }
      }
    }

    console.log(`Aggiornati ${updatedCount} documenti con il nuovo campo dataTimestamp.`);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dei lead:', error);
  } finally {
    console.log("FINITOOOOOO");
  }
}

//updateDataTimestampForAllLeads()

cron.schedule('15,58,25,40 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  calculateAndAssignLeadsEveryDay();
  console.log('Assegno i lead di bludental altro');
});

cron.schedule('20,10,35,50 6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
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

async function checkAndSendReminders() {
  try {
    const leads = await Lead.find({
      esito: "Fissato",
      utente: "664c5b2f3055d6de1fcaa22b",
      $or: [
        { reminderInviato: false },
        { reminderInviato: { $exists: false } }
      ]
    });

    const now = new Date();

    for (const lead of leads) {
      const appFissato = lead.appFissato; // Assumendo che appFissato sia una stringa nel formato "dd-MM-yy HH:mm"
      const [datePart, timePart] = appFissato.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      const appointmentDate = new Date(`20${year}`, month - 1, day, hours, minutes);

      const timeDifference = appointmentDate - now;
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      if (hoursDifference > 0 && hoursDifference < 24) {
        await trigger({
          nome: lead.nome,
          email: lead.email,
          numeroTelefono: lead.numeroTelefono,
          città: lead.città,
          trattamento: lead.trattamento,
          esito: lead.esito,
          appDate: lead.appFissato,
          luogo: lead.luogo,
        }, {
          nome: "Lorenzo",
          telefono: "3514871035",
        }, flows.fissato)
        lead.reminderInviato = true;
        await lead.save();
        console.log(`Reminder inviato per il lead con ID: ${lead.email}`);
      }
    }
  } catch (error) {
    console.error('Errore durante il controllo dei reminder:', error);
  }
}

// Pianifica il cron job per eseguire la funzione ogni ora
cron.schedule('0 * * * *', () => {
  console.log('Eseguo il controllo dei reminder per i lead fissati');
  checkAndSendReminders();
});
//checkAndSendReminders();

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
    utente: "65d3110eccfb1c0ce51f7492",
    città: { $regex: /^piacenza$/i }
  });
  console.log(leads.length)
  for (const lead of leads){
    lead.orientatori = "660fc6b59408391f561edc1a";
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

const recallSegreteria = async () => {
  try {
    const leads = await Lead.find({
      'recallAgent.recallType': { $gt: 0 }
    });

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const filteredLeads = leads.filter(lead => {
      const recallInfo = lead.recallAgent.recallInfo;
      if (recallInfo && recallInfo.length > 0) {
        const lastRecall = recallInfo[recallInfo.length - 1];
        return lastRecall.recallReason === "Segreteria" && new Date(lastRecall.recallDate) > twoHoursAgo;
      }
      return false;
    });

    //console.log(filteredLeads)
    const currentHour = new Date().getHours();
    for (const lead of filteredLeads) {
      if (lead.recallAgent.recallType < 4 && currentHour >= 8 && currentHour <= 20) {
        if (lead.utente.toString() === "65d3110eccfb1c0ce51f7492") {
          await makeOutboundCall(lead.numeroTelefono, lead.città, lead.nome, 'bludental');
          console.log('Chiamata effettuata per la lead ' + lead.email)
        } else {
          await makeOutboundCall(lead.numeroTelefono, lead.città, lead.nome);
          console.log('Chiamata effettuata per la lead ' + lead.email)
        }        
      } else {
        console.log('Chiamata non effettuata per la lead ' + lead.email + ' perché non è tra le 8 e le 20 o più di 4 recall')
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function makeOutboundCallErrore(number, city, name, type) {
  const url = 'https://twilio-11labs-call-agent-production.up.railway.app/outbound-call';
  //const url = 'https://cd9f-185-199-103-50.ngrok-free.app/outbound-call';
  number = number.replace(/\s+/g, '');

  // Controlla e aggiusta il prefisso
  if (!number.startsWith('+39')) {
    if (number.startsWith('39') && number.length === 12) {
      number = '+' + number;
    } else if (number.length === 10) {
      number = '+39' + number;
    }
  }

  const data = {
    number: number,
    citta: city,
    nome: name,
    type: type || null,
  };

  try {
    const response = await axios.post(url, data);
    console.log('Risposta dal server:', response.data);
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
}

const recallErroreChiamata = async () => {
  try {
    const leads = await Lead.find({
      'recallAgent.recallType': { $gt: 0 }
    });
    let lastRecall;
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 3);

    const filteredLeads = leads.filter(lead => {
      const recallInfo = lead.recallAgent.recallInfo;
      if (recallInfo && recallInfo.length > 0) {
        lastRecall = recallInfo[recallInfo.length - 1];
        return lastRecall.recallReason === "Errore Chiamata" && new Date(lastRecall.recallDate) > twoHoursAgo;
      }
      return false;
    });

    //console.log(filteredLeads)
    const currentHour = new Date().getHours();
    for (const lead of filteredLeads) {
      if (lead.recallAgent.recallType < 4 && currentHour >= 8 && currentHour <= 20) {
        if (lead.utente.toString() === "65d3110eccfb1c0ce51f7492") {
          await makeOutboundCallErrore(lead.numeroTelefono, lead.città, lead.nome, 'bludental');
          console.log('Chiamata effettuata per la lead ' + lead.email)
      } else {
        await makeOutboundCallErrore(lead.numeroTelefono, lead.città, lead.nome, '');
          console.log('Chiamata effettuata per la lead ' + lead.email)
        }
      } else {
        console.log('Chiamata non effettuata per la lead ' + lead.email + ' perché non è tra le 8 e le 20 o più di 4 recall')
      }
    }
  } catch (error) {
    console.error(error);
  }
}

  cron.schedule('0 * * * *', () => {
    recallSegreteria();
    console.log('Eseguo la recall delle segreterie');
  });
  
  cron.schedule('0 */2 * * *', () => {
    recallErroreChiamata();
    console.log('Eseguo la recall degli errori di chiamata');
  });
//recallSegreteria()

const gestisciChiamatePendenti = async () => {
  try {
    // Trova tutte le lead con outHour: true
    const leadsPendenti = await Lead.find({ 
      outHour: true,
      utente: "65d3110eccfb1c0ce51f7492"
    });

    console.log(`Trovate ${leadsPendenti.length} chiamate pendenti da processare`);

    for (const lead of leadsPendenti) {
      try {
        // Esegue la chiamata
        await makeOutboundCall(lead.numeroTelefono, lead.città, lead.nome, 'bludental');
        
        // Aggiorna lo stato della lead
        lead.outHour = false;
        await lead.save();
        
        console.log(`Chiamata eseguita con successo per ${lead.nome} (${lead.numeroTelefono})`);
        
        // Attende 2 secondi tra una chiamata e l'altra per evitare sovraccarichi
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Errore durante la chiamata per ${lead.nome}:`, error);
        // Continua con la prossima lead anche se questa fallisce
      }
    }

    console.log('Processo di gestione chiamate pendenti completato');
  } catch (error) {
    console.error('Errore durante la gestione delle chiamate pendenti:', error);
  }
};

// Cron job che si esegue ogni giorno alle 10:00
cron.schedule('0 10 * * *', () => {
  console.log('Avvio gestione chiamate pendenti...');
  gestisciChiamatePendenti();
});