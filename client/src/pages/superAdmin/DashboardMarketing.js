import React, {useEffect, useState} from 'react'
import './dashboardMarketing.css'
import Papa from 'papaparse';
import axios from 'axios'
import SidebarSuperAdmin from '../../components/SideBar/SidebarSuperAdmin';
import pen from '../../imgs/pen.png';
import penSmall from '../../imgs/pen-small.png';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement } from 'chart.js';
import FontiModal from './components/FontiModal';

ChartJS.register(
  BarElement
);

//const googleAdsService = new GoogleAdsService(configuration);

const OrganizzazioneModal = ({saveOrganizzazione, ecp, setModalOrg, organizzazione}) => {
  const [selectedOption, setSelectedOption] = useState(organizzazione && organizzazione);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  return (
    <div className='modal-organizzazione-container'>
      <div className='modal-organizzazione'>
        <span onClick={() => setModalOrg(false)}>x</span>
        <h4>Organizzazione</h4>
        <p>Seleziona filtro</p>
          <ul className='mo-list'>
          {ecp &&
              ecp.map((opzione) => (
                <li key={opzione._id}>
                  <label>
                    <input
                      type="radio"
                      name="opzioni"
                      value={opzione._id}
                      checked={selectedOption && selectedOption.nameECP === opzione.nameECP}
                      onChange={() => handleOptionSelect(opzione)}
                    />
                    {opzione.nameECP}
                  </label>
                </li>
              ))}
          </ul>
          <button onClick={() => saveOrganizzazione(selectedOption)}>Salva</button>
      </div>

    </div>
  )
};

const DashboardMarketing = () => {
  const [organizzazione, setOrganizzazione] = useState();
  const [selectedData, setSelectedData] = useState("");
  const [selectedFonte, setSelectedFonte] = useState("");
  const [ecp, setEcp] = useState([]);
  const [originalEcp, setOriginalEcp] = useState([]);
  const [modalOrg, setModalOrg] = useState(false);
  const [modalFonti, setModalFonti] = useState(false);
  const [modalData, setModalData] = useState(false);
  const [allDataMeta, setAllDataMeta] = useState({});
  const [allDataMetaCamp, setAllDataMetaCamp] = useState();
  const selectedToken = "EAAN2JZAnVsjYBO5p5tZB9EST7ObjNhFo9pTebPFTdSYOFttfJBVkt0GXcChS3dZCdDJbXgtfLjJqUDBQo3iM45v82xhny30hpQPWuaVg5nY1AgxvkKj458d8iwX4jSxVO8boORyWKT5pMTyAMLkrGWOuH6Qq4mQhb2jTU5ivFHHyrTTBpxCz5T4PGg6wi8kWBoJqIfE";
  const [data, setData] = useState();
  const [dataFonti, setDataFonti] = useState();
  const [dataFonti2, setDataFonti2] = useState();
  const [dataFonti3, setDataFonti3] = useState();

  const [leads, setLeads] = useState();
  
  const [percNonRisp, setPercNonRisp] = useState();
  const [percNonValid, setPercNonValid] = useState();
  const [percVend, setPercVend] = useState();
  const [percDaCont, setPercDaCont] = useState();
  const [percInLav, setPercInLav] = useState();
  const [percNonInt, setPercNonInt] = useState();
  const [percInVal, setPercInVal] = useState();
  const [percOpp, setPercOpp] = useState();
  const [percNonAss, setPercNonAss] = useState();

  const [nonRispLea, setNonRispLea] = useState();
  const [nonValLea, setNonValLea] = useState();
  const [venLea, setVenLea] = useState();
  const [daContLea, setDaContLea] = useState();
  const [inLavLea, setInLavLea] = useState();
  const [nonIntLea, setNonIntLea] = useState();
  const [inValLea, setInValLea] = useState();
  const [oppLea, setOppLea] = useState();
  const [nonAssLea, setNonAssLea] = useState();

  const dataLineChart = (leadsTotal) => {
    const nonRisponde = leadsTotal.filter(lead => lead.esito === 'Non risponde');
    const daContattare = leadsTotal.filter(lead => lead.esito === 'Da contattare');
    const nonValido = leadsTotal.filter(lead => lead.esito === 'Non valido');
    const venduto = leadsTotal.filter(lead => lead.esito === 'Venduto');
    const inLavorazione = leadsTotal.filter(lead => lead.esito === 'In lavorazione'); 
    const nonInteressato = leadsTotal.filter(lead => lead.esito === 'Non interessato'); 
    const inValutazione = leadsTotal.filter(lead => lead.esito === 'In valutazione'); 
    const opportunità = leadsTotal.filter(lead => lead.esito === 'Opportunità'); 
    const nonAssegnato = leadsTotal.filter(lead => lead.esito == ''); 

    const metaLeadNonRis = nonRisponde.filter(lead => lead.campagna == "Social");
    const metaLeadDaCont = daContattare.filter(lead => lead.campagna == "Social"); 
    const metaLeadNonVal = nonValido.filter(lead => lead.campagna == "Social");
    const metaLeadVend = venduto.filter(lead => lead.campagna == "Social"); 
    const metaLeadInLav = inLavorazione.filter(lead => lead.campagna == "Social");
    const metaLeadNonInt = nonInteressato.filter(lead => lead.campagna == "Social"); 
    const metaLeadInVal = inValutazione.filter(lead => lead.campagna == "Social");
    const metaLeadOpp = opportunità.filter(lead => lead.campagna == "Social"); 
    const metaLeadNonAss = nonAssegnato.filter(lead => lead.campagna == "Social");

    const googleLeadNonRis = nonRisponde.filter(lead => lead.campagna == "Wordpress"  && lead.utmSource && lead.utmSource == "Meta");
    const googleLeadDaCont = daContattare.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta"); 
    const googleLeadNonVal = nonValido.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta");
    const googleLeadVend = venduto.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta"); 
    const googleLeadInLav = inLavorazione.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta");
    const googleLeadNonInt = nonInteressato.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta"); 
    const googleLeadInVal = inValutazione.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta");
    const googleLeadOpp = opportunità.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta"); 
    const googleLeadNonAss = nonAssegnato.filter(lead => lead.campagna == "Wordpress" && lead.utmSource && lead.utmSource == "Meta");

    const googleAdsNonRis = nonRisponde.filter(lead => lead.campagna == "Wordpress" /* && lead.utmSource && lead.utmSource == "Google"*/);
    const googleAdsDaCont = daContattare.filter(lead => lead.campagna == "Wordpress"); 
    const googleAdsNonVal = nonValido.filter(lead => lead.campagna == "Wordpress");
    const googleAdsVend = venduto.filter(lead => lead.campagna == "Wordpress"); 
    const googleAdsInLav = inLavorazione.filter(lead => lead.campagna == "Wordpress");
    const googleAdsNonInt = nonInteressato.filter(lead => lead.campagna == "Wordpress"); 
    const googleAdsInVal = inValutazione.filter(lead => lead.campagna == "Wordpress");
    const googleAdsOpp = opportunità.filter(lead => lead.campagna == "Wordpress"); 
    const googleAdsNonAss = nonAssegnato.filter(lead => lead.campagna == "Wordpress");

    const dataFonti = {
      labels: ['Google'],
      datasets: [
        {
          label: 'Non risponde',
          backgroundColor: '#F88600', // Colore per l'esito 1
          borderColor: '#F88600',
          borderWidth: 1,
          hoverBackgroundColor: '#F88600',
          hoverBorderColor: '#FFF',
          data: [googleAdsNonRis.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Da contattare',
          backgroundColor: '#94B7D3', // Colore per l'esito 1
          borderColor: '#94B7D3',
          borderWidth: 1,
          hoverBackgroundColor: '#94B7D3',
          hoverBorderColor: '#FFF',
          data: [googleAdsDaCont.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non Valido',
          backgroundColor: '#263F45', // Colore per l'esito 1
          borderColor: '#263F45',
          borderWidth: 1,
          hoverBackgroundColor: '#263F45',
          hoverBorderColor: '#FFF',
          data: [googleAdsNonVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Venduto',
          backgroundColor: '#30978B', // Colore per l'esito 1
          borderColor: '#30978B',
          borderWidth: 1,
          hoverBackgroundColor: '#30978B',
          hoverBorderColor: '#FFF',
          data: [googleAdsVend.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In lavorazione',
          backgroundColor: '#426487', // Colore per l'esito 1
          borderColor: '#426487',
          borderWidth: 1,
          hoverBackgroundColor: '#426487',
          hoverBorderColor: '#FFF',
          data: [googleAdsInLav.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non interessato',
          backgroundColor: '#852F1F', // Colore per l'esito 1
          borderColor: '#852F1F',
          borderWidth: 1,
          hoverBackgroundColor: '#852F1F',
          hoverBorderColor: '#FFF',
          data: [googleAdsNonInt.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In valutazione',
          backgroundColor: '#3471CC', // Colore per l'esito 1
          borderColor: '#3471CC',
          borderWidth: 1,
          hoverBackgroundColor: '#3471CC',
          hoverBorderColor: '#FFF',
          data: [googleAdsInVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Opportunità',
          backgroundColor: '#FBBC05', // Colore per l'esito 2
          borderColor: '#FBBC05',
          borderWidth: 1,
          hoverBackgroundColor: '#FBBC05',
          hoverBorderColor: '#FFF',
          data: [googleAdsOpp.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
        {
          label: 'Non assegnato',
          backgroundColor: '#DF5F8D', // Colore per l'esito 2
          borderColor: '#DF5F8D',
          borderWidth: 1,
          hoverBackgroundColor: '#DF5F8D',
          hoverBorderColor: '#FFF',
          data: [googleAdsNonAss.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
      ],
    };

    const dataFonti2 = {
      labels: ['Meta Ads'],
      datasets: [
        {
          label: 'Non risponde',
          backgroundColor: '#F88600', // Colore per l'esito 1
          borderColor: '#F88600',
          borderWidth: 1,
          hoverBackgroundColor: '#F88600',
          hoverBorderColor: '#FFF',
          data: [googleLeadNonRis.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Da contattare',
          backgroundColor: '#94B7D3', // Colore per l'esito 1
          borderColor: '#94B7D3',
          borderWidth: 1,
          hoverBackgroundColor: '#94B7D3',
          hoverBorderColor: '#FFF',
          data: [googleLeadDaCont.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non Valido',
          backgroundColor: '#263F45', // Colore per l'esito 1
          borderColor: '#263F45',
          borderWidth: 1,
          hoverBackgroundColor: '#263F45',
          hoverBorderColor: '#FFF',
          data: [googleLeadNonVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Venduto',
          backgroundColor: '#30978B', // Colore per l'esito 1
          borderColor: '#30978B',
          borderWidth: 1,
          hoverBackgroundColor: '#30978B',
          hoverBorderColor: '#FFF',
          data: [googleLeadVend.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In lavorazione',
          backgroundColor: '#426487', // Colore per l'esito 1
          borderColor: '#426487',
          borderWidth: 1,
          hoverBackgroundColor: '#426487',
          hoverBorderColor: '#FFF',
          data: [googleLeadInLav.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non interessato',
          backgroundColor: '#852F1F', // Colore per l'esito 1
          borderColor: '#852F1F',
          borderWidth: 1,
          hoverBackgroundColor: '#852F1F',
          hoverBorderColor: '#FFF',
          data: [googleLeadNonInt.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In valutazione',
          backgroundColor: '#3471CC', // Colore per l'esito 1
          borderColor: '#3471CC',
          borderWidth: 1,
          hoverBackgroundColor: '#3471CC',
          hoverBorderColor: '#FFF',
          data: [googleLeadInVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Opportunità',
          backgroundColor: '#FBBC05', // Colore per l'esito 2
          borderColor: '#FBBC05',
          borderWidth: 1,
          hoverBackgroundColor: '#FBBC05',
          hoverBorderColor: '#FFF',
          data: [googleLeadOpp.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
        {
          label: 'Non assegnato',
          backgroundColor: '#DF5F8D', // Colore per l'esito 2
          borderColor: '#DF5F8D',
          borderWidth: 1,
          hoverBackgroundColor: '#DF5F8D',
          hoverBorderColor: '#FFF',
          data: [googleLeadNonAss.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
      ],
    };

    const dataFonti3 = {
      labels: ['Meta Leads'],
      datasets: [
        {
          label: 'Non risponde',
          backgroundColor: '#F88600', // Colore per l'esito 1
          borderColor: '#F88600',
          borderWidth: 1,
          hoverBackgroundColor: '#F88600',
          hoverBorderColor: '#FFF',
          data: [metaLeadNonRis.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Da contattare',
          backgroundColor: '#94B7D3', // Colore per l'esito 1
          borderColor: '#94B7D3',
          borderWidth: 1,
          hoverBackgroundColor: '#94B7D3',
          hoverBorderColor: '#FFF',
          data: [ metaLeadDaCont.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non Valido',
          backgroundColor: '#263F45', // Colore per l'esito 1
          borderColor: '#263F45',
          borderWidth: 1,
          hoverBackgroundColor: '#263F45',
          hoverBorderColor: '#FFF',
          data: [ metaLeadNonVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Venduto',
          backgroundColor: '#30978B', // Colore per l'esito 1
          borderColor: '#30978B',
          borderWidth: 1,
          hoverBackgroundColor: '#30978B',
          hoverBorderColor: '#FFF',
          data: [ metaLeadVend.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In lavorazione',
          backgroundColor: '#426487', // Colore per l'esito 1
          borderColor: '#426487',
          borderWidth: 1,
          hoverBackgroundColor: '#426487',
          hoverBorderColor: '#FFF',
          data: [ metaLeadInLav.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Non interessato',
          backgroundColor: '#852F1F', // Colore per l'esito 1
          borderColor: '#852F1F',
          borderWidth: 1,
          hoverBackgroundColor: '#852F1F',
          hoverBorderColor: '#FFF',
          data: [metaLeadNonInt.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'In valutazione',
          backgroundColor: '#3471CC', // Colore per l'esito 1
          borderColor: '#3471CC',
          borderWidth: 1,
          hoverBackgroundColor: '#3471CC',
          hoverBorderColor: '#FFF',
          data: [metaLeadInVal.length], // Inserisci qui i dati dei lead con esito 1 per ciascuna fonte
        },
        {
          label: 'Opportunità',
          backgroundColor: '#FBBC05', // Colore per l'esito 2
          borderColor: '#FBBC05',
          borderWidth: 1,
          hoverBackgroundColor: '#FBBC05',
          hoverBorderColor: '#FFF',
          data: [ metaLeadOpp.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
        {
          label: 'Non assegnato',
          backgroundColor: '#DF5F8D', // Colore per l'esito 2
          borderColor: '#DF5F8D',
          borderWidth: 1,
          hoverBackgroundColor: '#DF5F8D',
          hoverBorderColor: '#FFF',
          data: [metaLeadNonAss.length], // Inserisci qui i dati dei lead con esito 2 per ciascuna fonte
        },
      ],
    };

    setDataFonti(dataFonti);
    setDataFonti2(dataFonti2);
    setDataFonti3(dataFonti3);
  };

  const getRequestFromFacebook = () => {
    const url = 'https://graph.facebook.com/v17.0/act_881135543153413/campaigns';
    const params = {
      fields: 'name,insights{inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,cpm,conversions,spend,ctr,cpc,clicks,impressions}',
      access_token: selectedToken,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        const logs = [];
        if (Array.isArray(dataFromFacebook)) {
          console.log(dataFromFacebook)
          for (const element of dataFromFacebook) {
            const { name, insights, id } = element;

            if (insights && insights.data && insights.data.length > 0) {
              for (const ins of insights.data) {
                  //console.log(ins);
                  const log = {
                        name: name,
                        id: id,
                        clicks: ins.clicks,
                        adcost_per_inline_link_clicksets: ins.cost_per_inline_link_click,
                        cpc: ins.cpc,
                        cpm: ins.cpm,
                        ctr: ins.ctr,
                        inline_link_click_ctr: ins.inline_link_click_ctr,
                        inline_link_clicks: ins.inline_link_clicks,
                        impressions: ins.impressions,
                        spend: ins.spend,
                        date_start: ins.date_start,
                        date_stop: ins.date_stop,
                    };
                      logs.push(log);
              }
            }
          }

          setAllDataMetaCamp(logs);
        } else {
          console.error("dataFromFacebook non è un array");
        }
      })
      .catch(error => {
        console.error('Errore:', error);
      });

  };

  const getRequestAllDataMeta = () => {
    const url = 'https://graph.facebook.com/v17.0/act_881135543153413/insights';
    const params = {
      fields: 'ctr,cpc,cpm,clicks,impressions,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,conversions,spend',
      access_token: selectedToken,
    };

    axios.get(url, { params })
      .then(response => {
        const dataFromFacebook = response.data.data;
        //console.log(dataFromFacebook);
        if (Array.isArray(dataFromFacebook)) {
          setAllDataMeta(dataFromFacebook[0]);
        } else {
          console.error("dataFromFacebook non è un array");
        }
      })
      .catch(error => {
        console.error('Errore:', error);
      });

  };

  const getAllLeadsAdmin = async () => {
    axios.get('/getAllLeads-admin')
      .then(response => {
        const leads = response.data;
        console.log(leads);
        setLeads(leads);

        dataLineChart(leads);

        const nonRisponde = leads.filter(lead => lead.esito === 'Non risponde');
        const daContattare = leads.filter(lead => lead.esito === 'Da contattare');
        const nonValido = leads.filter(lead => lead.esito === 'Non valido');
        const venduto = leads.filter(lead => lead.esito === 'Venduto');
        const inLavorazione = leads.filter(lead => lead.esito === 'In lavorazione'); 
        const nonInteressato = leads.filter(lead => lead.esito === 'Non interessato'); 
        const inValutazione = leads.filter(lead => lead.esito === 'In valutazione'); 
        const opportunità = leads.filter(lead => lead.esito === 'Opportunità'); 
        const nonAssegnato = leads.filter(lead => lead.esito == ''); 

        const totalLeads = leads.length;

        // Utilizza i dati filtrati come desiderato
        setNonRispLea(nonRisponde);
        setNonValLea(nonValido);
        setVenLea(venduto);
        setDaContLea(daContattare);
        setInLavLea(inLavorazione);
        setNonIntLea(nonInteressato);
        setInValLea(inValutazione);
        setOppLea(opportunità);
        setNonAssLea(nonAssegnato);
        

        //percentuali
        const totalNonRisponde = nonRisponde.length;
        const totalNonValido = nonValido.length;
        const totalDaCont = daContattare.length;
        const totalVenduti = venduto.length;
        const totalInLavorazione = inLavorazione.length; 
        const totalNonInteressato = nonInteressato.length; 
        const totalInValutazione = inValutazione.length; 
        const totalOpportunità = opportunità.length; 
        const totalNonAssegnato = nonAssegnato.length;

        const percNonRisp = (totalNonRisponde / totalLeads * 100).toFixed(1);
        const percNonValid = (totalNonValido / totalLeads * 100).toFixed(1);
        const percDaCont = (totalDaCont / totalLeads * 100).toFixed(1);
        const percVend = (totalVenduti / totalLeads * 100).toFixed(1);
        const percInLav = (totalInLavorazione / totalLeads * 100).toFixed(1);
        const percNonInt = (totalNonInteressato / totalLeads * 100).toFixed(1);
        const percInVal = (totalInValutazione / totalLeads * 100).toFixed(1);
        const percOpp = (totalOpportunità / totalLeads * 100).toFixed(1);
        const percNonAss = (totalNonAssegnato / totalLeads * 100).toFixed(1);

        setPercNonRisp(percNonRisp);
        setPercNonValid(percNonValid);
        setPercOpp(percOpp);
        setPercVend(percVend);
        setPercNonAss(percNonAss);
        setPercInVal(percInVal);
        setPercNonInt(percNonInt);
        setPercInLav(percInLav);
        setPercDaCont(percDaCont);

        const newData = {
          labels: [],
          datasets: [
            {
              data: [percNonRisp, percNonValid, percOpp, percVend, percDaCont, percInLav, percNonInt, percNonAss, percInVal],
              backgroundColor: [
                '#F88600',
                '#263F45',
                '#FBBC05',
                '#30978B',
                '#94B7D3',
                '#426487',
                '#852F1F',
                '#DF5F8D',
                '#3471CC',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 0,
            },
          ],
        };

        setData(newData);

      })
      .catch(error => {
        console.error('Errore nel recupero dei lead:', error);
      });
  }

  useEffect(() => {
    getRequestFromFacebook();
    getRequestAllDataMeta();
    getAllLeadsAdmin();
  }, []);

  const filterOrganizzazione = (organizzazione) => {
    const nonRisponde = leads.filter(lead => lead.esito === 'Non risponde' && lead.utente !== null && lead.utente == organizzazione._id);
    const daContattare = leads.filter(lead => lead.esito === 'Da contattare' && lead.utente !== null && lead.utente == organizzazione._id);
    const nonValido = leads.filter(lead => lead.esito === 'Non valido' && lead.utente !== null && lead.utente == organizzazione._id);
    const venduto = leads.filter(lead => lead.esito === 'Venduto' && lead.utente !== null && lead.utente == organizzazione._id);
    const inLavorazione = leads.filter(lead => lead.esito === 'In lavorazione' && lead.utente !== null && lead.utente == organizzazione._id); 
    const nonInteressato = leads.filter(lead => lead.esito === 'Non interessato' && lead.utente !== null && lead.utente == organizzazione._id); 
    const inValutazione = leads.filter(lead => lead.esito === 'In valutazione' && lead.utente !== null && lead.utente == organizzazione._id); 
    const opportunità = leads.filter(lead => lead.esito === 'Opportunità' && lead.utente !== null && lead.utente == organizzazione._id); 
    const nonAssegnato = leads.filter(lead => lead.esito == '' && lead.utente !== null && lead.utente == organizzazione._id); 

    const totalNonRisponde = nonRisponde.length;
    const totalNonValido = nonValido.length;
    const totalDaCont = daContattare.length;
    const totalVenduti = venduto.length;
    const totalInLavorazione = inLavorazione.length; 
    const totalNonInteressato = nonInteressato.length; 
    const totalInValutazione = inValutazione.length; 
    const totalOpportunità = opportunità.length; 
    const totalNonAssegnato = nonAssegnato.length;

    const leadsOrg = leads.filter(lead => lead.utente == organizzazione._id);
    dataLineChart(leadsOrg);
    const totalLeads = leadsOrg.length;

    const percNonRisp = (totalNonRisponde / totalLeads * 100).toFixed(1);
    const percNonValid = (totalNonValido / totalLeads * 100).toFixed(1);
    const percDaCont = (totalDaCont / totalLeads * 100).toFixed(1);
    const percVend = (totalVenduti / totalLeads * 100).toFixed(1);
    const percInLav = (totalInLavorazione / totalLeads * 100).toFixed(1);
    const percNonInt = (totalNonInteressato / totalLeads * 100).toFixed(1);
    const percInVal = (totalInValutazione / totalLeads * 100).toFixed(1);
    const percOpp = (totalOpportunità / totalLeads * 100).toFixed(1);
    const percNonAss = (totalNonAssegnato / totalLeads * 100).toFixed(1);

    setPercNonRisp(percNonRisp);
    setPercNonValid(percNonValid);
    setPercOpp(percOpp);
    setPercVend(percVend);
    setPercNonAss(percNonAss);
    setPercInVal(percInVal);
    setPercNonInt(percNonInt);
    setPercInLav(percInLav);
    setPercDaCont(percDaCont);

    const newData = {
      labels: [],
      datasets: [
        {
          data: [percNonRisp, percNonValid, percOpp, percVend, percDaCont, percInLav, percNonInt, percNonAss, percInVal],
          backgroundColor: [
            '#F88600',
            '#263F45',
            '#FBBC05',
            '#30978B',
            '#94B7D3',
            '#426487',
            '#852F1F',
            '#DF5F8D',
            '#3471CC',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 0,
        },
      ],
    };

    setData(newData);
  };

  const datiInsights = [
    { nome: 'Impression', valore: allDataMeta && Number(allDataMeta.impressions), percentuale: '+2%' },
    { nome: 'Click', valore: allDataMeta && allDataMeta.clicks, percentuale: '+2%' },
    { nome: 'CTR', valore: allDataMeta && Number(allDataMeta.ctr).toFixed(2) + '%', percentuale: '+2%' },
    { nome: 'CPC', valore: allDataMeta && Number(allDataMeta.cpc).toFixed(2) + '€', percentuale: '+2%' },
    { nome: 'Conversioni', valore: leads && leads.length > 0 && leads.length, percentuale: '+2%' },
    { nome: 'CPM', valore: allDataMeta && Number(allDataMeta.cpm).toFixed(2) + '€', percentuale: '+2%' },
    { nome: 'CR', valore: leads && leads.length > 0 && allDataMeta && Number(leads.length / allDataMeta.clicks).toFixed(2) + '%', percentuale: '+2%' },
    { nome: 'Opportunità', valore: daContLea && daContLea.length, percentuale: '+2%' },
    { nome: 'Cost/Opp', valore: allDataMeta && daContLea && (allDataMeta.spend / daContLea.length).toFixed(2) + '€', percentuale: '+2%' },
    { nome: 'Cost/Iscr', valore: allDataMeta && venLea && (allDataMeta.spend / venLea.length).toFixed(2) + '€', percentuale: '+2%' },
    { nome: 'Iscrizione', valore: venLea && venLea.length, percentuale: '+2%' },
  ];

  const fetchData = async () => {
    try {
      const response = await axios.get('/get-all-user-super-admin');
      const usersWithPaymentsAndLeads = response.data;

      setEcp(usersWithPaymentsAndLeads);
      setOriginalEcp(usersWithPaymentsAndLeads);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveOrganizzazione = (org) => {
    setModalOrg(false);
    setOrganizzazione(org);
    filterOrganizzazione(org);
  };

  const saveFonti = (org) => {
    setModalFonti(false);
    setSelectedFonte(org);
  };

  const placeholdercake = {
    labels: [],
    datasets: [
        {
            data: [20, 20, 20, 20, 20],
            backgroundColor: [
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
            ],
            borderColor: [
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
                '#D3D3D3',
            ],
            borderWidth: 0,
        },
    ],
};

const options = {
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false, // Rimuovi le linee della griglia verticali per l'asse x
      },
      ticks: {
        fontSize: 8,
      },
    },
    y: {
      stacked: true,
      ticks: {
        fontSize: 8,
      },
    },
  },
  plugins: {
    legend: {
      display: false, 
    },
  },
  elements: {
    bar: {
      borderWidth: 0, // Imposta la larghezza del bordo delle barre a 0 per rimuovere le linee verticali
    },
  },
  categorySpacing: 0,
};

const handleRemoveFilter = () => {
  setOrganizzazione();
  setSelectedData("");
  const totalNonRisponde = nonRispLea.length;
  const totalNonValido = nonValLea.length;
  const totalDaCont = daContLea.length;
  const totalVenduti = venLea.length;
  const totalInLavorazione = inLavLea.length; 
  const totalNonInteressato = nonIntLea.length; 
  const totalInValutazione = inValLea.length; 
  const totalOpportunità = oppLea.length; 
  const totalNonAssegnato = nonAssLea.length;

  dataLineChart(leads);
  const totalLeads = leads.length;

  const percNonRisp = (totalNonRisponde / totalLeads * 100).toFixed(1);
  const percNonValid = (totalNonValido / totalLeads * 100).toFixed(1);
  const percDaCont = (totalDaCont / totalLeads * 100).toFixed(1);
  const percVend = (totalVenduti / totalLeads * 100).toFixed(1);
  const percInLav = (totalInLavorazione / totalLeads * 100).toFixed(1);
  const percNonInt = (totalNonInteressato / totalLeads * 100).toFixed(1);
  const percInVal = (totalInValutazione / totalLeads * 100).toFixed(1);
  const percOpp = (totalOpportunità / totalLeads * 100).toFixed(1);
  const percNonAss = (totalNonAssegnato / totalLeads * 100).toFixed(1);

  setPercNonRisp(percNonRisp);
  setPercNonValid(percNonValid);
  setPercOpp(percOpp);
  setPercVend(percVend);
  setPercNonAss(percNonAss);
  setPercInVal(percInVal);
  setPercNonInt(percNonInt);
  setPercInLav(percInLav);
  setPercDaCont(percDaCont);

  const newData = {
    labels: [],
    datasets: [
      {
        data: [percNonRisp, percNonValid, percOpp, percVend, percDaCont, percInLav, percNonInt, percNonAss, percInVal],
        backgroundColor: [
          '#F88600',
          '#263F45',
          '#FBBC05',
          '#30978B',
          '#94B7D3',
          '#426487',
          '#852F1F',
          '#DF5F8D',
          '#3471CC',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 0,
      },
    ],
  };

  setData(newData);
};

const handleRemoveFilterBot = () => {
  setSelectedData("");
  setSelectedFonte("");
};



  return (
    <div className='big-container'>
      <SidebarSuperAdmin />
      {modalOrg && (
        <div className='shadows'>
            <OrganizzazioneModal saveOrganizzazione={saveOrganizzazione} ecp={ecp} setModalOrg={setModalOrg} organizzazione={organizzazione}/>
        </div>    
          )}
      {modalFonti && (
        <div className='shadows'>
            <FontiModal saveOrganizzazione={saveFonti} setModalOrg={setModalFonti} organizzazione={selectedFonte}/>
        </div>    
          )}    
      <div className='dashboard-marketing'>
        <div className='dm-top'>
          <div className='dmt-organizzazione'>
            <h4>Organizzazione <img src={pen} alt='Penna' style={{cursor: 'pointer'}} onClick={() => setModalOrg(true)} /></h4>
            <p>{organizzazione && organizzazione.nameECP}</p>
          </div>
          <div className='dmt-data'>
            <h4>Data <img src={pen} alt='Penna' style={{cursor: 'pointer'}} onClick={() => setModalData(true)} /></h4>
            <p>{selectedData}</p>
          </div>
          <div className='dmt-button'>
            <button>Applica filtri</button>
            <button onClick={handleRemoveFilter}>Rimuovi filtri</button>
          </div>
        </div>

        <div className='dm-analytics'>
          <div className='dma-esiti-fonte'>
            <h4>Grafico <font color='#3471CC'>esiti per fonte</font></h4>
            {dataFonti && dataFonti2 && dataFonti3 ?
            <div className='grafico-fonte'> 
              <Bar data={dataFonti && dataFonti} options={options} />
              <Bar data={dataFonti3 && dataFonti3} options={options} />
              <Bar data={dataFonti2 && dataFonti2} options={options} />
            </div>
            : "Loading.."}
          </div>
          <div className='dma-esiti-lead'>
            <h4>Chart <font color='#3471CC'>esiti</font></h4>
            <div>
              <div className='leggenda-esiti'>
                <div className='iscr'>
                  <p>{percVend && percVend}%</p>
                  <p>Iscrizione</p>
                </div>
                <div className='daCont'>
                  <p>{percDaCont && percDaCont}%</p>
                  <p>Da contattare</p>
                </div>
                <div className='inLav'>
                  <p>{percInLav && percInLav}%</p>
                  <p>In lavorazione</p>
                </div>
                <div className='nonVal'>
                  <p>{percNonValid && percNonValid}%</p>
                  <p>Non valido</p>
                </div>
                <div className='nonInt'>
                  <p>{percNonInt && percNonInt}%</p>
                  <p>Non interessato</p>
                </div>
                <div className='inVal'>
                  <p>{percInVal  && percInVal}%</p>
                  <p>In valutazione</p>
                </div>
                <div className='opp'>
                  <p>{percOpp && percOpp}%</p>
                  <p>Opportunità</p>
                </div>
                <div className='nonRisp'>
                  <p>{percNonRisp && percNonRisp}%</p>
                  <p>Non risponde</p>
                </div>
                <div className='nonAss'>
                  <p>{percNonAss && percNonAss}%</p>
                  <p>Non assegnato</p>
                </div>
              </div>
              <div className='grafico-esiti'>
                {data ?
                    <Doughnut data={data} />
                      :
                    <Doughnut data={placeholdercake} />
                }
              </div>
            </div>
          </div>
        </div>

        <div className='dm-performance'>
          <h5>Performance <font color='#3471CC'>Aggregate</font></h5>
          <div className='dmt-organizzazione'>
            <h6>Data <img src={penSmall} alt='Penna' style={{cursor: 'pointer'}} onClick={() => setModalData(true)} /></h6>
            <p>{selectedData && selectedData}</p>
          </div>
          <div className='dmt-data'>
            <h6>Fonte <img src={penSmall} alt='Penna' style={{cursor: 'pointer'}} onClick={() => setModalFonti(true)} /></h6>
            <p>{selectedFonte && selectedFonte}</p>
          </div>
          <div className='dmp-button'>
            <button>Applica filtri</button>
            <button onClick={handleRemoveFilterBot}>Rimuovi filtri</button>
          </div>
        </div>

          <div className='dm-insights'>
              {datiInsights.map((item, index) => (
                <div key={index} className='dmi-item'>
                  <p>{item.nome}</p>
                  <p>{item.valore}</p>
                  <p>{item.percentuale}</p>
                </div>
              ))}
          </div>

          <div className='dm-bottom'>
            <table className='dmb-table'>
              <thead>
                <tr>
                  <th>Campagna</th>
                  <th>Impression</th>
                  <th>Click</th>
                  <th>CTR</th>
                  <th>CPC  </th>
                  <th>Conversioni</th>
                  <th>CPM  </th>
                  <th>CR   </th>
                  <th>Opportunità</th>
                  <th>Cost/Opp</th>
                  <th>Cost/Iscr</th>
                  <th>Iscrizioni</th>
                </tr>
              </thead>
              <tbody>
                {allDataMetaCamp && allDataMetaCamp.map((dato) => {
                  const numberCtr = Number(dato.ctr);
                  const numberCpc = Number(dato.cpc);
                  const numberCpm = Number(dato.cpm);
                  const opp = leads && leads.filter((lead) => lead.esito == "Da contattare" && lead.campagna == "Social" ? lead.nameCampagna == dato.name : lead.utmCampaign == dato.name);
                  const ven = leads && leads.filter((lead) => lead.esito == "Venduto" && lead.campagna == "Social" ? lead.nameCampagna == dato.name : lead.utmCampaign == dato.name);
                  const lead = leads && leads.filter((lead) => lead.campagna == "Social" ? lead.nameCampagna == dato.name : lead.utmCampaign == dato.name)
                  return (
                  <tr key={allDataMetaCamp.id}>
                    <td>{dato.name}</td>
                    <td>{dato.impressions}</td>
                    <td>{dato.clicks}</td>
                    <td>{numberCtr.toFixed(2) + '%'}</td>
                    <td>{numberCpc.toFixed(2) + "€"}</td>
                    <td>{lead && lead.length}</td>
                    <td>{numberCpm.toFixed(2) + "€"}</td>
                    <td>{lead && Number(lead.length / dato.clicks).toFixed(2) + '%'}</td>
                    <td>{opp && opp.length}</td>
                    <td>{allDataMeta && opp && opp.length > 0 ? Number(allDataMeta.spend / opp.length).toFixed(2) : 0}€</td>
                    <td>{allDataMeta && ven && ven.length > 0 ? Number(allDataMeta.spend / ven.length).toFixed(2) : 0}€</td>
                    <td>{ven && ven.length}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

      </div>
  )
}

export default DashboardMarketing