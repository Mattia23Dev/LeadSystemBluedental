const LeadFacebook = require('../models/leadFacebook');
const showDebugingInfo = true; 
'use strict';
const cron = require('node-cron');
const axios = require('axios');

const accessToken = 'EAAD6mNGgHKABO0VRMoANGbKwcHT4xFBwjf1vZBEu1QwThbS8vQEEGcX8L9Yw2k99cZCIMncdZBGRm9QbbIiZCWrVzNIWvGEjeGhvUdM7eanwQZCTTOycgif5ZAvJZBQdD7sh2illondwZBIJhx1lpbZCbK7iZBIKkuwwTOK5TOAvVMzEovRdpFpmrBdvja';
const apiUrl = 'https://graph.facebook.com/v23.0';
const idCampagna = '23858081191190152'; //ECP [LEAD ADS] - LAL Vendite - vantaggi VIDEO
const idCampagna2 = '23859089103880152'; //ECP - [LEAD ADS] - Master
const fields = 'id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}';

//LEADS 
const TOKENBLUDENTAL = "EAAQEkt9HVpsBO7h8lcZBd6thaRw6R97f3qY9eL5gKKBvztF5ptXT4DpnYXdpZAftTQ27GyKXVCd6gVRagmD9BPviODvOGxFbAzWCJCsgewvEwR3UPov6zzIwK8ZAZA2RGN1gfubE04C3BNFskgZAlpWhNfZCKJFhDsMK9xvqAtvbKEwVcuZBJOPBXg5";
const TOKENMIO = "EAAFdJPhqYRYBOzM5ueAFLxbzr6bhkJxeXmDxdaGx6nyi05ERuAgLFS4B55xM1EWWl5XhCoKhi9ZAHwmqRUMGcs66xHLKLjn3gsZBActOAhZAiQlLySDDb3zyZCQkMWOZA1geR4q7uI9Ri7g4LZBFi3daUyRbBwyA9ERhR3u1RkRcTky9JlVZCA4D5rL";
const TOKEN1 = "EAAFdJPhqYRYBO7VZCpS19G591YHAF5S4v5HoVFOZBsA2NAejYULxTW6oteZC99OWLeMeXpQnThinhRVmIoZCrLpQXDaO0HL3sgbZAAFEj52Miu1H7ZCvzcjqL0mdZA6UynyKZB8r9RIA5u2OFOiEChTSxMPZB2LNV1g3hzxaHypoEA8ICnQD8NyvKfuTF";
const { GoogleAdsApi, enums  } = require('google-ads-api');
const Lead = require('../models/lead');

// Intervallo (UTC) di ieri in Unix timestamp per since/until
function getYesterdayUnixRange() {
  const now = new Date();
  const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // porta a ieri (UTC)
  y.setUTCDate(y.getUTCDate() - 1);
  const start = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 23, 59, 59));
  return {
    since: Math.floor(start.getTime() / 1000),
    until: Math.floor(end.getTime() / 1000),
  };
}

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
    const campaignsUrl = `${apiUrl}/act_511963014361529/campaigns`;
    const { since, until } = getYesterdayUnixRange();

    // Helper locale per paginazione semplice
    const fetchAllPages = async (url, params) => {
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      const results = [];
      let nextUrl = url;
      let nextParams = params;
      for (let i = 0; i < 1000 && nextUrl; i += 1) {
        const res = await axios.get(nextUrl, { params: nextParams });
        const data = res && res.data && res.data.data ? res.data.data : [];
        if (Array.isArray(data) && data.length > 0) results.push(...data);
        const next = res && res.data && res.data.paging && res.data.paging.next ? res.data.paging.next : null;
        if (!next) break;
        // throttling leggero per evitare rate limit
        await sleep(250);
        nextUrl = next;
        nextParams = undefined;
      }
      return results;
    };

    (async () => {
      try {
        // 1) Campagne: solo id,name
        const campaignsParams = {
          fields: 'id,name',
          effective_status: "['ACTIVE']",
          access_token: TOKEN1,
          limit: 25,
        };
        const campaigns = await fetchAllPages(campaignsUrl, campaignsParams);
        console.log("campaigns.length", campaigns.length);
        const logs = [];
        for (const campaign of campaigns) {
          // 2) Ads per campagna: solo id,name,adset{name}
          const adsUrl = `${apiUrl}/${campaign.id}/ads`;
          const adsParams = {
            fields: 'id,name,adset{name}',
            access_token: TOKEN1,
            limit: 50,
          };
          const ads = await fetchAllPages(adsUrl, adsParams);
          console.log("ads.length", ads.length);
          // 3) Leads per ad con since/until: pagina tutte
          for (const ad of ads) {
            const leadsUrl = `${apiUrl}/${ad.id}/leads`;
            const leadsParams = {
              fields: 'id,form_id,field_data',
              access_token: TOKEN1,
              since: since,
              until: until,
              limit: 100,
            };
            const leads = await fetchAllPages(leadsUrl, leadsParams);
            console.log("leads.length", leads.length);
            for (const lead of leads) {
              if (lead && Array.isArray(lead.field_data)) {
                logs.push({
                  fieldData: lead.field_data,
                  name: campaign.name || '',
                  id: lead.id || '',
                  formId: lead.form_id || '',
                  annunci: ad.name || '',
                  adsets: ad.adset && ad.adset.name ? ad.adset.name : '',
                });
              }
            }
          }
        }

        if (logs.length > 0) {
          saveLeadFromFacebookAndInstagram(logs);
        } else {
          console.log('Nessun lead trovato per il periodo richiesto');
        }
      } catch (error) {
        const status = error && error.response && error.response.status;
        const data = error && error.response && error.response.data;
        console.error('Errore getDentistaLead (flow campagne->ads->leads):', { status, data, message: error.message });
      }
    })();
  };
//ACCOUNT 2.0 ACT_627545782710130
  exports.getDentistaLead2 = () => {
    const url = `${apiUrl}/act_627545782710130/campaigns`;
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
    const url = `${apiUrl}/act_915414373405841/campaigns`;
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKEN1,
      //limit: 1,
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
        const status = error?.response?.status;
        const data = error?.response?.data;
        console.error('Errore getDentistaLead3:', { status, data, message: error.message });
      });
  };

  exports.getBludentalLead = () => {
    const url = `${apiUrl}/act_982532079362123/campaigns`;
    const params = {
      fields: 'effective_status,account_id,id,name,objective,status,adsets{name},ads{name,leads{form_id,field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKENBLUDENTAL,
      //limit: 1,
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
        console.error('Errore:', error.message);
        console.log(error.response.status);
        console.log(error.response.data)
      });
  };

  //FUNNEL 1 THL
  exports.getThlLead1 = () => {
    const url = `${apiUrl}/act_451086867638673/campaigns`;
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

  //FUNNEL 1 THL
  exports.getThlLead2 = () => {
    const url = `${apiUrl}/act_451330597692428/campaigns`;
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


  const getBludentalLeadManual = () => {
    const url = `${apiUrl}/act_982532079362123/campaigns`;
    const params = {
      fields: 'effective_status,account_id,id,name,ads{leads{field_data}}',
      effective_status: "['ACTIVE']",
      access_token: TOKENBLUDENTAL,
    };
  
    const targetEmails = [
      'dinoraffog@gmail.com',
      'archlucioreggiani@gmail.com',
      // Aggiungi altre email qui
    ];
  
    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        const loggedCampaigns = new Set(); // Set per tenere traccia delle campagne loggate
  
        if (Array.isArray(dataFromFacebook)) {
          for (const element of dataFromFacebook) {
            const excludedCampaignIds = [idCampagna, idCampagna2];
            //PER ESCLUDERE LE CAMPAGNE
            /*if (excludedCampaignIds.includes(element.id)) {
              console.log('Ho escluso:', element.id);
              continue;
            }*/
  
            const { account_id, ads, effective_status, id, name, objective, adsets, status } = element;
  
            // Logga il nome della campagna una sola volta
            if (!loggedCampaigns.has(name)) {
              console.log(`Campagna trovata: ${name}`);
              loggedCampaigns.add(name);
            }
  
            if (ads && ads.data && ads.data.length > 0) {
              for (const ad of ads.data) {
                if (ad.leads && ad.leads.data && ad.leads.data.length > 0) {
                  for (const lead of ad.leads.data) {
                    if (lead && lead.field_data && Array.isArray(lead.field_data)) {
                      const fieldData = lead.field_data;
                      const emailField = fieldData.find(field => field.name === 'email');
                      if (emailField && targetEmails.includes(emailField.values[0])) {
                        console.log(`Email trovata: ${emailField.values[0]}`);
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
                      } else {
                        console.log('no')
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          console.error("dataFromFacebook non è un array");
        }
        //saveLeadFromFacebookAndInstagram(logs);
      })
      .catch(error => {
        console.error('Errore:', error);
        console.log(error.data);
      });
  };