import * as React from "react";
import { useState, useEffect, useContext } from "react";
import '../../../components/Table/Table2.scss';
import { UserContext } from "../../../context";
import axios from "axios";
import PopupModify from "./PopupModify";
import toast from "react-hot-toast";
import LeadEntry from '../../../components/Table/LeadEntry'
import '../pageLeadEcp.css'
import { IoIosArrowDown } from 'react-icons/io';
import { FaWhatsapp, FaFacebook, FaGoogle } from 'react-icons/fa';
import LeadHeader from "../../../components/Table/LeadHeader";
import { SyncOutlined } from "@ant-design/icons";
import comparacorsi from '../../../imgs/comparacorsi.png'

export default function TableSuperAdmin({ userId, handleClosePopupAll }) {
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
  const [isLoading, setIsLoading] = useState(false);
  console.log(userId);

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
        })
        .catch(error => {
          console.error(error);
        });
    }

    if (state && state.token) getOrientatori();
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

  const toggleFilter = (filter) => {
    setSelectedStatusEsito((prevFilters) => ({
      ...prevFilters,
      [filter]: !prevFilters[filter],
    }));
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('/get-leads-manual', {
        _id: userId,
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const filteredTableLead = response.data.map((lead) => {
        const telephone = lead.numeroTelefono ? lead.numeroTelefono.toString() : '';
        const cleanedTelephone =
          telephone.startsWith('+39') && telephone.length === 13
            ? telephone.substring(3)
            : telephone;


        return {
          name: lead.nome,
          surname: lead.cognome,
          email: lead.email,
          date: lead.data,
          telephone: cleanedTelephone,
          status: lead.esito,
          orientatore: lead.orientatori ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : '',
          facoltà: lead.facolta ? lead.facolta : '',
          fatturato: lead.fatturato ? lead.fatturato : '',
          università: lead.università ? lead.università : '',
          campagna: lead.campagna,
          corsoDiLaurea: lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
          oreStudio: lead.oreStudio ? lead.oreStudio : '',
          provincia: lead.provincia ? lead.provincia : '',
          note: lead.note ? lead.note : '',
          id: lead._id,
          fequentiUni: lead.frequentiUni ? lead.fequentiUni : false,
          nameCampagna: lead.nameCampagna ? lead.nameCampagna : '',
          adsets: lead.adsets ? lead.adsets : '',
          annunci: lead.annunci ? lead.annunci : '',
          motivo: lead.motivo ? lead.motivo : null,
          recallHours: lead.recallHours ? lead.recallHours : null,
          recallDate: lead.recallDate ? lead.recallDate : null 
        };
      });

      setFilteredData(filteredTableLead);
      setOriginalData(filteredTableLead);
      localStorage.setItem('table-lead', JSON.stringify(filteredTableLead));
      console.log(filteredTableLead)
      setIsLoading(false);
      //return filteredTableLead;
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);
  


  function handleFilterChange(filtertype) {
    console.log(filtertype)
    setSelectedFilter(filtertype);
    if (filtertype === "esito"){
      setEsitoOpen(true);
      console.log(esitoOpen);
   } else if (filtertype === "orientatori"){
     setOrientatoriOpen(true);
   }

    // setCalendarOpen(true);
    // document.body.classList.add("overlay");
  }

  const handleNameChange = (event) => {
    setFilterValue(event.target.value);
  };

  useEffect(() => {
    const filteredDataIn = originalData.filter((row) => {
      const filterNum = parseInt(filterValue);
      if (!isNaN(filterNum)) {
        return typeof row.telephone === 'string' && row.telephone.startsWith(filterValue);
      } else {
        const searchTerms = filterValue.toLowerCase().split(' ');

        const fullName = row.name.toLowerCase() + ' ' + row.surname.toLowerCase();
        return searchTerms.every(term => fullName.includes(term));
      }
    }).map((row) => {
      return {
        id: row.id,
        name: row.name,
        surname: row.surname,
        date: row.date,
        telephone: row.telephone,
        status: row.status,
        orientatore: row.orientatore,
        nameCampagna: row.nameCampagna ? row.nameCampagna : '',
        adsets: row.adsets ? row.adsets : '',
        annunci: row.annunci ? row.annunci : '',
        campagna: row.campagna ? row.campagna : '',
      };
    });
    setFilteredData(filteredDataIn);
  }, [filterValue])

  const handleClickDate = () => {
    const filteredDataNew = filterDataByDate(filteredData, startDate, endDate);
    setFilteredData(filteredDataNew);
    setCalendarOpen(false);
    document.body.classList.remove("overlay");
  }

  const handleClickEsito = () => {
    if (selectedFilter == 'esito'){
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
        setEsitoOpen(false);
    } else if ( selectedFilter == 'orientatori'){
      const selectedOrientatoreObj = orientatoriOptions.find(option => option._id === selectedOrientatore);
      const selectedOrientatoreFullName = selectedOrientatoreObj ? selectedOrientatoreObj.nome + ' ' + selectedOrientatoreObj.cognome : '';
    
      const filteredDataNew = filteredData.filter((row) => {
        const rowOrientatoreFullName = row.orientatore;
        return rowOrientatoreFullName === selectedOrientatoreFullName;
      });

      setFilteredData(filteredDataNew);
      setOrientatoriOpen(false);
    }

  }

  useEffect(() => {
    if (filterValue === '') {
      setFilteredData(originalData);
    }
  }, [filterValue]);

  const filterDataByDate = (data, startDate, endDate) => {
    const filteredData = data.filter((row) => {
      const rowDate = Date.parse(row.date);
      const selectedDateStart = Date.parse(startDate);
      const selectedDateEnd = Date.parse(endDate);
      return rowDate >= selectedDateStart && rowDate < selectedDateEnd;
    });

    return filteredData;
  };

  const handleClearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setFilteredData(originalData);
    setSelectedFilter('');
  };

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

    //SETheaderIndex(0)
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
  
      setChangeOrientatore(false);
  
      fetchLeads();
      toast.success('Il lead è stato modificato con successo.');
      console.log(response.data.message); // Messaggio di successo dalla risposta del backend
    } catch (error) {
      console.error(error);
    }
  };
  

  const deleteLead = async (leadId) => {
    try {
      const response = await axios.delete('/delete-lead', { data: { id: leadId } });
      console.log(response.data.message);
      toast.success('Hai eliminato correttamente il lead');
      fetchLeads();
    } catch (error) {
      console.error(error.message);
      toast.error('Si è verificato un errore.')
    }
  };

  const handleDelete = (event) => {
    event.preventDefault();
    console.log(selectedLead.id);
    deleteLead(selectedLead.id)
  }

  const updateLeadEsito = async () => {
    const leadId = selectedLead.id
    try {
      const modifyLead = {
        esito,
        fatturato,
      };
      const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);

      setPopupModifyEsito(false);
      //SETheaderIndex(999)

      toast.success('Il lead è stato modificato con successo.')
      fetchLeads();
    } catch (error) {
      console.error(error);
    }
  };

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
  })

  useEffect(() => {
    if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
      const filteredDataNew = filterDataByDate(originalData, startDate, endDate);
      setFilteredData(filteredDataNew);
    }
  }, [startDate, endDate])


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


  const handletogglegrid = () => {
    SETtogglegrid(!toggleGrid)

    localStorage.setItem("toggleGrid", localStorage.getItem("toggleGrid") == "on" ?
      "off" : "on"
    )
  }


  const handleDragEnd = (event) => {
    // Verifica se il drag è stato completato in una zona valida o non valida

    // Rimuovi lo stile indipendentemente dalla zona di destinazione
    document.querySelectorAll(".secwrap").forEach(e => e.classList.remove("colordroprow"));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    document.querySelectorAll(".secwrap").forEach(e => e.classList.add("colordroprow"))
  };

  const handleDrop = (event, type) => {
    event.preventDefault();

    const droppedItem = JSON.parse(event.dataTransfer.getData('text/plain'));
    const draggedLeadId = droppedItem.id;
    if (type === draggedLeadId.status) {
      return null
    } else if (type === "Venduto") {
      // Richiesta del fatturato
      const inputFatturato = prompt("Inserisci il fatturato:");
      if (inputFatturato !== null) {
        const fatturato = parseInt(inputFatturato, 10);
        updateLeadEsito2(draggedLeadId, fatturato, type);
      }
    } else {
      // Altrimenti, per le altre categorie, imposto il fatturato a 0
      updateLeadEsito2(draggedLeadId, 0, type);
    }

  };

  const updateLeadEsito2 = async (leadId, fatturato, esito) => {
    console.log(leadId);
    try {
      const modifyLead = {
        esito,
        fatturato,
      };
      const response = await axios.put(`/lead/${userId}/update/${leadId.id}`, modifyLead);

      toast.success('Il lead è stato modificato con successo.');
      fetchLeads();
      console.log(response.data.message); // Messaggio di successo dalla risposta del backend
    } catch (error) {
      console.error(error);
    }
  };

  const secref = React.useRef()

  return (
    <div className="Table-admin" style={{overflowY: 'auto', height: 'auto'}}>
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
        <>
        <div class="filtralead">
        <h5 style={{ color: "gray" }}>Filtra per data</h5>
        <div className="wrapperwrapper-super">
          <div class="wrapper">
            <div>
              <label>Da</label>
              <input value={!startDate ? "" : new Date(startDate).toISOString().split('T')[0]} type="date" onChange={(e) => setStartDate(e.target.valueAsDate)} />
            </div>
            <div>
              <label>A</label>
              <input value={!endDate ? "" : new Date(endDate).toISOString().split('T')[0]} type="date" onChange={(e) => setEndDate(e.target.valueAsDate)} />
            </div>
          </div>

          <div className="leadslinks">
            <button id="visualbtt" className="button-scheda-ecp" onClick={handletogglegrid}>
              {toggleGrid ?
                "Visualizza griglia"
                :
                "Visualizza lista"
              }
            </button>
          </div>
        </div>
      </div>
      <div className="close-page-lead">
        <button onClick={handleClosePopupAll} className="button-scheda-ecp">Chiudi pagina Lead</button>
      </div>

{orientatoriOpen &&
        <div className="popup-container">
          <div className="popup" id="filterbyesito">
            <div className='popup-top'>
              <h4>Seleziona l'orientatore da filtrare</h4>
            </div>

            <svg id="modalclosingicon" onClick={() => setOrientatoriOpen(false)} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>

            <div className="labelwrapper" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px'}}>
              <select required value={selectedOrientatore} onChange={(e) => setSelectedOrientatore(e.target.value)}>
              <option value="">Seleziona un orientatore</option>
              {orientatoriOptions && orientatoriOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.nome} {' '} {option.cognome}
                </option>
              ))}
            </select>
            </div>


            <button className="btn-orie" style={{ fontSize: "19px" }} onClick={handleClickEsito}>Applica filtri</button>
            <div style={{ cursor: "pointer", marginTop: "20px" }} onClick={() => {setEsitoOpen(false); setOrientatoriOpen(false)}}><u>Torna indietro</u></div>
          </div>
        </div>
      }

      {changeOrientatore && 
              <div className="popup-container">
              <div className="popup" id="filterbyesito">
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
        <div className="popup-container" style={{top: '-9vh', zIndex: '2000'}}>
          <div className="popup" id="filterbyesito">

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
                  Iscrizione
                  {/* <h4>Non risponde al telefono</h4> */}
                </h3>
              </label>
            </div>


            <button className="btn-orie" style={{ fontSize: "19px" }} onClick={handleClickEsito}>Applica filtri</button>
            <div style={{ cursor: "pointer", marginTop: "20px" }} onClick={() => {setEsitoOpen(false); setOrientatoriOpen(false)}}><u>Torna indietro</u></div>
          </div>
        </div>
      }

      {popupModify &&
      <div className="container-super-modify" style={{width: '100%', height: 'auto', display: 'flex', justifyContent: 'center'}}>
          <PopupModify
          userIdNew={userId}
          onClose={JustClosePopup}
          lead={selectedLead}
          setPopupModify={() => setPopupModify(false)}
          deleteLead={() => deleteLead(selectedLead._id)}
          fetchLeads={fetchLeads}
        />
      </div>

      }

      {deleting && (
        <div className="add-lead-popup" id="popupdeletelead">
          <div className="popup-top">
            <h4>Eliminazione Lead</h4>
          </div>

          <svg id="modalclosingicon" onClick={() => { setDeleting(false); SETheaderIndex(999) }} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>

          <p>Sei sicuro di voler eliminare il lead {selectedLead.name}?</p>

          <button className='btn-orie' onClick={handleDelete}>Elimina</button>
          <div style={{ cursor: "pointer", textAlign: "center" }} onClick={() => { setDeleting(false) }}><u>Torna indietro</u></div>

        </div>
      )}


      {popupModifyEsito && (
        <div className="add-lead-popup" id="popupmodifesito" style={{top: '1vh', left: '30%'}}>

          <div className='popup-top'>
            <h4>Modifica l'esito di {selectedLead.name}</h4>
          </div>

          <svg id="modalclosingicon" onClick={() => { setPopupModifyEsito(false)}} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>


          <label style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <select id="selectesiti" value={esito} size={6} style={{ cursor: 'pointer', overflowY: "scroll", overflowX: 'hidden' }} required onChange={(e) => setEsito(e.target.value)}>
              {/* <option value='' disabled>{selectedLead.status}</option> */}
              <option value='Da contattare'>Da contattare</option>
              <option value='In lavorazione'>In lavorazione</option>
              <option value='Non interessato'>Non interessato</option>
              <option value='Non risponde'>Non risponde</option>
              <option value='Non valido'>Non valido</option>
              <option value='Opportunità'>Opportunità</option>
              <option value='In valutazione'>In valutazione</option>
              <option value='Venduto'>Iscrizione</option>
            </select>
          </label>
          {esito === 'Venduto' ?
            <label id="prezzovenditaesito">
              Prezzo di vendita
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
          <button style={{ fontSize: "19px" }} className='btn-orie' onClick={updateLeadEsito}>Salva modifiche</button>
          <div style={{ cursor: "pointer", textAlign: "center" }} onClick={() => { setPopupModifyEsito(false); SETheaderIndex(999) }}><u>Torna indietro</u></div>
        </div>
      )
      }


      {toggleGrid ?
        <div style={{ boxShadow: "0px 0px 20px 2px #80808029", borderRadius: '20px', padding: '30px 20px', maxHeight: '58vh', minWidth: '98%' }} className="table-big-container">
          <div className="table-filters">
            {/* <div>
              <h4>Tutti i leads</h4>
              <p id="activenow" >Attivi ora</p>
            </div> */}
            <div id="wrapperleadsright">
              <div id="leadscerca">
                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" enable-background="new 0 0 50 50" >
                  <path fill="#231F20" d="M20.745,32.62c2.883,0,5.606-1.022,7.773-2.881L39.052,40.3c0.195,0.196,0.452,0.294,0.708,0.294
	c0.255,0,0.511-0.097,0.706-0.292c0.391-0.39,0.392-1.023,0.002-1.414L29.925,28.319c3.947-4.714,3.717-11.773-0.705-16.205
	c-2.264-2.27-5.274-3.52-8.476-3.52s-6.212,1.25-8.476,3.52c-4.671,4.683-4.671,12.304,0,16.987
	C14.533,31.37,17.543,32.62,20.745,32.62z M13.685,13.526c1.886-1.891,4.393-2.932,7.06-2.932s5.174,1.041,7.06,2.932
	c3.895,3.905,3.895,10.258,0,14.163c-1.886,1.891-4.393,2.932-7.06,2.932s-5.174-1.041-7.06-2.932
	C9.791,23.784,9.791,17.431,13.685,13.526z"/>
                </svg>

                <input
                  type="text"
                  placeholder="Cerca..."
                  onChange={handleNameChange}
                  value={filterValue} />
              </div>

              <div id="leadsfiltra">
                <span>Filtra per </span>
                <select
                  name="filtro"
                  value={selectedFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}>
                  <option value="" disabled>Seleziona</option>
                  {/* <option value="data">Data e ora</option> */}
                  <option value="esito">Esito</option>
                  <option value="orientatori">Orientatore</option> 
                </select>
                <button onClick={handleClearFilter} className="button-filter">Rimuovi filtro</button>
              </div>
            </div>
          </div>

          <div id="oftable">
            <table aria-label="simple table" className="table-container">
              <thead style={{ zIndex: '5' }}>
                <tr>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Nome</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Cognome</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Data e ora</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Telefono</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Esito</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Dati cliente</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Orientatore</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Provenienza</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Campagna</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Adsets</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px', fontWeight: "600" }}>Annunci</th>
                </tr>
              </thead>

              <tbody style={{ color: "white", textAlign: 'left' }} className="table-body-container" id="table2lista">
                {filteredData && filteredData
                  .sort((a, b) => new Date(a.date) < new Date(b.date) ? 1 : -1)
                  .map((row) => (
                    <tr key={row.id}>
                      <td onClick={() => handleRowClick(row)}>{row.name}</td>
                      <td>{row.surname}</td>
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
                      <td style={{}}>
                          {row.campagna === 'Whatsapp' && (
                              <FaWhatsapp size={24} color="green" />
                            )}
                            {row.campagna === 'Social' && (
                              <FaFacebook size={24} color="blue" />
                            )}
                            {row.campagna === 'Wordpress' && (
                              <FaGoogle size={24} color="red" />
                            )}
                           {row.campagna === 'comparatore' && (
                              <img style={{width: 43 , height: 43,}} src={comparacorsi}/>
                            )}
                           {row.campagna === 'affiliati' && (
                              <p style={{textAlign: 'center', padding: '6px 20px', backgroundColor: 'green', borderRadius: 30, color: 'white'}}>Affiliati</p>
                            )}
                      </td>
                      <td>{row.nameCampagna ? row.nameCampagna : ''}</td>
                      <td>{row.adsets ? row.adsets : ''}</td>
                      <td>{row.annunci ? row.annunci : ''}</td>
                    </tr>
                  ))}
              </tbody>


            </table>
          </div>
        </div>







        :








        <div className="sectionswrapper"
        style={{overflowX: 'scroll', width: '60%', margin: '0 auto'}}
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
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.dacontattare && filteredData && filteredData.filter(x => x.status == "Da contattare").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
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
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.nonRisponde && filteredData && filteredData.filter(x => x.status == "Non risponde").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Irraggiungibile")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Irraggiungibile"}
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
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "In lavorazione")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"In lavorazione"}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.inlavorazione && filteredData && filteredData.filter(x => x.status == "In lavorazione").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Non valido")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Non valido"}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.nonValido && filteredData && filteredData.filter(x => x.status == "Non valido").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
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
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.noninteressato && filteredData && filteredData.filter(x => x.status == "Non interessato").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Opportunità")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Opportunità"}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />

            <div className="entries">
              {toggles.opportunita && filteredData && filteredData.filter(x => x.status == "Opportunità").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "In valutazione")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"In valutazione"}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.invalutazione && filteredData && filteredData.filter(x => x.status == "In valutazione").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  secref={secref}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
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
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.venduto && filteredData && filteredData.filter(x => x.status == "Venduto").map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
          <div className="secwrap"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Iscrizione posticipata")}
            onDragEnd={handleDragEnd}
          >
            <LeadHeader
              handleModifyPopupEsito={(r) => handleModifyPopupEsito(r)}
              type={"Iscrizione posticipata"}
              toggles={toggles} SETtoggles={SETtoggles} filteredData={filteredData} />
            <div className="entries">
              {toggles.iscrizionePosticipata && filteredData && filteredData.filter(x => x.status == "Iscrizione posticipata").reverse().map((row, k) =>
                <LeadEntry
                  id={JSON.stringify(row)}
                  index={k}
                  handleRowClick={handleRowClick} data={row}
                  handleModifyPopup={handleModifyPopup}
                  secref={secref}
                  handleModifyPopupEsito={handleModifyPopupEsito}
                  handleDelete={handleDelete}
                  campagna={row.campagna}
                />
              )}
            </div>
          </div>
        </div>





      }
        </>
        }

      

    </div>
  );
}
