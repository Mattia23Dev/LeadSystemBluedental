const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nexus = axios.create({
  baseURL: "https://bludental.hisolution.it",
  headers: {
    Authorization: "Bearer VOXJZAbRz13TJU0YzOZRLv1A94RgQabxdougnKudA2RnCo2SqT8ci0cLQoUiSxoQ",
    "Content-Type": "application/json",
  },
});

exports.saveLead = async (leadData) => {
  try {
    const response = await nexus.post('/lead/api/set', leadData);
    console.log('Lead saved/updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error saving lead:', error?.response?.data || error.message);
    return null;
  }
};
