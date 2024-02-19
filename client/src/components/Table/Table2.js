import React, { Suspense } from "react";
import { useState, useEffect, useContext, useRef } from "react";
import './Table2.scss';
import { UserContext } from '../../context';
import axios from "axios";
import toast from "react-hot-toast";
import './LeadEntry.scss'
import { IoIosArrowDown } from 'react-icons/io';
import '../MainDash/MainDash.scss';
import listaImg from '../../imgs/lista.png';
import LeadEntry from "./LeadEntry.jsx";
import LeadHeader from "./LeadHeader.jsx";
import PopupModify from "./popupModify/PopupModify";
import AddLeadPopup from "./popupAdd/PopupAdd";
const PopupMotivo = React.lazy(() => import("./popupMotivo/PopupMotivo.js"));

export default function Table2({ onResults, searchval, setLeadsPdf }) {
  const [state, setState, headerIndex, SETheaderIndex] = useContext(UserContext);
  const [filterValue, setFilterValue] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [esitoOpen, setEsitoOpen] = useState(false);
  const [orientatoriOpen, setOrientatoriOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [originalData, setOriginalData] = useState([]);
  const [popupModify, setPopupModify] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [esito, setEsito] = useState('');
  const [fatturato, setFatturato] = useState('0');
  const [popupModifyEsito, setPopupModifyEsito] = useState(false);
  const [toggleGrid, SETtogglegrid] = useState();
  const [orientatoriOptions, setOrientatoriOptions] = useState([]);
  const [selectedOrientatore, setSelectedOrientatore] = useState();
  const [selectedOrientatoreToChange, setSelectedOrientatoreToChange] = useState();
  const [changeOrientatore, setChangeOrientatore] = useState(false);
  const [leadMancantiPopup, setLeadMancantiPopup] = useState(true);
  const [filtroDiRiserva, setFiltroDiRiserva] = useState([]);
  const [motivo, setMotivo] = useState();
  const ori = localStorage.getItem("Ori");
  const popupRef = useRef(null);
  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setEsitoOpen(false);
      setOrientatoriOpen(false);
      setCalendarOpen(false);
      setPopupModifyEsito(false);
      setAddOpen(false);
      setPopupModify(false);
      setChangeOrientatore(false);
      setPopupMotivi(false);
    }
  };

const [motivoNonValidoList, setMotivoNonValidoList] = useState([
    "Linea disattivata", "Numero errato", "Lead doppione", "Lead in carico ad ateneo"
]);
const [motivoLeadPersaList, setMotivoLeadPersaList] = useState([
    "Disconoscimento richiesta", "Richiesta vecchia", "Nessuna risposta",
    "Solo curiosità", "Non vuole intermediari", "Fuori budget", "Prodotto non disponibile",
    "Altro ateneo", "Difficoltà nel reperire documentazione", "Titolo straniero senza equipollenza",
    "Prevalutazione rifiutata",
]);
const [motivoVendutoList, setMotivoVendutoList] = useState([
    "Promozione / sconto", "Convenzione", "Prevalutazione corretta",
    "Scatto di carriera", "Titolo necessario per concorso pubblico / candidatura",
    "Tempi brevi", "Sede d’esame vicino casa", "Consulenza orientatore",
]);

  document.addEventListener('mousedown', handleClickOutside);

  const userId = state.user._id;
  //const userId = "655f707143a59f06d5d4dc3b" //ONE NETWORK
  //const userId = "65b135d2318336cd0bfc4361" //WIKIBE
  const monthlyLeadCounter = state.user.monthlyLeadCounter;
  const handleRowClick = (lead) => {
     setSelectedLead(lead);
     setDeleting(true);
     SETheaderIndex(0)
  };


  useEffect(() => {
    const getOrientatori = async () => {
      await axios.get(`/utenti/${userId}/orientatori`)
        .then(response => {
          const data = response.data.orientatori;

          setOrientatoriOptions(data);
          fetchLeads(data);
        })
        .catch(error => {
          console.error(error);
        });
    }

    if (state && state.token) getOrientatori();
    const ori = localStorage.getItem("Ori");
    const startDate = localStorage.getItem("startDate");
    const endDate = localStorage.getItem("endDate");
    const recall = localStorage.getItem("recallFilter");
    if (ori && ori !== null && ori !== undefined) {
      setSelectedOrientatore(ori);
      console.log('HO cambiat ori')
    };

    if (recall && recall !== undefined && recall == "true"){
      setRecallFilter(true)
    }

    if (startDate && startDate !== null && startDate !== undefined){
      setStartDate(startDate)
    }

    if (endDate && endDate !== null && endDate !== undefined){
      setEndDate(endDate)
    }
  }, [])


  useEffect(() => {
    let ls = localStorage.getItem("toggleGrid")
    if (ls) {
      if (ls == "off")
        SETtogglegrid(false)
      else
        if (ls == "on")
          SETtogglegrid(true)

    } else {
      SETtogglegrid(false)
      localStorage.setItem("toggleGrid", "off")
    }
  }, [])



  //per filter esito 
  const [selectedStatusEsito, setSelectedStatusEsito] = useState({
    dacontattare: false,
    inlavorazione: false,
    noninteressato: false,
    opportunita: false,
    invalutazione: false,
    venduto: false,
    nonValido: false,
  });

  const [esitoToFilter, setEsitoToFilter] = useState();
  const [refreshate, setRefreshate] = useState(true);

  const cambiaEsito = (esito) => {
    if (esito == "Nessun filtro"){
      setEsitoToFilter();
    } else {
      setEsitoToFilter(esito);
    }
  }

  const toggleFilter = (filter) => {
    setSelectedStatusEsito((prevFilters) => ({
      ...prevFilters,
      [filter]: !prevFilters[filter],
    }));
  };

  const fetchLeads = async (orin) => {

    try {
      const response = await axios.post('/get-leads-manual-base', {
        _id: state.user._id
      });


      const filteredTableLead = response.data.map((lead) => {
        const telephone = lead.numeroTelefono ? lead.numeroTelefono.toString() : '';
        const cleanedTelephone =
          telephone.startsWith('+39') && telephone.length === 13
            ? telephone.substring(3)
            : telephone;


        return {
          name: lead.nome,
          email: lead.email,
          date: lead.data,
          telephone: cleanedTelephone,
          status: lead.esito,
          orientatore: lead.orientatori ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : '',
          facolta: lead.facolta ? lead.facolta : '',
          fatturato: lead.fatturato ? lead.fatturato : '',
          università: lead.università ? lead.università : '',
          provenienza: lead.campagna,
          corsoDiLaurea: lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
          oreStudio: lead.oreStudio ? lead.oreStudio : '',
          provincia: lead.provincia ? lead.provincia : '',
          note: lead.note ? lead.note : '',
          id: lead._id,
          frequentiUni: lead.frequentiUni ? lead.frequentiUni : null,
          lavoro: lead.lavoro ? lead.lavoro : null,
          oraChiamataRichiesto: lead.oraChiamataRichiesto ? lead.oraChiamataRichiesto : "",
          etichette: lead.etichette ? lead.etichette : null,
          motivo: lead.motivo ? lead.motivo : null,
          recallHours: lead.recallHours ? lead.recallHours : null,
          recallDate: lead.recallDate ? lead.recallDate : null,
          lastModify: lead.lastModify ? lead.lastModify : null, 
          tipologiaCorso: lead.tipologiaCorso ? lead.tipologiaCorso : "",
          budget: lead.budget ? lead.budget : "",
          enrollmentTime: lead.enrollmentTime ? lead.enrollmentTime : "",
          oreStudio: lead.oreStudio ? lead.oreStudio : "",
          categories: lead.categories ? lead.categories : "",
          campagna: lead.utmCampaign ? lead.utmCampaign : "",
          leadAmbassador: lead.leadAmbassador ? lead.leadAmbassador : undefined,
        };
      });

      const ori = localStorage.getItem("Ori");
      const recall = localStorage.getItem("recallFilter");

      const filteredByOrientatore = filteredTableLead.filter((row) => {
        if (ori && ori !== null && ori !== undefined && orin.length > 0) {
          const selectedOrientatoreObj = orin.find(option => option._id === ori);
          const selectedOrientatoreFullName = selectedOrientatoreObj ? selectedOrientatoreObj.nome + ' ' + selectedOrientatoreObj.cognome : '';
          const rowOrientatoreFullName = row.orientatore;
          return rowOrientatoreFullName === selectedOrientatoreFullName;
        } else if (ori === "nonassegnato") {
          const rowOrientatoreFullName = row.orientatore;
          return rowOrientatoreFullName === "";
        } else {
          return true;
        }
      });

      const filteredByRecall = filteredByOrientatore.filter((lead) => {
        if (lead.recallDate && recall && recall === "true") {
          const recallDate = new Date(lead.recallDate);
          const today = new Date();
          return recallDate <= today;
        } else if (recall === false || recall == undefined || !recall) {
          return true;
        }
        return false;
      });

      const startDate = localStorage.getItem("startDate");
      const endDate = localStorage.getItem("endDate");
      if (startDate !== null && endDate !== null && startDate !== undefined && endDate !== undefined){
        const filteredByDate = filterDataByDate(filteredByRecall, startDate, endDate); 
        setFilteredData(filteredByDate);
        setFiltroDiRiserva(filteredByDate)
       } else {
        setFilteredData(filteredByRecall);
        setFiltroDiRiserva(filteredByRecall);
       }

      const leadNumVenduti = response.data.filter(lead => lead.esito === 'Venduto');
      const leadNum = response.data.length;
      onResults(leadNum, leadNumVenduti.length);
      setOriginalData(filteredTableLead);
      setLeadsPdf(filteredTableLead);
      //return filteredTableLead;
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    const filteredDataIn = originalData.filter((row) => {
      const filterNum = parseInt(filterValue);
      if (!isNaN(filterNum)) {
        return typeof row.telephone === 'string' && row.telephone.startsWith(filterValue);
      } else {
        const searchTerms = filterValue.toLowerCase().split(' ');

        const fullName = row.name.toLowerCase();
        return searchTerms.every(term => fullName.includes(term));
      }
    }).map((row) => {
      return {
        id: row.id,
        name: row.name,
        date: row.date,
        telephone: row.telephone,
        status: row.status,
        orientatore: row.orientatore,
        email: row.email,
        note: row.note,
        facolta: row.facolta,
        fatturato: row.fatturato,
        università: row.università,
        campagna: row.campagna,
        corsoDiLaurea: row.corsoDiLaurea,
        oreStudio: row.oreStudio,
        provincia: row.provincia,
        frequentiUni: row.frequentiUni,
        lavoro: row.lavoro,
        oraChiamataRichiesto: row.oraChiamataRichiesto,
        etichette: row.etichette,
        motivo: row.motivo,
        recallHours: row.recallHours,
        recallDate: row.recallDate,
        lastModify: row.lastModify,
        tipologiaCorso: row.tipologiaCorso,
        budget: row.budget,
        enrollmentTime: row.enrollmentTime,
        oreStudio: row.oreStudio,
        categories: row.categories,
        campagna: row.utmCampaign,
        leadAmbassador: row.leadAmbassador ? row.leadAmbassador : undefined,
      };
    });
    setFilteredData(filteredDataIn);
  }, [filterValue]);

  const handleClickDate = () => {
    const filteredDataNew = filterDataByDate(filteredData, startDate, endDate);
    setFilteredData(filteredDataNew);
    setCalendarOpen(false);
    document.body.classList.remove("overlay");
  }

  const handleClickEsito = () => {
          const filteredDataNew = filteredData.filter((row) => {
      if (selectedStatusEsito.venduto && row.status === 'Venduto') {
        return true;
      } else if (selectedStatusEsito.dacontattare && row.status === 'Da contattare') {
        return true;
      } else if (selectedStatusEsito.inlavorazione && row.status === 'In lavorazione') {
        return true;
      } else if (selectedStatusEsito.invalutazione && row.status === 'In valutazione') {
        return true;
      } else if (selectedStatusEsito.opportunita && row.status === 'Opportunità') {
        return true;
      } else if (selectedStatusEsito.noninteressato && row.status === 'Non interessato') {
        return true;
      } else if (selectedStatusEsito.nonValido && row.status === 'Non valido') {
        return true;
      }
      return false;
    });
    setFilteredData(filteredDataNew);

    setOrientatoriOpen(false);
    setEsitoOpen(false);

  }

  useEffect(() => {
    if (filterValue === '') {
      setFilteredData(originalData);
    }
  }, [filterValue]);

  const filterDataByDate = (data, startDate, endDate) => {
    const filteredData = data.filter((row) => {
      const rowDate = Date.parse(row.date);
      const selectedDateStart = new Date(startDate);
      const selectedDateEnd = new Date(endDate);
      selectedDateEnd.setDate(selectedDateEnd.getDate() + 1);
      return rowDate >= selectedDateStart && rowDate <= selectedDateEnd;
    });

    return filteredData;
  };

  const handleClearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setFilteredData(originalData);
    setSelectedFilter('');
    setSelectedOrientatore("");
    localStorage.removeItem("Ori");
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");
    localStorage.removeItem("recallFilter");
    setRecallFilter(false);
  };

  const [recallFilter, setRecallFilter] = useState(false);
  useEffect(() => {
    // Filtra per recall
    const filteredByRecall = originalData.filter((lead) => {
      if (lead.recallDate && lead.recallHours && recallFilter === true) {
        const recallDate = new Date(lead.recallDate);
        const today = new Date();
        return recallDate <= today;
      } else if (recallFilter === false) {
        return true;
      }
      return false;
    });

    // Filtra per orientatore
    const filteredByOrientatore = originalData.filter((row) => {
      if (selectedOrientatore == null || selectedOrientatore === "") {
        return true;
      } else if (selectedOrientatore == "nonassegnato") {
        const rowOrientatoreFullName = row.orientatore;
        return rowOrientatoreFullName === "";
      } else {
        const selectedOrientatoreObj = orientatoriOptions.find(option => option._id === selectedOrientatore);
        const selectedOrientatoreFullName = selectedOrientatoreObj ? selectedOrientatoreObj.nome + ' ' + selectedOrientatoreObj.cognome : '';
        const rowOrientatoreFullName = row.orientatore;
        return rowOrientatoreFullName === selectedOrientatoreFullName;
      }
    });

    // Filtra per data
    if (startDate !== null && endDate !== null){
     const filteredByDate = filterDataByDate(originalData, startDate, endDate); 
     const combinedFilteredData = filteredByRecall.filter(row => filteredByOrientatore.includes(row) && filteredByDate.includes(row));
     setFilteredData(combinedFilteredData);
     setFiltroDiRiserva(combinedFilteredData);
    } else {
      const combinedFilteredData = filteredByRecall.filter(row => filteredByOrientatore.includes(row));
      setFilteredData(combinedFilteredData);
      setFiltroDiRiserva(combinedFilteredData);
    }

    
    
  }, [recallFilter, selectedOrientatore, startDate, endDate]);

  const getOtherLeads = async () => {
    try {
      const response = await axios.post('/get-other-leads', {
        _id: state.user._id
        //_id: "655f707143a59f06d5d4dc3b" //ONE NETWORK
        //_id: "65b135d2318336cd0bfc4361" //WIKIBE
      });

      const filteredTableLead = response.data.map((lead) => {
        const telephone = lead.numeroTelefono ? lead.numeroTelefono.toString() : '';
        const cleanedTelephone =
          telephone.startsWith('+39') && telephone.length === 13
            ? telephone.substring(3)
            : telephone;


        return {
          name: lead.nome,
          email: lead.email,
          date: lead.data,
          telephone: cleanedTelephone,
          status: lead.esito,
          orientatore: lead.orientatori ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : '',
          facolta: lead.facolta ? lead.facolta : '',
          fatturato: lead.fatturato ? lead.fatturato : '',
          università: lead.università ? lead.università : '',
          provenienza: lead.campagna,
          corsoDiLaurea: lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
          oreStudio: lead.oreStudio ? lead.oreStudio : '',
          provincia: lead.provincia ? lead.provincia : '',
          note: lead.note ? lead.note : '',
          id: lead._id,
          frequentiUni: lead.frequentiUni ? lead.frequentiUni : null,
          lavoro: lead.lavoro ? lead.lavoro : null,
          oraChiamataRichiesto: lead.oraChiamataRichiesto ? lead.oraChiamataRichiesto : "",
          etichette: lead.etichette ? lead.etichette : null,
          motivo: lead.motivo ? lead.motivo : null,
          recallHours: lead.recallHours ? lead.recallHours : null,
          recallDate: lead.recallDate ? lead.recallDate : null,
          lastModify: lead.lastModify ? lead.lastModify : null, 
          tipologiaCorso: lead.tipologiaCorso ? lead.tipologiaCorso : "",
          budget: lead.budget ? lead.budget : "",
          enrollmentTime: lead.enrollmentTime ? lead.enrollmentTime : "",
          oreStudio: lead.oreStudio ? lead.oreStudio : "",
          categories: lead.categories ? lead.categories : "",
          campagna: lead.utmCampaign ? lead.utmCampaign : "",
          leadAmbassador: lead.leadAmbassador ? lead.leadAmbassador : undefined,
        };
      });

      const ori = localStorage.getItem("Ori");
      const recall = localStorage.getItem("recallFilter");
      const filteredByOrientatore = filteredTableLead.filter((row) => {
        if (ori && ori !== null && ori !== undefined && orientatoriOptions.length > 0) {
          const selectedOrientatoreObj = orientatoriOptions.find(option => option._id === ori);
          const selectedOrientatoreFullName = selectedOrientatoreObj ? selectedOrientatoreObj.nome + ' ' + selectedOrientatoreObj.cognome : '';
          const rowOrientatoreFullName = row.orientatore;
          return rowOrientatoreFullName === selectedOrientatoreFullName;
        } else if (ori === "nonassegnato") {
          const rowOrientatoreFullName = row.orientatore;
          return rowOrientatoreFullName === "";
        } else {
          return true;
        }
      });

      const filteredByRecall = filteredByOrientatore.filter((lead) => {
        if (lead.recallDate && recall && recall === "true") {
          const recallDate = new Date(lead.recallDate);
          const today = new Date();
          return recallDate <= today;
        } else if (recall === false || recall == undefined || !recall) {
          return true;
        }
        return false;
      });

      const startDate = localStorage.getItem("startDate");
      const endDate = localStorage.getItem("endDate");
      if (startDate !== null && endDate !== null && startDate !== undefined && endDate !== undefined){
        const filteredByDate = filterDataByDate(filteredByRecall, startDate, endDate); 
        setFilteredData((prevData) => [...prevData, ...filteredByDate]);
        setFiltroDiRiserva((prevData) => [...prevData, ...filteredByDate]);
       } else {
        setFilteredData((prevData) => [...prevData, ...filteredByRecall]);
        setFiltroDiRiserva((prevData) => [...prevData, ...filteredByRecall]);
       }
      setRefreshate(false);
      setOriginalData((prevData) => [...prevData, ...filteredTableLead]);
    } catch (error) {
      console.error(error);
    }
  }

  const handleOpenAddPopup = () => {
    SETheaderIndex(0)
    setAddOpen(true);
  }

  const handleModifyPopup = (lead) => {
    setSelectedLead(lead);
    setPopupModify(true);
  }

  const handleModifyPopupEsito = (lead) => {
    setSelectedLead(lead);
    setPopupModifyEsito(true);

    setEsito(lead.status)

    SETheaderIndex(0)
  }

  const JustClosePopup = () => {
    setPopupModify(false);
  }

  const openChangeOrientatore = (lead) => {
    setChangeOrientatore(true);
    setSelectedLead(lead);
  }

  const updateOrientatore = async () => {
    const orientatori = selectedOrientatoreToChange;
    const leadId = selectedLead.id;
  
    try {
      const modifyLead = {
        orientatori
      };
  
      const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
      const updatedLead = response.data.updatedLead;

      setOriginalData((prevData) =>
        prevData.map((lead) => {
          if (lead.id === leadId) {
            const adaptedLead = {
              name: updatedLead.nome,
              email: updatedLead.email,
              date: updatedLead.data,
              telephone: updatedLead.numeroTelefono,
              status: updatedLead.esito,
              orientatore: updatedLead.orientatori ? updatedLead.orientatori.nome + ' ' + updatedLead.orientatori.cognome : '',
              facolta: updatedLead.facolta ? updatedLead.facolta : '',
              fatturato: updatedLead.fatturato ? updatedLead.fatturato : '',
              università: updatedLead.università ? updatedLead.università : '',
              campagna: updatedLead.campagna,
              corsoDiLaurea: updatedLead.corsoDiLaurea ? updatedLead.corsoDiLaurea : '',
              oreStudio: updatedLead.oreStudio ? updatedLead.oreStudio : '',
              provincia: updatedLead.provincia ? updatedLead.provincia : '',
              note: updatedLead.note ? updatedLead.note : '',
              id: updatedLead._id,
              frequentiUni: updatedLead.frequentiUni ? updatedLead.frequentiUni : false,
              lavoro: updatedLead.lavoro ? updatedLead.lavoro : false,
              oraChiamataRichiesto: updatedLead.oraChiamataRichiesto ? updatedLead.oraChiamataRichiesto : "",
              leadAmbassador: updatedLead.leadAmbassador ? updatedLead.leadAmbassador : undefined,
            };
            return { ...lead, ...adaptedLead };
          } else {
            return lead;
          }
        })
      );

      setFilteredData((prevData) =>
      prevData.map((lead) => {
        if (lead.id === leadId) {
          const adaptedLead = {
            name: updatedLead.nome,
            email: updatedLead.email,
            date: updatedLead.data,
            telephone: updatedLead.numeroTelefono,
            status: updatedLead.esito,
            orientatore: updatedLead.orientatori ? updatedLead.orientatori.nome + ' ' + updatedLead.orientatori.cognome : '',
            facolta: updatedLead.facolta ? updatedLead.facolta : '',
            fatturato: updatedLead.fatturato ? updatedLead.fatturato : '',
            università: updatedLead.università ? updatedLead.università : '',
            campagna: updatedLead.campagna,
            corsoDiLaurea: updatedLead.corsoDiLaurea ? updatedLead.corsoDiLaurea : '',
            oreStudio: updatedLead.oreStudio ? updatedLead.oreStudio : '',
            provincia: updatedLead.provincia ? updatedLead.provincia : '',
            note: updatedLead.note ? updatedLead.note : '',
            id: updatedLead._id,
            frequentiUni: updatedLead.frequentiUni ? updatedLead.frequentiUni : false,
            lavoro: updatedLead.lavoro ? updatedLead.lavoro : false,
            leadAmbassador: updatedLead.leadAmbassador ? updatedLead.leadAmbassador : undefined,
            oraChiamataRichiesto: updatedLead.oraChiamataRichiesto ? updatedLead.oraChiamataRichiesto : "",
          };
          return { ...lead, ...adaptedLead };
        } else {
          return lead;
        }
      })
    );
      setChangeOrientatore(false);
      toast.success('Il lead è stato modificato con successo.');
    } catch (error) {
      console.error(error);
    }
  };
  

  const deleteLead = async (leadId) => {
    try {
      const response = await axios.delete('/delete-lead', { data: { id: leadId } });
      toast.success('Hai eliminato correttamente il lead');
      fetchLeads(orientatoriOptions);
      setPopupModify(false);
      setDeleting(false);
    } catch (error) {
      console.error(error.message);
      toast.error('Si è verificato un errore.')
    }
  };

  const handleDelete = (event) => {
    event.preventDefault();
    deleteLead(selectedLead.id)
  }

  const updateLeadEsito = async () => {
    const leadId = selectedLead.id
    try {
      if (esito === "Non valido" || esito === "Venduto" || esito === "Non interessato"){
        if (!motivo || motivo == ""){
          window.alert("Inserisci il motivo")
          return
        } else {
        const modifyLead = {
          esito,
          fatturato,
          motivo,
        };   
        const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
        setPopupModifyEsito(false);
        SETheaderIndex(999);             
        }
      } else {
        const motivo = "";
        const modifyLead = {
          esito,
          fatturato,
          motivo,
        };   
        const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
        setPopupModifyEsito(false);
        SETheaderIndex(999); 
      }
      fetchLeads(orientatoriOptions);
      toast.success('Il lead è stato modificato con successo.')
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!esitoOpen) {
      setSelectedFilter('')
      SETheaderIndex(999)

    }
    else {
      SETheaderIndex(0)
    }
  }, [esitoOpen])

  useEffect(() => {
    if (!calendarOpen)
      setSelectedFilter('')
  }, [calendarOpen])


  const [toggles, SETtoggles] = useState({
    dacontattare: false,
    inlavorazione: false,
    noninteressato: false,
    opportunita: false,
    invalutazione: false,
    venduto: false,
    nonValido: false,
    nonRisponde: false,
    irraggiungibile: false,
    iscrizionePosticipata: false,
  })


  const formatDate = (originalDate) => {
    const formattedDate = new Date(originalDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = new Date(originalDate).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const finalFormat = `${formattedDate} ${formattedTime}`;
    return finalFormat;
  }




  useEffect(() => {
    if (popupModify)
      SETheaderIndex(0)
    else
      SETheaderIndex(999)
  }, [popupModify])

  useEffect(() => {
    if (searchval == ''){
      setFilteredData(filtroDiRiserva)
    } else {
      const searchWords = searchval.toLowerCase().split(' ');

      setFilteredData(
        filteredData.filter(r => {
          const fullName = `${r.name.trim()}`.toLowerCase();

          console.log('Search Words:', searchWords);
          console.log('Full Name:', fullName);

          return searchWords.every(word => fullName.indexOf(word) !== -1) || r.telephone.toLowerCase().includes(searchval.toLowerCase());
        })
      );
    }
  }, [searchval])

  


  const handletogglegrid = () => {
    SETtogglegrid(!toggleGrid)

    localStorage.setItem("toggleGrid", localStorage.getItem("toggleGrid") == "on" ?
      "off" : "on"
    )
  }



  const handleDragEnd = (event) => {
    document.querySelectorAll(".secwrap").forEach(e => e.classList.remove("colordroprow"));
    //document.querySelectorAll('.move-entry').forEach(lead => {
    //  lead.classList.remove('move-entry');
    //});
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    document.querySelectorAll(".secwrap").forEach(e => e.classList.add("colordroprow"));
    
    //event.target.classList.add('move-entry');
  };

  const [popupMotivi, setPopupMotivi] = useState(false);
  const [typeMotivo, setTypeMotivo] = useState("");
  const [leadIdMotivo, setLeadIdMotivo] = useState("");

  const handleDrop = (event, type) => {
    event.preventDefault();

    const droppedItem = JSON.parse(event.dataTransfer.getData('text/plain'));
    const draggedLeadId = droppedItem.id;
    if (type === draggedLeadId.status) {
      return null
    } else if (type === "Venduto" || type === "Non valido" || type === "Non interessato" || type === "Lead persa") {
      setPopupMotivi(true);
      setLeadIdMotivo(draggedLeadId);
      setTypeMotivo(type);
    } else {
      updateLeadEsito2(draggedLeadId, 0, type);
      const overlay = document.querySelector('.popup-open-shadows');
      if (overlay) {
          document.body.removeChild(overlay);
      }
    }

  };

  const updateLeadEsito2 = async (leadId, fatturato, esito) => {
    try {
      const modifyLead = {
        esito,
        fatturato,
      };
      const response = await axios.put(`/lead/${userId}/update/${leadId.id}`, modifyLead);

      toast.success('Il lead è stato modificato con successo.');
      fetchLeads(orientatoriOptions);
      console.log(response.data.message);
    } catch (error) {
      console.error(error);
    }
  };

  const updateLeadEsitoConMotivo = async (motivo, leadId, fatturato, esito) => {
    setPopupMotivi(false);
    try {
      const modifyLead = {
        esito,
        fatturato,
        motivo,
      };
      const response = await axios.put(`/lead/${userId}/update/${leadId.id}`, modifyLead);

      toast.success('Il lead è stato modificato con successo.');
      fetchLeads(orientatoriOptions);
    } catch (error) {
      console.error(error);
    }
  };

  const secref = React.useRef();

  const [etichettaModify, setEtichettaModify] = useState(false);
  const [leadSel, setLeadSel] = useState(null);

  const [nuovaEtichetta, setNuovaEtichetta] = useState('');

  const handleUpdateLead = (updatedLead) => {
    setSelectedLead(updatedLead);
  };

  return (
    <>
        {popupModify && 
        <div className="shadow-popup-modify">
        <PopupModify
        onClose={JustClosePopup}
        lead={selectedLead}
        onUpdateLead={handleUpdateLead}
        setPopupModify={() => setPopupModify(false)}
        deleteLead={deleteLead}
        popupRef={popupRef}
        fetchLeads={() => fetchLeads(orientatoriOptions)}
         />
         </div>
         }
    <div className="Table-admin" style={{marginTop: '-30px'}}>

      <div className="filtralead">
        <h5 style={{ color: "gray", fontSize: '18px', marginBottom: '15px' }}>Selezione filtri:</h5>
        <div className="wrapperwrapper">
          <div>
            <p style={{ color: "gray", fontSize: '14px' }}>Filtra per data</p>
            <div className="wrapper">
              <div>
                <label>Da</label>
                <input value={!startDate ? "" : new Date(startDate).toISOString().split('T')[0]} type="date" onChange={(e) => {setStartDate(e.target.valueAsDate); localStorage.setItem("startDate", e.target.valueAsDate)}} />
              </div>
              <div>
                <label>A</label>
                <input value={!endDate ? "" : new Date(endDate).toISOString().split('T')[0]} type="date" onChange={(e) => {setEndDate(e.target.valueAsDate); localStorage.setItem("endDate", e.target.valueAsDate)}} />
              </div>
            </div>            
          </div>

          {state.user.role && state.user.role === "orientatore" ?
           null :
          <div className="filter-etichette">
            <p style={{ color: "gray", fontSize: '14px' }}>Filtra per orientatore</p>
              <select
                id="etichettaSelect"
                placeholder="Nome orientatore"
                value={selectedOrientatore}
                onChange={(e) => {setSelectedOrientatore(e.target.value); localStorage.setItem("Ori", e.target.value)}}
              >
                <option value="">Tutti</option>
                {orientatoriOptions && orientatoriOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.nome} {' '} {option.cognome}
                </option>
              ))}
              <option value="nonassegnato">Non assegnato</option>
              </select>
          </div>}
          <div className="filtra-recall">
            <p style={{ color: "gray", fontSize: '14px' }}>Filtra per Recall</p>
            <div className="recall-option">
              <label>
                <input
                  type="radio"
                  name="recallOption"
                  value="si"
                  checked={recallFilter === true}
                  onChange={() => {
                    setRecallFilter(true);
                    localStorage.setItem("recallFilter", "true");
                  }}
                />
                Si
              </label>
              <label>
                <input
                  type="radio"
                  name="recallOption"
                  value="no"
                  checked={recallFilter === false}
                  onChange={() => {
                    setRecallFilter(false);
                    setFilteredData(originalData);
                    localStorage.removeItem('recallFilter');
                  }}
                />
                No
              </label>
            </div>
          </div>
          <button onClick={handleClearFilter} className="button-filter rimuovi-button">Rimuovi filtri</button>
        </div>
      </div>
      <hr className="linea-filtri" />
      <div className="filtralead filtralead2">
        <div className="wrapperwrapper">
          <div className="leadslinks secondLink">
              <button id="visualbtt" onClick={handletogglegrid} className="">
                <img src={listaImg} />
                {toggleGrid ?
                  "Visualizza griglia"
                  :
                  "Visualizza lista"
                }
              </button>
              <button onClick={handleOpenAddPopup}>
                <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" /></svg>
                <span>
                  Aggiungi lead
                </span>
              </button>
            </div>          
        </div>
      </div>

      {changeOrientatore && 
              <div className="popup-container">
              <div className="popup" id="filterbyesito" ref={popupRef}>
                <div className='popup-top'>
                  <h4>Seleziona l'orientatore</h4>
                </div>
    
                <svg id="modalclosingicon" onClick={() => setChangeOrientatore(false)} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
    
                <div className="labelwrapper" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px'}}>
                  <select required value={selectedOrientatoreToChange} onChange={(e) => setSelectedOrientatoreToChange(e.target.value)}>
                  <option value="" disabled defaultChecked>Seleziona un orientatore</option>
                  {orientatoriOptions && orientatoriOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.nome} {' '} {option.cognome}
                    </option>
                  ))}
                </select>
                </div>
    
    
                <button className="btn-orie" style={{ fontSize: "19px" }} onClick={updateOrientatore}>Modifica</button>
                <div style={{ cursor: "pointer", marginTop: "20px" }} onClick={() => setChangeOrientatore(false)}><u>Torna indietro</u></div>
              </div>
            </div>
      }

      {esitoOpen &&
        <div className="popup-container">
          <div className="popup" id="filterbyesito" ref={popupRef}>

            <div className='popup-top'>
              <h4>Seleziona un esito da filtrare</h4>
            </div>

            <svg id="modalclosingicon" onClick={() => setEsitoOpen(false)} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>

            <div className="labelwrapper">
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.dacontattare}
                  onChange={() => toggleFilter('dacontattare')}
                />
                <h3>
                  Da contattare
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.inlavorazione}
                  onChange={() => toggleFilter('inlavorazione')}
                />
                <h3>
                  In lavorazione
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.noninteressato}
                  onChange={() => toggleFilter('noninteressato')}
                />
                <h3>
                  Non interessato
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.nonRisponde}
                  onChange={() => toggleFilter('nonRisponde')}
                />
                <h3>
                  Non risponde
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.nonValido}
                  onChange={() => toggleFilter('nonValido')}
                />
                <h3>
                  Non valido
                  {/* <h4>Non risponde al telefono</h4> */}
                </h3>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.opportunita}
                  onChange={() => toggleFilter('opportunita')}
                />
                <h3>
                  Opportunità
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.invalutazione}
                  onChange={() => toggleFilter('invalutazione')}
                />
                <h3>
                  In valutazione
                  {/* <h4>Non risponde al telefono</h4> */}
                </h3>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStatusEsito.venduto}
                  onChange={() => toggleFilter('venduto')}
                />
                <h3>
                  Venduto
                  {/* <h4>Non risponde al telefono</h4> */}
                </h3>
              </label>
            </div>


            <button className="btn-orie" style={{ fontSize: "19px" }} onClick={handleClickEsito}>Applica filtri</button>
            <div style={{ cursor: "pointer", marginTop: "20px" }} onClick={() => {setEsitoOpen(false); setOrientatoriOpen(false)}}><u>Torna indietro</u></div>
          </div>
        </div>
      }

        {addOpen && <AddLeadPopup
        setAddOpen={setAddOpen} popupRef={popupRef} fetchLeads={() => fetchLeads(orientatoriOptions)}
         />}
      <Suspense fallback={<div>Loading...</div>}>
        {popupMotivi && (
          <div className="shadow-popup">
            <PopupMotivo
              type={typeMotivo}
              onClose={() => setPopupMotivi(false)}
              spostaLead={updateLeadEsitoConMotivo}
              leadId={leadIdMotivo}
            />
          </div>
        )}
      </Suspense>

      {deleting && (
        <div className="add-lead-popup" id="popupdeletelead" ref={popupRef}>
          <div className="popup-top">
            <h4>Eliminazione Lead</h4>
          </div>

          <svg id="modalclosingicon" onClick={() => { setDeleting(false); SETheaderIndex(999) }} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>

          <p>Sei sicuro di voler eliminare il lead {selectedLead.name}?</p>

          <button className='btn-orie' onClick={handleDelete}>Elimina</button>
          <div style={{ cursor: "pointer", textAlign: "center" }} onClick={() => { setDeleting(false); SETheaderIndex(999) }}><u>Torna indietro</u></div>

        </div>
      )}


      {popupModifyEsito && (
                    <div style={{marginTop: '-90px', position: 'fixed'}} className="choose-esito-popup">
                        <div className='top-choose-esito'>
                        <h4>Modifica l'esito di {selectedLead.name}</h4>
                        </div>

                        <svg id="modalclosingicon-popup" onClick={() => { setPopupModifyEsito(false)}} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
                             <div className='esiti-option-div' style={{ display: 'flex', justifyContent: 'center', overflowY: 'scroll' }}>
                                <div className={esito === "Da contattare" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Da contattare')}>
                                    <span><span>o</span></span>
                                    Da contattare
                                </div>
                                <div className={esito === "In lavorazione" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('In lavorazione')}>
                                    <span><span>o</span></span>
                                    In lavorazione
                                </div>
                                <div className={esito === "Non risponde" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Non risponde')}>
                                    <span><span>o</span></span>
                                    Non risponde
                                </div>
                                <div className={esito === "Irraggiungibile" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Irraggiungibile')}>
                                    <span><span>o</span></span>
                                    Irraggiungibile
                                </div>
                                <div className={esito === "Non valido" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Non valido')}>
                                    <span><span>o</span></span>
                                    Non valido
                                {esito === "Non valido" && (
                                    <select className="selectMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                    <option value='' disabled>Seleziona motivo</option>
                                    {motivoNonValidoList.map((motivoOption, index) => (
                                        <option key={index} value={motivoOption}>{motivoOption}</option>
                                    ))}
                                    </select>
                                )}
                                </div>
                                <div className={esito === "Non interessato" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Non interessato')}>
                                    <span><span>o</span></span>
                                    Lead persa
                                    {esito === "Non interessato" && (
                                        <select className="selectMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                        <option value='' disabled>Seleziona motivo</option>
                                        {motivoLeadPersaList.map((motivoOption, index) => (
                                            <option key={index} value={motivoOption}>{motivoOption}</option>
                                        ))}
                                        </select>
                                    )}
                                </div>
                                <div className={esito === "Opportunità" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Opportunità')}>
                                    <span><span>o</span></span>
                                    Opportunità
                                </div>
                                <div className={esito === "In valutazione" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('In valutazione')}>
                                    <span><span>o</span></span>
                                    In valutazione
                                </div>
                                <div className={esito === "Venduto" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Venduto')}>
                                    <span><span>o</span></span>
                                    Venduto
                                    {esito === 'Venduto' ?
                                        <label id="prezzovenditaesito">
                                            Inserisci importo della retta annuale
                                            <input
                                            type="text"
                                            placeholder="Fatturato"
                                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '16px' }}
                                            onChange={(e) => setFatturato(e.target.value)}
                                            value={fatturato}
                                            required />
                                        </label>
                                        :
                                        null}
                                    {esito === "Venduto" && (
                                            <select className="selectMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                            <option value='' disabled>Seleziona motivo</option>
                                            {motivoVendutoList.map((motivoOption, index) => (
                                                <option key={index} value={motivoOption}>{motivoOption}</option>
                                            ))}
                                            </select>
                                        )}
                                </div>
                                <div className={esito === "Iscrizione posticipata" ? "selected-option-motivo esito-option" : "esito-option"}  onClick={() => setEsito('Iscrizione posticipata')}>
                                    <span><span>o</span></span>
                                    Iscrizione posticipata
                                </div>
                            </div>
                        <button style={{ fontSize: "14px" }} className='btn-orie' onClick={updateLeadEsito}>Salva modifiche</button>
                        </div>
      )
      }


      {toggleGrid ?
        <div style={{ boxShadow: "0px 0px 20px 2px #80808029", borderRadius: '20px', padding: '30px 20px', maxHeight: '58vh',  }} className="table-big-container">
          <div className="table-filters">
            <div id="wrapperleadsright">
              <div className="filter-etichette">
                {/*<button className='btn-orie' onClick={() => setEsitoOpen(true)}>Filtra per esito</button>*/}
                <select value={esitoToFilter} onChange={(e) => cambiaEsito(e.target.value)} style={{fontSize: '16px'}}>
                  <option style={{fontSize: '16px'}} value='' disabled>{esitoToFilter ? esitoToFilter : "Seleziona esito"}</option>
                  <option style={{fontSize: '16px'}} value="Nessun filtro">Nessun filtro</option>
                  <option style={{fontSize: '16px'}} value='Da contattare'>Da contattare</option>
                  <option style={{fontSize: '16px'}} value='In lavorazione'>In lavorazione</option>
                  <option style={{fontSize: '16px'}} value='Non risponde'>Non risponde</option>
                  <option style={{fontSize: '16px'}} value="Irraggiungibile">Irraggiungibile</option>
                  <option style={{fontSize: '16px'}} value="Non valido">Non valido</option>
                  <option style={{fontSize: '16px'}} value='Non interessato'>Lead persa</option>
                  <option style={{fontSize: '16px'}} value='Opportunità'>Opportunità</option>
                  <option style={{fontSize: '16px'}} value='In valutazione'>In valutazione</option>
                  <option style={{fontSize: '16px'}} value='Venduto'>Venduto</option>
                  <option style={{fontSize: '16px'}} value="Iscrizione posticipata">Iscrizione posticipata</option>
                </select>
              </div>
            </div>
          </div>

          <div id="oftable">
            <table aria-label="simple table" className="table-container">
              <thead style={{ zIndex: '5', width: '100%' }}>
                <tr>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Nome</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Data e ora</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Telefono</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Esito</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Dati cliente</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}>Orientatore</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "600" }}></th>
                </tr>
              </thead>
            
              <tbody style={{ color: "white", textAlign: 'left', padding: '0 20px' }} className="table-body-container" id="table2lista">
                {filteredData && filteredData
                  .filter(r =>
                    r.name.toLowerCase().includes(searchval.toLowerCase()) ||
                    r.telephone.toLowerCase().includes(searchval.toLowerCase())
                  )
                  .filter(r => (esitoToFilter && esitoToFilter !== undefined ? r.status === esitoToFilter : true))
                  .sort((a, b) => new Date(a.date) < new Date(b.date) ? 1 : -1)
                  .map((row) => (
                    <tr className={row.campagna === "Mgm" ? "mgm-lead" : ""} style={{position:'relative', padding: '0 20px'}} key={row.id}>
                      <td className="row-name">
                        {row.name}
                      </td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.telephone}</td>
                      <td>
                        <span
                          className={"status " + row.status}
                          onClick={() => handleModifyPopupEsito(row)}
                        >
                          <IoIosArrowDown size={12} />
                          {row.status == "Non interessato" ? "Lead persa" : row.status}
                        </span>
                      </td>
                      <td className="modify-table" onClick={() => handleModifyPopup(row)}>Info <IoIosArrowDown size={12} /></td>
                      <td style={{cursor: 'pointer'}} className="Details" onClick={() => openChangeOrientatore(row)}>{row.orientatore} <IoIosArrowDown size={12} /></td>
                      <td>
                      <p 
                      onClick={row?.orientatore ? null : () => openChangeOrientatore(row)} 
                      className={row?.orientatore ? 'iniziali' : 'iniziali redIniz'}
                      >
                        {row?.orientatore ? (
                              <>
                                {(() => {
                                  const parts = row.orientatore.split(' ');

                                  if (parts.length >= 2) {
                                    const iniziali = parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
                                    return <span>{iniziali}</span>;
                                  } else {
                                    return "NV";
                                  }
                                })()}
                              </>
                            ) : (
                              "+"
                            )}
                        </p>
                      </td>
                    </tr>
                  ))}
              </tbody>


            </table>
          </div>
        </div>







        :








        <div className="sectionswrapper"
          ref={secref}
        >
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Da contattare")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Da contattare"}
              refreshate={false}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.dacontattare && filteredData && filteredData.filter(x => x.status == "Da contattare").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                  nuovaEtichetta={nuovaEtichetta}
                  setNuovaEtichetta={setNuovaEtichetta}
                  selezionOrientatore={openChangeOrientatore}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Non risponde")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Non risponde"}
              refreshate={false}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.nonRisponde && filteredData && filteredData.filter(x => x.status == "Non risponde").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                  nuovaEtichetta={nuovaEtichetta}
                  setNuovaEtichetta={setNuovaEtichetta}
                  selezionOrientatore={openChangeOrientatore}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Da richiamare")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Da richiamare"}
              refreshate={false}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.irraggiungibile && filteredData && filteredData.filter(x => x.status == "Irraggiungibile").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                  nuovaEtichetta={nuovaEtichetta}
                  setNuovaEtichetta={setNuovaEtichetta}
                  selezionOrientatore={openChangeOrientatore}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Non interessato")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Lead persa"}
              getOtherLeads={getOtherLeads}
              refreshate={refreshate}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.noninteressato && filteredData && filteredData.filter(x => x.status == "Non interessato").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                  nuovaEtichetta={nuovaEtichetta}
                  setNuovaEtichetta={setNuovaEtichetta}
                  selezionOrientatore={openChangeOrientatore}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Venduto")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Venduto"}
              refreshate={false}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.venduto && filteredData && filteredData.filter(x => x.status == "Venduto").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                  nuovaEtichetta={nuovaEtichetta}
                  setNuovaEtichetta={setNuovaEtichetta}
                  selezionOrientatore={openChangeOrientatore}
                />
              )}
            </div>
          </div>
        </div>





      }
      <div onClick={leadMancantiPopup == false ? () => setLeadMancantiPopup(true) : null} className={`${leadMancantiPopup == true ? 'filtralead leadMancantiContainer' : 'filtralead leadMancantiContainer-closed'}`}>
        <svg id="modalclosingicon-mancanti" onClick={() => setLeadMancantiPopup(false)} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
        <div className="leadMancanti">
            <h5 className="comparsa">Ti rimangono ancora <span>{monthlyLeadCounter} lead</span>. Hai bisogno di più
          contatti? <a href="/account">Cambia il tuo piano</a> o <a href="/boost">effettua un Boost</a></h5>
            <h5 className="scomparsa">Apri</h5>
          
        </div>
      </div>
    </div>
    </>
  );
}
