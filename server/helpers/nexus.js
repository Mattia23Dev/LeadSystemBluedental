const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nexus = axios.create({
  //baseURL: "https://test-bludental.hisolution.it",
  baseURL: "https://bludental.hisolution.it",
  headers: {
    "Authorization": "Bearer 0P4EhBbxjBAuLTXMpKxPosRqgKuT7bC8KpTfmJtbfyEQ7ZymoA0qXmNEA4EkFSsH",
    "Content-Type": "application/json",
  },
});

exports.fetchLeads = async () => {
    try {
      const response = await nexus.get('/lead/api/list');
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }

exports.saveLead = async (leadData) => {
    try {
      const response = await nexus.post('/lead/api/set', leadData);
      console.log('Lead saved/updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }
