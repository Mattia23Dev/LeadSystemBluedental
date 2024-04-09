const LeadFacebook = require('../models/leadFacebook');
const showDebugingInfo = true; 
'use strict';
const cron = require('node-cron');
const axios = require('axios');

const accessToken = 'EAAD6mNGgHKABO0VRMoANGbKwcHT4xFBwjf1vZBEu1QwThbS8vQEEGcX8L9Yw2k99cZCIMncdZBGRm9QbbIiZCWrVzNIWvGEjeGhvUdM7eanwQZCTTOycgif5ZAvJZBQdD7sh2illondwZBIJhx1lpbZCbK7iZBIKkuwwTOK5TOAvVMzEovRdpFpmrBdvja';
const apiUrl = 'https://graph.facebook.com/v12.0';
const idCampagna = '23858081191190152'; //ECP [LEAD ADS] - LAL Vendite - vantaggi VIDEO
const idCampagna2 = '23859089103880152'; //ECP - [LEAD ADS] - Master
const fields = 'id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}';

//LEADS 
const TOKENBLUDENTAL = "EAAQEkt9HVpsBO00ZAjI4OWYr1KfpyttYYnEnxXMJQAILFZAZCdZAsRuVKH2RdAZCx9iB7OjVnQQ8diHwdEvmvPmySDVgaSKn4YZAdGdp1Ne5NBSh2JMpbME5zeJ05eoQdJWmR1bmIWix7hJ6ygZAZBgYQlFrznOX4W8GbgnD0fEwf7BcxC41aac1KzdZC";
const TOKENMIO = "EAAD6mNGgHKABOZCFLOjk90nZCTiXKitChBna4fSTkgVbiehgRM3gfxaqd2AZCZCKQ7GeKMwTTaFSm9koTkW7XxSpcrxBq7dfn5qeZCMZAOd64rZCEeu09KfIlfLmxDtahUDSstNUHUXMX9bExQ7gSwuIV9CH0eNNhlzfzpdHWxZAhujnNaZAZB9yfrTQZDZD";
const TOKEN1 = "EAAD6mNGgHKABOZCFLOjk90nZCTiXKitChBna4fSTkgVbiehgRM3gfxaqd2AZCZCKQ7GeKMwTTaFSm9koTkW7XxSpcrxBq7dfn5qeZCMZAOd64rZCEeu09KfIlfLmxDtahUDSstNUHUXMX9bExQ7gSwuIV9CH0eNNhlzfzpdHWxZAhujnNaZAZB9yfrTQZDZD";
const { GoogleAdsApi, enums  } = require('google-ads-api');
const Lead = require('../models/lead');

 const saveLeadFromFacebookAndInstagram = async (logs) => {
  const leads = logs;

  if (Array.isArray(leads)) {
    const formattedLeads = leads.map((lead) => {
      return {
        formId: lead.formId,
        fieldData: Array.isArray(lead.fieldData)
          ? lead.fieldData.map((data) => {
              return {
                name: data.name,
                values: data.values,
              };
            })
          : [],
        id: lead.id ? lead.id : '',
        data: new Date(),
        annunci: lead.annunci ? lead.annunci : '',
        adsets: lead.adsets ? lead.adsets : '',
        name: lead.name ? lead.name : '',
      };
    });

    const existingLeads = await LeadFacebook.find({ id: { $in: formattedLeads.map((lead) => lead.id) } });

    const newLeads = formattedLeads.filter((lead) => {
      return !existingLeads.some((existingLead) => existingLead.id === lead.id);
    });

    // Salva i nuovi lead nel database
    if (newLeads.length > 0) {
      LeadFacebook.insertMany(newLeads)
        .then(() => {
          console.log('Dati dei lead Bluedental salvati nel database', newLeads);
        })
        .catch((error) => {
          console.error('Errore nel salvataggio dei lead Bluedental nel database:', error);
        });
    } else {
      console.log('Nessun nuovo lead Bluedental da salvare nel database');
    }
  } else {
    console.log('Dati Lead Bluedental non validi');
  }
};

  const saveLeadFromFacebookAndInstagramTag = async (response, campagnaId) => {
    if (!response.leads || !response.leads.data) {
      console.log('response.leads.data è undefined o null');
      return;
  }
    const leads = response.leads.data;
  
    if (Array.isArray(leads)) {
      const formattedLeads = leads.map((lead) => {
        return {
          formId: lead.formId,
          fieldData: Array.isArray(lead.field_data)
            ? lead.field_data.map((data) => {
                return {
                  name: data.name,
                  values: data.values,
                };
              })
            : [],
          id: lead.id,
          data: new Date(),
          annunci: lead.annunci ? lead.annunci : '',
          adsets: lead.adsets ? lead.adsets : '',
          name: lead.name ? lead.name : '',
        };
      });
  
      const existingLeads = await Lead.find({ id: { $in: formattedLeads.map((lead) => lead.id) } });
  
      const newLeads = formattedLeads.filter((lead) => {
        return !existingLeads.some((existingLead) => existingLead.id === lead.id);
      });
  
      // Salva i nuovi lead nel database
      if (newLeads.length > 0) {
        Lead.insertMany(newLeads)
          .then(() => {
            console.log('Dati dei lead TAG salvati nel database', newLeads);
          })
          .catch((error) => {
            console.error('Errore nel salvataggio dei lead TAG nel database:', error);
          });
      } else {
        console.log('Nessun nuovo lead TAG da salvare nel database');
      }
    } else {
      console.log('Dati dei lead TAG non validi');
    }
  };

  exports.getTagLeads = () => {
    axios
      .get(`${apiUrl}/${idCampagna}`, {
        params: {
          fields,
          access_token: accessToken,
        },
      })
      .then((response) => {
        response.data.ads.data.forEach((ad) => {
          saveLeadFromFacebookAndInstagramTag(ad, idCampagna);
        });
      })
      .catch((error) => {
        console.error('Errore nella richiesta:', error);
      });
  };

  exports.getTagLeads2 = () => {
    axios
      .get(`${apiUrl}/${idCampagna2}`, {
        params: {
          fields,
          access_token: TOKENMIO,
        },
      })
      .then((response) => {
        console.log(response.data.ads.data);
        response.data.ads.data.forEach((ad) => {
          saveLeadFromFacebookAndInstagramTag(ad, idCampagna2);
        });
      })
      .catch((error) => {
        console.error('Errore nella richiesta:', error);
      });
  };
// NUOVO ID DELL'ACCOUNT PUBBLICITARIO 3.0 DENTISTA VICINO A ME     act_511963014361529
  exports.getDentistaLead = () => {
    const url = 'https://graph.facebook.com/v17.0/act_511963014361529/campaigns';
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKEN1,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        if (Array.isArray(dataFromFacebook)) {
          for (const element of dataFromFacebook) {
            const excludedCampaignIds = [idCampagna, idCampagna2];
            //PER ESCLUDERE LE CAMPAGNE
            /*if (excludedCampaignIds.includes(element.id)) {
              console.log('Ho escluso:', element.id);
              continue;
            }*/

            const { account_id, ads, effective_status, id, name, objective, adsets, status } = element;

            if (ads && ads.data && ads.data.length > 0) {
              for (const ad of ads.data) {
                if (ad.leads && ad.leads.data && ad.leads.data.length > 0) {
                  for (const lead of ad.leads.data) {
                    if (lead && lead.field_data && Array.isArray(lead.field_data)) {
                      const fieldData = lead.field_data;
                      const id = lead.id;
                      const formId = lead.form_id;
                      const log = {
                        fieldData: fieldData,
                        name: name,
                        id: id,
                        formId: formId,
                        annunci: ad.name,
                        adsets: adsets.data[0].name,
                      };
                      logs.push(log);
                    }
                  }
                }
              }
            }
          }
        } else {
          console.error("dataFromFacebook non è un array");
        }
        saveLeadFromFacebookAndInstagram(logs);
      })
      .catch(error => {
        console.error('Errore:', error);
      });
  };
//ACCOUNT 2.0 ACT_627545782710130
  exports.getDentistaLead2 = () => {
    const url = 'https://graph.facebook.com/v17.0/act_627545782710130/campaigns';
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKEN1,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        if (Array.isArray(dataFromFacebook)) {
          for (const element of dataFromFacebook) {
            const excludedCampaignIds = [idCampagna, idCampagna2];
            //PER ESCLUDERE LE CAMPAGNE
            /*if (excludedCampaignIds.includes(element.id)) {
              console.log('Ho escluso:', element.id);
              continue;
            }*/

            const { account_id, ads, effective_status, id, name, objective, adsets, status } = element;

            if (ads && ads.data && ads.data.length > 0) {
              for (const ad of ads.data) {
                if (ad.leads && ad.leads.data && ad.leads.data.length > 0) {
                  for (const lead of ad.leads.data) {
                    if (lead && lead.field_data && Array.isArray(lead.field_data)) {
                      const fieldData = lead.field_data;
                      const id = lead.id;
                      const formId = lead.form_id;
                      const log = {
                        fieldData: fieldData,
                        name: name,
                        id: id,
                        formId: formId,
                        annunci: ad.name,
                        adsets: adsets.data[0].name,
                      };
                      logs.push(log);
                    }
                  }
                }
              }
            }
          }
        } else {
          console.error("dataFromFacebook non è un array");
        }
        saveLeadFromFacebookAndInstagram(logs);
      })
      .catch(error => {
        console.error('Errore:', error);
      });
  };
  // ACCOUNT 3.0 ACT_915414373405841
  exports.getDentistaLead3 = () => {
    const url = 'https://graph.facebook.com/v17.0/act_915414373405841/campaigns';
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKEN1,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        if (Array.isArray(dataFromFacebook)) {
          for (const element of dataFromFacebook) {
            const excludedCampaignIds = [idCampagna, idCampagna2];
            //PER ESCLUDERE LE CAMPAGNE
            /*if (excludedCampaignIds.includes(element.id)) {
              console.log('Ho escluso:', element.id);
              continue;
            }*/

            const { account_id, ads, effective_status, id, name, objective, adsets, status } = element;

            if (ads && ads.data && ads.data.length > 0) {
              for (const ad of ads.data) {
                if (ad.leads && ad.leads.data && ad.leads.data.length > 0) {
                  for (const lead of ad.leads.data) {
                    if (lead && lead.field_data && Array.isArray(lead.field_data)) {
                      const fieldData = lead.field_data;
                      const id = lead.id;
                      const formId = lead.form_id;
                      const log = {
                        fieldData: fieldData,
                        name: name,
                        id: id,
                        formId: formId,
                        annunci: ad.name,
                        adsets: adsets.data[0].name,
                      };
                      logs.push(log);
                    }
                  }
                }
              }
            }
          }
        } else {
          console.error("dataFromFacebook non è un array");
        }
        saveLeadFromFacebookAndInstagram(logs);
      })
      .catch(error => {
        console.error('Errore:', error);
      });
  };

  exports.getBludentalLead = () => {
    const url = 'https://graph.facebook.com/v17.0/act_982532079362123/campaigns';
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKENBLUDENTAL,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        if (Array.isArray(dataFromFacebook)) {
          for (const element of dataFromFacebook) {
            const excludedCampaignIds = [idCampagna, idCampagna2];
            //PER ESCLUDERE LE CAMPAGNE
            /*if (excludedCampaignIds.includes(element.id)) {
              console.log('Ho escluso:', element.id);
              continue;
            }*/

            const { account_id, ads, effective_status, id, name, objective, adsets, status } = element;

            if (ads && ads.data && ads.data.length > 0) {
              for (const ad of ads.data) {
                if (ad.leads && ad.leads.data && ad.leads.data.length > 0) {
                  for (const lead of ad.leads.data) {
                    if (lead && lead.field_data && Array.isArray(lead.field_data)) {
                      const fieldData = lead.field_data;
                      const id = lead.id;
                      const formId = lead.form_id;
                      const log = {
                        fieldData: fieldData,
                        name: name,
                        id: id,
                        formId: formId,
                        annunci: ad.name,
                        adsets: adsets.data[0].name,
                      };
                      logs.push(log);
                    }
                  }
                }
              }
            }
          }
        } else {
          console.error("dataFromFacebook non è un array");
        }
        saveLeadFromFacebookAndInstagram(logs);
      })
      .catch(error => {
        console.error('Errore:', error);
      });
  };

   const client = new GoogleAdsApi({
    client_id: "678629363192-330a44sjgh190ugqvpqq8qa6udk4rocs.apps.googleusercontent.com",
    client_secret: "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",
    developer_token: "h5cxrfY_byC-D0z_UANqvg",
  });

  const refreshToken = "ya29.a0AfB_byDkSdf2CRys-Sv_HqdPivTJqra3h8xHNk8rC8be18i7bk-nFIytq0xLR-JCGFng1rt5YQ1Qt6OSjs6E5hw6i0YPhoPdR14fMTlqYK8QUfh1NDB_bt_3M8J-aQXy33HzcdUPVxwlv9WRZXugLeh7x-7mw_OH-9PHaCgYKAVISARESFQGOcNnCd5Ow3LdbtNysF9r2-TxNhQ0171";
  const customer = client.Customer({
    customer_id: "8994832062", 
    login_customer_id: "6660112223",
    refresh_token: refreshToken,
  });