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

exports.listLeads = async (body) => {
  try {
    const response = await nexus.post('/lead/api/list', body);
    return response.data;
  } catch (error) {
    console.error('Error listing leads from Nexus:', error?.response?.data || error.message);
    throw error;
  }
};

exports.fetchLeads = async () => {
  try {
    // Default minimal list (debug)
    return await exports.listLeads({
      select: "t.id, t.numerazione",
      conditions: "",
      group: "",
      having: "",
      order: "",
      limit: "5",
      offset: "",
      page: "",
      pageSize: ""
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
};

exports.saveLead = async (leadData) => {
    try {
      const response = await nexus.post('/lead/api/set', leadData);
      console.log('Lead saved/updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }

exports.getLeadById = async (idNexus) => {
  try {
    // API: GET /lead/api/get?id=...
    const response = await nexus.get('/lead/api/get', { params: { id: idNexus } });
    return response.data;
  } catch (error) {
    console.error('Error fetching lead from Nexus:', error?.response?.data || error.message);
    throw error;
  }
}
