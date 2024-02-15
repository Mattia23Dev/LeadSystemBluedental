import React, {useEffect, useState} from 'react'
import './dashboardMarketing.css'
import Papa from 'papaparse';
import axios from 'axios'
import moment from 'moment';

const ExportCsv = () => {
  const [leadData, setLeadData] = useState([]);

  const generateCsvLead = () => {
    if (leadData && leadData.length > 0) {
      const csvData = leadData.map((lead) => {
        const formattedDate = moment(lead.data).format('YYYY-MM-DD HH:mm');
        const formattedChangeDate = moment(lead.dataCambiamentoEsito).format("YYYY-MM-DD HH:mm");
        return [
        formattedDate,
        lead.nome,
        lead.cognome,
        lead.email,
        lead.telefono,
        lead.id,
        lead.esito,
        formattedChangeDate,
        lead.nomeCampagna,
      ]});
      
      const csv = Papa.unparse({
        fields: ['Data', 'Nome', 'Cognome', 'Email', 'Telefono', 'ID', 'Esito', 'Cambiamento Esito', 'Nome Campagna'],
        data: csvData,
      });
  
      const blob = new Blob([csv], { type: "data:text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'lead.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('Non ci sono dati da esportare.');
    }
  };

  useEffect(() => {
  axios.get('/leads-for-marketing')
      .then((response) => {
        console.log(response.data);
        setLeadData(response.data.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div>
      <button onClick={generateCsvLead}>Scarica csv</button>
    </div>
  )
}

export default ExportCsv;