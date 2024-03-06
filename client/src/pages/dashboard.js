import React, { useEffect, useState, useContext } from 'react'
import { SyncOutlined } from "@ant-design/icons";
import TopDash from '../components/MainDash/TopDash';
import './dashboard.scss'
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Filler,
} from 'chart.js';
import { UserContext } from '../context';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Dashboard() {
    
ChartJS.register(ArcElement, Tooltip, Legend);

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);
    const [isLoading, setIsLoading] = useState(false);
    const [state, setState] = useContext(UserContext);
    const [leadNum, setLeadNum] = useState();
    const [leadNumVenduti, setLeadNumVenduti] = useState();
    const [allLeads, setAllLeads] = useState([]);
    const [fatturatoVenduti, setFatturatoVenduti] = useState();
    const [nonValidoLeads, setNonValidoLeads] = useState();
    const [nonRispondeLeads, setNonRispondeLeads] = useState();
    const [inLavorazioneLeads, setInLavorazioneLeads] = useState();
    const [opportunitàLeads, setOpportunitàLeads] = useState();
    const [inValutazioneLeads, setInValutazioneLeads] = useState();
    const [nonInteressatoLeads, setNonInteressatoLeads] = useState();
    const [irrLeads, setIrrLeads] = useState();
    const [iscrPostLeads, setIscrPostLeads] = useState();
    const [daContattareLeads, setDaContattareLeads] = useState();
    const [vendutiLeads, setVendutoLeads] = useState();

    const [data, setData] = useState(null);
    const [percNonRisp, setPercNonRisp] = useState();
    const [percNonValid, setPercNonValid] = useState();
    const [percVend, setPercVend] = useState();
    const [percOpp, setPercOpp] = useState();
    const [percLav, setPercLav] = useState();
    const [percDaCont, setPercDaCont] = useState();
    const [percValut, setPercValut] = useState();
    const [percNonInt, setPercNonInt] = useState();
    const [percIrr, setPercIrr] = useState();
    const [percIscrPost, setPercIscrPost] = useState();

    const [prevPercNonRisp, setPrevPercNonRisp] = useState();
    const [prevPercNonValid, setPrevPercNonValid] = useState();
    const [prevPercValut, setPrevPercValut] = useState();
    const [prevPercNonInt, setPrevPercNonInt] = useState();
    const [prevPercOpp, setPrevPercOpp] = useState();
    const [prevPercVend, setPrevPercVend] = useState();
    const [prevPercInLav, setPrevPercInLav] = useState();
    const [prevPercDaCont, setPrevPercDaCont] = useState();
    const [prevPercIrr, setPrevPercIrr] = useState();
    const [prevPercIscrPost, setPrevPercIscrPost] = useState();

    const [dataLoaded, setDataLoaded] = useState(false);

    const generatePDF = () => {
        console.log('pdf');
        const doc = new jsPDF();
        doc.text('Report mensile', 10, 10);
        const leadNumVendutiPdf = leadNumVenduti > 0 ? leadNumVenduti : 0;
        const nonValidoLeadsPdf = nonValidoLeads.length > 0 ? nonValidoLeads.length : 0;
        const nonRispondeLeadsPdf = nonRispondeLeads.length > 0 ? nonRispondeLeads.length : 0;
        const inLavorazioneLeadsPdf = inLavorazioneLeads.length > 0 ? inLavorazioneLeads.length : 0;
        const daContattareLeadsPdf = daContattareLeads.length > 0 ? daContattareLeads.length : 0;
        const vendutiLeadsPdf = vendutiLeads.length > 0 ? vendutiLeads.length : 0;
        const opportunitàLeadsPdf = opportunitàLeads.length > 0 ? opportunitàLeads.length : 0;
        // Tabella 1: Informazioni generali
        const generalInfoData = [
            ['Lead totali', leadNum],
            ['Lead venduti', leadNumVendutiPdf],
            ['Fatturato venduti', `${fatturatoVenduti}€`],
        ];
        doc.text('Informazioni generali', 10, 30);
        doc.autoTable({
            startY: 35,
            head: [['Descrizione', 'Valore']],
            body: generalInfoData,
        });

        // Tabella 2: Dettaglio dei lead
        const leadDetailsData = [
            ['Non validi', nonValidoLeadsPdf],
            ['Non risponde', nonRispondeLeadsPdf],
            ['In lavorazione', inLavorazioneLeadsPdf],
            ['Da contattare', daContattareLeadsPdf],
            ['Venduti', vendutiLeadsPdf],
            ['Opportunità', opportunitàLeadsPdf],
            ['Percentuale non validi', `${percNonValid}%`],
            ['Percentuale non risponde', `${percNonRisp}%`],
            ['Percentuale in lavorazione', `${percLav}%`],
            ['Percentuale da contattare', `${percOpp}%`],
            ['Percentuale venduti', `${percVend}%`],
            ['Percentuale Da contattare', `${percDaCont}%`],
        ];
        doc.text('Dettaglio dei lead', 10, doc.autoTable.previous.finalY + 10);
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 15,
            head: [['Descrizione', 'Valore']],
            body: leadDetailsData,
        });

        doc.save('report.pdf');
    };

    const fetchLeads = async () => {

        try {
            const response = await axios.post('/get-leads-manual', {
                _id: state.user._id
               //_id: "655f707143a59f06d5d4dc3b"
            });

            setAllLeads(response.data);

            const vendutoLeads = response.data.filter(lead => lead.esito === 'Venduto');
            const daContattareLeads = response.data.filter(lead => lead.esito === 'Da contattare');
            const inLavorazioneLeads = response.data.filter(lead => lead.esito === 'In lavorazione');
            const nonRispondeLeads = response.data.filter(lead => lead.esito === 'Non risponde');
            const nonValidoLeads = response.data.filter(lead => lead.esito === 'Non valido');
            const opportunitàLeads = response.data.filter(lead => lead.esito === 'Opportunità');
            const inValutazioneLeads = response.data.filter(lead => lead.esito === 'In valutazione');
            const nonInteressatoLeads = response.data.filter(lead => lead.esito === 'Non interessato');
            const iscrLeads = response.data.filter(lead => lead.esito === 'Iscrizione posticipata');
            const IrrLeads = response.data.filter(lead => lead.esito === 'Irraggiungibile');

            setVendutoLeads(vendutoLeads);
            setDaContattareLeads(daContattareLeads);
            setNonRispondeLeads(nonRispondeLeads);
            setNonValidoLeads(nonValidoLeads);
            setFatturatoVenduti(fatturatoVenduti);
            setInLavorazioneLeads(inLavorazioneLeads);
            setOpportunitàLeads(opportunitàLeads);
            setInValutazioneLeads(inValutazioneLeads);
            setNonInteressatoLeads(nonInteressatoLeads);
            setIrrLeads(IrrLeads);
            setIscrPostLeads(iscrLeads);

            const leadNumVendutiRes = response.data.filter(lead => lead.esito === 'Venduto');
            const leadNumRes = response.data.length;
            setLeadNum(leadNumRes);
            setLeadNumVenduti(leadNumVendutiRes);
            setIsLoading(false)
        } catch (error) {
            console.error(error.message);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);


    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");  

    const isDateWithinRange = (date, startDate, endDate) => {
        const dateObj = new Date(date);
        return dateObj >= startDate && dateObj <= endDate;
      };
    
      const calculateLeadsByDate = (startDate, endDate) => {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
      
        const vendutoLeads = allLeads.filter(
          lead => lead.esito === 'Venduto' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
        );
      
        const daContattareLeads = allLeads.filter(
          lead => lead.esito === 'Da contattare' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
        );

        const inLavorazioneLeads = allLeads.filter(
            lead => lead.esito === 'In lavorazione' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );

          const nonRispondeLeads = allLeads.filter(
            lead => lead.esito === 'Non risponde' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );

          const opportunitàLeads = allLeads.filter(
            lead => lead.esito === 'Opportunità' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );

          const nonValidoLeads = allLeads.filter(
            lead => lead.esito === 'Non valido' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );

          const inValutazioneLeads = allLeads.filter(
            lead => lead.esito === 'In valutazione' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );

          const nonInteressatoLeads = allLeads.filter(
            lead => lead.esito === 'Non interessato' && isDateWithinRange(lead.dataCambiamentoEsito, startDateObj, endDateObj)
          );
      
        if (nonRispondeLeads && nonValidoLeads && daContattareLeads && vendutoLeads) {
            //const totalLeads = allLeads.filter(lead => isDateWithinRange(lead.data, startDateObj, endDateObj)).length;
            const totalNonRisponde = nonRispondeLeads.length;
            const totalNonValido = nonValidoLeads.length;
            const totalOpportunita = opportunitàLeads.length;
            const totalVenduti = vendutoLeads.length;
            const totalLavorazione = inLavorazioneLeads.length;
            const totalDaContattare = daContattareLeads.length;
            const totalInValutazione = inValutazioneLeads.length;
            const totalNonInteressato = nonInteressatoLeads.length;
            const totalIrraggiungibile = irrLeads.length;
            const totalIscrizionePost = iscrPostLeads.length;
            const totalLeads = totalNonRisponde + totalNonValido + totalOpportunita + totalVenduti + totalDaContattare+ totalLavorazione + totalInValutazione + totalNonInteressato;

            const percNonRisp = totalLeads !== 0 ? (totalNonRisponde / totalLeads * 100).toFixed(1) : 0;
            const percNonValid = totalLeads !== 0 ? (totalNonValido / totalLeads * 100).toFixed(1) : 0;
            const percOpp = totalLeads !== 0 ? (totalOpportunita / totalLeads * 100).toFixed(1) : 0;
            const percVend = totalLeads !== 0 ? (totalVenduti / totalLeads * 100).toFixed(1) : 0;
            const percInLav = totalLeads !== 0 ? (totalLavorazione / totalLeads * 100).toFixed(1) : 0;
            const percInDaCont = totalLeads !== 0 ? (totalDaContattare / totalLeads * 100).toFixed(1) : 0;
            const percInVal = totalLeads !== 0 ? (totalInValutazione / totalLeads * 100).toFixed(1) : 0;
            const percNonInt = totalLeads !== 0 ? (totalNonInteressato / totalLeads * 100).toFixed(1) : 0;
            const percIrr = totalLeads !== 0 ? (totalIrraggiungibile / totalLeads * 100).toFixed(1) : 0;
            const percIscrPost = totalLeads !== 0 ? (totalIscrizionePost / totalLeads * 100).toFixed(1) : 0;


            setPercNonRisp(percNonRisp);
            setPercNonValid(percNonValid);
            setPercOpp(percOpp);
            setPercVend(percVend);
            setPercLav(percInLav);
            setPercDaCont(percInDaCont);
            setPercNonInt(percNonInt);
            setPercValut(percInVal);
            setPercIrr(percIrr);
            setPercIscrPost(percIscrPost);

            const newData = {
                labels: [],
                datasets: [
                    {
                        data: [percNonRisp, percNonValid, percOpp, percVend, percInLav, percInDaCont, percInVal, percNonInt, percIrr, percIscrPost],
                        backgroundColor: [
                            '#E849D8',
                            '#3471CC',
                            '#FBBC05',
                            '#30978B',
                            '#973030',
                            '#000000',
                            '#01594f',
                            '#655528',
                            '#01894f',
                            '#653528',
                        ],
                        borderColor: [
                            '#E849D8',
                            '#3471CC',
                            '#FBBC05',
                            '#30978B',
                            '#973030',
                            '#000000',
                            '#01594f',
                            '#655528',
                            '#01894f',
                            '#653528',
                        ],
                        borderWidth: 0,
                    },
                ],
            };

            setData(newData);
            setDataLoaded(true);
        }
      
        setVendutoLeads(vendutoLeads);
        setDaContattareLeads(daContattareLeads);
      };

    const handleDateSelection = () => {
        console.log(startDate, endDate);
    
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
    
        const previousStartDate = new Date(startDateObj);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
    
        const selectedInterval = Math.floor(
          (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        const previousInterval = Math.floor(
          (startDateObj.getTime() - previousStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );
    
        if (selectedInterval > previousInterval) {
          console.log("L'intervallo di date selezionato è più ampio dell'intervallo precedente.");
        } else if (selectedInterval < previousInterval) {
          console.log("L'intervallo di date selezionato è più stretto dell'intervallo precedente.");
        } else {
          console.log("L'intervallo di date selezionato ha la stessa durata dell'intervallo precedente.");
        }
        calculateLeadsByDate(startDateObj, endDateObj);
      };

      const handleRemoveFilter = () => {
        setDataLoaded(false);
      }

    function Entryesitileft(tit, perc) {
        return (<div>
            <div className="datatit">
                {tit == "Non interessato" ? "Lead persa" : tit}
            </div>
            <div className="dataperc">
                {perc}%
            </div>
        </div>);
    }

    useEffect(() => {
        if (leadNum && nonRispondeLeads && nonValidoLeads && daContattareLeads && leadNumVenduti) {
            const totalLeads = leadNum;
            const totalNonRisponde = nonRispondeLeads.length;
            const totalNonValido = nonValidoLeads.length;
            const totalOpportunita = opportunitàLeads.length;
            const totalVenduti = leadNumVenduti.length;
            const totalLavorazione = inLavorazioneLeads.length;
            const totalDaContattare = daContattareLeads.length;
            const totalInValutazione = inValutazioneLeads.length;
            const totalNonInteressato = nonInteressatoLeads.length;
            const totalIrraggiungibile = irrLeads.length;
            const totalIscrizionePost = iscrPostLeads.length;

            const percNonRisp = (totalNonRisponde / totalLeads * 100).toFixed(1);
            const percNonValid = (totalNonValido / totalLeads * 100).toFixed(1);
            const percOpp = (totalOpportunita / totalLeads * 100).toFixed(1);
            const percVend = (totalVenduti / totalLeads * 100).toFixed(1);
            const percInLav = (totalLavorazione / totalLeads * 100).toFixed(1);
            const percInDaCont = (totalDaContattare / totalLeads * 100).toFixed(1);
            const percInVal = (totalInValutazione / totalLeads * 100).toFixed(1);
            const percNonInt = (totalNonInteressato / totalLeads * 100).toFixed(1);
            const percIrr = (totalIrraggiungibile / totalLeads * 100).toFixed(1);
            const percIscrPost = (totalIscrizionePost / totalLeads * 100).toFixed(1);

            setPrevPercInLav(percInLav);
            setPrevPercVend(percVend);
            setPrevPercOpp(percOpp);
            setPrevPercNonValid(percNonValid);
            setPrevPercNonRisp(percNonRisp);
            setPrevPercDaCont(percInDaCont);
            setPrevPercValut(percInVal);
            setPrevPercNonInt(percNonInt);
            setPrevPercIrr(percIrr);
            setPrevPercIscrPost(percIscrPost);

            const newData = {
                labels: [],
                datasets: [
                    {
                        data: [percNonRisp, percNonValid, percOpp, percVend, percInLav, percInDaCont, percInVal, percNonInt, percIrr, percIscrPost],
                        backgroundColor: [
                            '#E849D8',
                            '#3471CC',
                            '#FBBC05',
                            '#30978B',
                            '#973030',
                            '#000000',
                            '#01594f',
                            '#655528',
                            '#01894f',
                            '#653528',
                        ],
                        borderColor: [
                            '#E849D8',
                            '#3471CC',
                            '#FBBC05',
                            '#30978B',
                            '#973030',
                            '#000000',
                            '#01594f',
                            '#655528',
                            '#01894f',
                            '#653528',
                        ],
                        borderWidth: 0,
                    },
                ],
            };

            setData(newData);
        }
    }, [leadNum, nonRispondeLeads, nonValidoLeads, daContattareLeads, leadNumVenduti]);

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



    return (
        <div>
            {isLoading ?
                <div
                    className="d-flex justify-content-center fw-bold"
                    style={{ height: "90vh" }}
                >
                    <div className="d-flex align-items-center">
                        <SyncOutlined spin style={{ fontSize: "50px" }} />
                    </div>
                </div>
                :
                <div>
                    <TopDash hideexport hideattivi hideLegend hidecerca generatePdf={generatePDF} />
                    <div className='dashbody'>           
                        <iframe
                        width="100%" 
                        height="680" 
                        src="https://lookerstudio.google.com/embed/reporting/1e19fb08-acd2-4dac-843a-fafe7bff31ee/page/p_lbamx3ried" 
                        frameborder="0" 
                        allowfullscreen 
                        sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"> 
                        </iframe>   
                    </div>
                </div>
            }
        </div>
    )
}
