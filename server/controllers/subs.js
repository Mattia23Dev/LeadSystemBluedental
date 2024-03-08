const User = require('../models/user');
const LeadFacebook = require('../models/leadFacebook');
const LeadWordpress = require("../models/leadWordpress");
const Lead = require('../models/lead');
var cron = require('node-cron');
const { sendEmailLeadArrivati } = require('../middlewares');
const { getDentistaLead, getTagLeads, getTagLeads2, getDentistaLead2, getDentistaLead3 } = require('./Facebook');
const Orientatore = require('../models/orientatori');

let lastUserReceivedLead = null;

const calculateAndAssignLeadsEveryDay = async () => {
  try {
    let users = await Orientatore.find();
    /*
    let users = await Orientatore.find({ $and: [
      { monthlyLeadCounter: { $gt: 0 } },
      { tag: "pegaso" }
    ]});
    */
    let leads = await LeadFacebook.find({ $or: [{ assigned: false }, { assigned: { $exists: false } }] }).limit(60); // Imposta il limite a 1000, o a un valore più alto se necessario


    const totalLeads = leads.length;
    console.log('Iscrizioni:', totalLeads);

    if (totalLeads === 0) {
      console.log('Nessun lead disponibile');
      return;
    }

    console.log( 'Utenti:'+ users.length);

    let userIndex = 0;
    //(leads.length > 0 && users.some(user => user.monthlyLeadCounter > 0)
    while (leads.length > 0) {
      const user = users[userIndex];

      /*if (!user || user.monthlyLeadCounter == 0) {
        console.log('Tutti gli utenti hanno il contatore a 0');
        break;
      }*/

      /*if (user.dailyCap !== undefined && user.dailyCap !== null) {
    
        if (user.dailyLead >= user.dailyCap) {
          console.log(`L'utente ${user.nameECP} ha raggiunto il dailyCap per oggi.`);
          userIndex++;
          continue;
        }
      }*/

      const leadsNeeded = Math.min(leads.length, 1); //Math.min(user.monthlyLeadCounter, 1);

      if (leadsNeeded === 0) {
        console.log(`Il contatore mensile dell'utente ${user._id} è insufficiente. Non vengono assegnati ulteriori lead.`);
        userIndex++;
        continue;
      }

      const leadsForUser = leads.splice(0, leadsNeeded);

      for (const leadWithoutUser of leadsForUser) {
        if (leadWithoutUser.assigned) {
          console.log(`Il lead ${leadWithoutUser._id} è già stato assegnato.`);
          continue;
        }

        const userData = {
          first_name: "",
          email: "",
          phone_number: "",
          trattamento: "",
          città: '',
        };

        for (const field of leadWithoutUser.fieldData) {
          if (field.name === "full_name") {
            userData.first_name = field.values[0];
          } else if (field.name === "email") {
            userData.email = field.values[0];
          } else if (field.name === "phone_number") {
            userData.phone_number = field.values[0];
          } else if (field.name === "seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni"){
            userData.trattamento = field.values[0].replace(/_/g, " ");
          } else if ( field.name == "seleziona_il_centro_più_vicino_a_te" ){
            userData.città = field.values[0].replace(/_/g, " ");
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

        try {
          await newLead.save();

          lastUserReceivedLead = user._id;

          //user.monthlyLeadCounter -= 1;
          //user.dailyLead += 1;
          await user.save();

          leadWithoutUser.assigned = true;
          await leadWithoutUser.save();

          //await sendNotification(user._id);

          //await sendEmailLeadArrivati(user._id);

          console.log(`Assegnato il lead ${leadWithoutUser._id} all'utente ${user.nome}`);
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

  } catch (error) {
    console.log(error.message);
  }
};

const calculateAndAssignLeadsEveryDayWordpress = async () => {
  try {
    let users = await User.find({ $and: [
      { monthlyLeadCounter: { $gt: 0 } },
      { tag: "pegaso" }
    ] });
    let leads = await LeadWordpress.find({
      $or: [
        { assigned: false },
        { assigned: { $exists: false } },
      ],
      $and: [
        {campagna: 'comparatore' },
      ]
    });
    const totalLeads = leads.length;
    console.log('Iscrizioni Wordpress:', totalLeads);

    if (totalLeads === 0) {
      console.log('Nessun lead Wordpress disponibile');
      return;
    }

    let userIndex = 0;

    while (leads.length > 0 && users.some(user => user.monthlyLeadCounter > 0)) {
      const user = users[userIndex];

      if (!user) {
        console.log('Tutti gli utenti hanno il contatore a 0');
        break;
      }

      if (user.dailyCap !== undefined && user.dailyCap !== null) {
    
        if (user.dailyLead >= user.dailyCap) {
          console.log(`L'utente ${user.nameECP} ha raggiunto il dailyCap per oggi.`);
          userIndex++;
          continue;
        }
      }

      const leadsNeeded = Math.min(user.monthlyLeadCounter, 1);

      if (leadsNeeded === 0) {
        console.log(`Il contatore mensile dell'utente ${user.nameECP} è insufficiente. Non vengono assegnati ulteriori lead.`);
        userIndex++;
        continue;
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

      userIndex++;
      if (userIndex >= users.length) {
        userIndex = 0;
      }
    }

    if (totalLeads === 0) {
      console.log('LeadFacebook terminati prima che tutti gli utenti abbiano il contatore a 0');
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
    const users = await User.find();

    for (const user of users) {
      user.dailyLead = 0;
      await user.save();
    }

    console.log('Cap giornaliero resettato');
  } catch (err) {
    console.log(err);
  }
};

/*cron.schedule('07,20,35,50 8,9,10,11,12,13,14,15,16,17 * * *', () => {
  calculateAndAssignLeadsEveryDayTag();
  console.log('Eseguo calculate Lead Tag di prova');
});*/


/*cron.schedule('30 6 * * *', () => {
  resetDailyCap();
  console.log('Eseguito il reset del daily Lead');
});*/

cron.schedule('10,46,20 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead();
  console.log('Prendo i lead di Bluedental 3.0');
});

cron.schedule('20,56,30 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead2();
  console.log('Prendo i lead di Bluedental 3.0');
});

cron.schedule('5,36,15 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  getDentistaLead3();
  console.log('Prendo i lead di Bluedental 3.0');
});

cron.schedule('15,58,25,40 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *', () => {
  calculateAndAssignLeadsEveryDay();
  console.log('Assegno i lead di bludental');
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
//getDentistaLead3();
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

const righeDaAggiungere = [
  ["01/03/2024", "Giovanna Borrelli", "393293522703", "bgiovanna1401@gmail.com", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Bari", "01/03/2024", "Marina", "GIA PAZIENTE", 1],
  ["01/03/2024", "Carla Melchionda", "393714774148", "carlamelchionda12@gmail.com", "Impianti per mancanza di osso (Impianti pterigoidei)", "DI - Meta Web - Italia Impianti", "Italia - Broad - 35-65+", "Prezzo HOOK2", "Bari", "01/03/2024", "Marina", "RICHIAMO", 1],
  ["01/03/2024", "Stefania La Stefy", "393288720657", "claylug@gmail.com", "Implantologia a carico immediato", "DI - Meta Web - Italia - LAL 1% Fissati - Impianti - NO", "Italia - LAL 1% Fissati - Age: 30 - 65+", "Prezzo HOOK1", "Ferrara", "01/03/2024", "Marina", "RICHIAMO", 1],
  ["01/03/2024", "Lori Cortese", "393473418849", "lorettacortese008@gmail.com", "Implantologia per singolo dente", "DI - Meta Web - Italia - LAL 1% invio modulo - Impianti - broad maps", "Italia - LAL 1% form inviato - Age: 30 - 65+ - broad maps", "Problemi con i denti?", "Torino", "01/03/2024", "Tatiana", "RICHIAMO", 1, "occ"],
  ["01/03/2024", "Salvatore Di Bella", "393664893987", "salvatoredibello67@gmail.com", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Cantù", "01/03/2024", "Tatiana", "RICHIAMO", 1],
  ["01/03/2024", "Giovanna Palombi", "393385452661", "giovannapalombi24@gmail.com", "Implantologia a carico immediato", "DI - Meta Web - Italia - LAL 1% Fissati - Impianti - NO", "Italia - LAL 1% Fissati - Age: 30 - 65+", "Prezzo HOOK1", "Cassino", "01/03/2024", "Tatiana", "FISSATO", 1],
  ["01/03/2024", "Mimmo Caruso", "393427566734", "mimocariso@gmail.com", "Implantologia a carico immediato", "DI - Meta Web - Italia - LAL 1% Fissati - Impianti - NO", "Italia - LAL 1% Fissati - Age: 30 - 65+", "Prezzo HOOK1", "Bari", "01/03/2024", "Tatiana", "RIFIUTA", 2, "RICHIAMA LUI"],
  ["01/03/2024", "Mary Fraleoni", "393489142947", "mari.fraleoni@hotmail.it", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Roma", "01/03/2024", "Tatiana", "RICHIAMO", 1],
  ["01/03/2024", "Carmen Dantonio", "393341410991", "carmen.dantonio45@gmail.com", "Impianti per mancanza di osso (Impianti pterigoidei)", "DI - Meta Web - Italia Impianti", "Italia - Broad - 35-65+", "Problemi con i denti?", "Torino", "01/03/2024", "Tatiana", "FISSATO", null, "TORINO CHIRONI 11-3"],
  ["01/03/2024", "Paolo Rotolo", "393494161969", "paolorotolo62@gmail.com", "Implantologia a carico immediato", "DI 3 - Meta Web - Italia impianti NO", "Broad 35-65+ I Italia", "Video 2 - 1380€", "Torino", "01/03/2024", "Tatiana", "RIFIUTA", 1, "NON INTERESSATO"],
  ["01/03/2024", "Maria Teresa Becce", "393497939153", "teresa.becce@libero.it", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Abbiategrasso", "01/03/2024", "Tatiana", "RIFIUTA", null, "RICHIAMA LUI"],
  ["01/03/2024", "Nicola Ramondo", "393756237105", "tifogrifo1970@libero.it", "Implantologia a carico immediato", "DI 3 - Meta Web - Italia impianti NO", "Broad 35-65+ I Italia", "Video 2 - 1380€", "Prato", "01/03/2024", "Tatiana", "GIA PAZIENTE", null],
  ["01/03/2024", "Irene Colongo", "393381970851", "irenecolongo@libero.it", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Bari", "01/03/2024", "Tatiana", "GIA PAZIENTE", null],
  ["01/03/2024", "Angela Patrone", "393396470753", "angelapatrone123@gmail.com", "Implantologia a carico immediato", "DI 2- Meta Web - Italia Impianti - NO", "Italia - Broad 2 - 35-65+", "Video - 47€ mese", "Genova", "01/03/2024", "Tatiana", "FISSATO", null, "GENOVA 6-3"],
  ["01/03/2024", "Morosan Florina", "", "393517466501", "", "Implantologia a carico immediato", "Messenger", "Messenger", "Messenger", "Torino", "01/03/2024", "Tatiana", "RICHIAMO", 2],
  ["01/03/2024", "Adele Barba", "393291068011", "", "Implantologia a carico immediato", "Messenger", "Messenger", "Messenger", "Treviso", "01/03/2024", "Stefania", "FISSATO", 1, "", "TREVISO"],
  ["01/03/2024", "Sabrina Nofri", "393492216460", "sabry.nofri@gmail.com", "Implantologia per singolo dente", "DI - Meta Web - Altri centri LAL 1% invio form - Impianti - Broad Maps", "Altri centri - LAL 1% invio form - Age: 30 - 65+", "Prezzo HOOK1 - 1380€", "Piacenza", "01/03/2024", "Stefania", "RICHIAMO", 1],
  ["01/03/2024", "Anna Conti", "393333959078", "annafrancesca.conti@aicloud.com", "Impianti per mancanza di osso (Impianti pterigoidei)", "DI 2- Meta Web - Altri Centri - Impianti", "Altri Centri - Broad 2 - 35-65+", "Video - 47€ mese", "Arezzo", "01/03/2024", "Stefania", "RICHIAMO", 1],
  ["01/03/2024", "Marisa Magliano", "393454068744", "marisamagliano@yahoo.it", "Implantologia a carico immediato", "DI - Meta Web - Altri centri LAL 1% invio form - Impianti - Broad Maps", "Altri centri - LAL 1% invio form - Age: 30 - 65+", "Prezzo HOOK1", "Modena", "01/03/2024", "Tatiana", "RICHIAMO", 2],
  ["01/03/2024", "Musa Ljuljanovic", "393715520778", "musaljuljanovic@gmail.com", "Impianti per mancanza di osso (Impianti pterigoidei)", "DI 2- Meta Web - Altri Centri - Impianti", "Altri Centri - Broad 2 - 35-65+", "Video - 47€ mese", "Pomezia", "01/03/2024", "Stefania", "GIA PAZIENTE", null],
  ["01/03/2024", "Bruno Costone", "393389827389", "bcostone@gmail.com", "Impianti per mancanza di osso (Impianti pterigoidei)", "DI - Meta Web - Altri centri LAL 1% invio form - Impianti - Broad Maps", "Altri centri - LAL 1% invio form - Age: 30 - 65+", "Prezzo HOOK1", "Bari", "01/03/2024", "Stefania", "FISSATO", null, "BARI 8/3"]
];

async function inserisciLead(righeDaAggiungere) {
  try {
    for (let riga of righeDaAggiungere) {
      const nuovaLead = new Lead({
        data: riga[0],
        nome: riga[1],
        numeroTelefono: riga[2],
        email: riga[3],
        trattamento: riga[4],
        utente: "65d3110eccfb1c0ce51f7492",
        utmCampaign: riga[5],
        utmAdset: riga[6],
        utmContent: riga[7],
        città: riga[8],
        esito: riga[11],
        tentativiChiamata: riga[12],
      });

      await nuovaLead.save();
    }

    console.log('Le lead sono state inserite con successo!');
  } catch (error) {
    console.error('Si è verificato un errore durante l\'inserimento delle lead:', error);
  }
}

//inserisciLead(righeDaAggiungere);