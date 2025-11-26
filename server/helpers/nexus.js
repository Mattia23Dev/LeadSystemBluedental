const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//refresh 8O3sHfo4yI2H6YD0YW4H0cG7oOlNM7k1ng2aI6UEMiVby8rsHDYGvpTpz5JcuNQ2
const nexus = axios.create({
  //baseURL: "https://test-bludental.hisolution.it",
  baseURL: "https://bludental.hisolution.it",
  headers: {
    "Authorization": "Bearer VOXJZAbRz13TJU0YzOZRLv1A94RgQabxdougnKudA2RnCo2SqT8ci0cLQoUiSxoQ",
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
