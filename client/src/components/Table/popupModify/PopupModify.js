import React, { useContext, useState, useEffect } from 'react'
import './popupModify.scss'
import { WhatsAppOutlined } from '@ant-design/icons';
import { FaPencilAlt, FaSave } from "react-icons/fa";
import { FiClock } from 'react-icons/fi';
import icon1 from '../../../imgs/Group.png';
import { UserContext } from '../../../context';
import { ProvinceItaliane } from '../../Data';
import axios from 'axios';
import toast from 'react-hot-toast';
import recallblue from '../../../imgs/recallblue.png';
import indietro from '../../../imgs/indietro.png';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import recallgreen from '../../../imgs/recallGren.png';
import moment from 'moment';

const PopupModify = ({ lead, onClose, setPopupModify, onUpdateLead, deleteLead , admin = false, popupRef, fetchLeads, setInfoPopup}) => {
    const [state, setState] = useContext(UserContext);
    const leadId = lead.id;
    const userId = state.user._id;
    const [email, setEmail] = useState(lead.email);
    const [campagna, setCampagna] = useState(lead.campagna ? lead.campagna : "");
    const [numeroTelefono, setNumeroTelefono] = useState(lead.telephone);
    const [orientatori, setOrientatori] = useState(lead.orientatore ? lead.orientatore : '');
    const [universita, setUniversita] = useState(lead.università ? lead.università : '');
    const [provincia, setProvincia] = useState(lead.provincia ? lead.provincia : '');
    const [note, setNote] = useState(lead.note ? lead.note : '');
    const [orientatoriOptions, setOrientatoriOptions] = useState([]);
    const [esito, setEsito] = useState(lead.status);
    const [tipologiaCorso, setTipologiaCorso] = useState(lead.tipologiaCorso ? lead.tipologiaCorso : "");
    const [corsoDiLaurea, setCorsoDiLaurea] = useState(lead.corsoDiLaurea ? lead.corsoDiLaurea : '');
    const [frequentiUni, setFrequentiUni] = useState(lead.frequentiUni !== null ? lead.frequentiUni === true ? "Si" : "No" : null);
    const [lavoro, setLavoro] = useState(lead.lavoro !== null ? lead.lavoro === true ? "Si" : "No" : null);
    const [categories, setCategories] = useState(lead.categories ? lead.categories : "");
    const [facolta, setFacolta] = useState(lead.facolta ? lead.facolta : '');
    const [budget, setBudget] = useState(lead.budget ? lead.budget : "");
    const [enrollmentTime, setEnrollmentTime] = useState(lead.enrollmentTime ? lead.enrollmentTime : "");
    const [fatturato, setFatturato] = useState(lead.fatturato ? lead.fatturato : '0');
    const [oraChiamataRichiesto, setOraChiamataRichiesto] = useState(lead.oraChiamataRichiesto ? lead.oraChiamataRichiesto : '');
    const [oreStudio, setOreStudio] = useState(lead.oreStudio ? lead.oreStudio : "");
    const [mostraCalendar, setMostraCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(lead.recallDate && lead.recallDate !== null ? new Date(lead.recallDate) : new Date());
    const [selectedTime, setSelectedTime] = useState({ hours: 7, minutes: 0 });

    const [motivo, setMotivo] = useState(lead.motivo ? lead.motivo : "");
    const [motivoNonValidoList, setMotivoNonValidoList] = useState([
        "Linea disattivata", "Numero errato", "Lead doppione", "Lead in carico ad ateneo"
    ]);
    const [motivoLeadPersaList, setMotivoLeadPersaList] = useState([
        "Disconoscimento richiesta", "Richiesta vecchia", "Nessuna risposta",
        "Solo curiosità", "Non vuole intermediari", "Fuori budget", "Prodotto non disponibile",
        "Altro ateneo", "Difficoltà nel reperire documentazione", "Titolo straniero senza equipollenza",
        "Prevalutazione rifiutata", "Motivi familiari/lavorativi"
    ]);
    const [motivoVendutoList, setMotivoVendutoList] = useState([
        "Promozione / sconto", "Convenzione", "Prevalutazione corretta",
        "Scatto di carriera", "Titolo necessario per concorso pubblico / candidatura",
        "Tempi brevi", "Sede d’esame vicino casa", "Consulenza orientatore",
    ]);

    function mapCampagnaPerLeadsystem(nomeCampagna) {
        if (nomeCampagna.includes('Comparatore')) {
          return 'Comparatore';
        } else if (nomeCampagna.includes('Donne lavoratrici')) {
          return 'Donna lavoratrice';
        } else if (nomeCampagna.includes('Lavoratori')) {
          return 'Lavoratori';
        } else if (nomeCampagna.includes('INSEGNANTI')) {
          return 'Insegnanti';
        } else if (nomeCampagna.includes('FORZE DELL\'ORDINE')) {
          return 'Forze dell\'ordine';
        } else if (nomeCampagna.includes('Lavoratori settore pubblico')) {
          return 'Lavoratori settore pubblico';
        } else if (nomeCampagna.includes('Comparatore Landing')) {
          return 'Comparatore';
        } else if (nomeCampagna.includes('chatbot')) {
          return 'chatbot';
        } else if (nomeCampagna.includes('mamme_donne')) {
          return 'Mamme';
        } else if (nomeCampagna.includes('All Inclusive')) {
          return 'All Inclusive';
        } else if (nomeCampagna.includes('Over 45')) {
          return 'Over 45';
        } else {
          return "Comparatore";
        }
      }

    const handleDateChange = (date) => {
      setSelectedDate(date);
    };

    useEffect(() => {
        if (lead.recallHours && lead.recallHours !== null) {
          const [hours, minutes] = lead.recallHours.split(':').map(Number);
          setSelectedTime({ hours, minutes });
        }
      }, [lead.recallHours]);

    const handleTimeChange = (e) => {
        const { name, value } = e.target;
        setSelectedTime((prevTime) => ({
          ...prevTime,
          [name]: parseInt(value, 10),
        }));
      };

      const handleSaveRecall = async () => {
        if (selectedDate && selectedTime) {
          const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
          const recallDate = localDate.toISOString().split('T')[0];
    
          const recallHours = `${selectedTime.hours}:${selectedTime.minutes < 10 ? `0${selectedTime.minutes}` : selectedTime.minutes}`;
    
          console.log('Recall Date:', recallDate);
          console.log('Recall Hours:', recallHours);
          try {
            const response = await axios.post('/update-lead-recall', {
              leadId,
              recallDate,
              recallHours,
            });
        
            console.log('Lead aggiornata:', response.data);
            fetchLeads();
            toast.success('Recall aggiunta!');
            setMostraCalendar(false);
            onUpdateLead({
                ...lead,
                recallDate,
                recallHours,
            });
          } catch (error) {
            console.error('Errore durante l\'aggiornamento della lead:', error.message);
          }
        } else {
          console.error('Seleziona data e orario per salvare la recall');
          window.alert("Seleziona sia il giorno sia l'ora");
        }
      };

    const ChooseDate = () => {
        return(
            <div className='choose-date'>
                <div className='choose-date-top'>
                    <img onClick={() => setMostraCalendar(false)} src={indietro} className='indietro-image' />
                    <img src={recallblue} />
                    <h4>Organizza una recall</h4>
                    <p>Seleziona una data e una fascia oraria <br /> per organizzare una recall</p>
                </div>
                <hr className='linea-choose-date' />
                <div className='calendar-container'>
                    <Calendar 
                        onChange={(date) => {
                        handleDateChange(date);
                    }} 
                    className="custom-calendar" 
                    value={selectedDate} />                    
                </div>
                <hr className='linea-choose-date' />
                <div className='orario-container'>
                    <p>seleziona <br />un orario</p>
                    <div className='select-container-orario'>
                        <select 
                        className='select-box'
                        name="hours"
                        value={selectedTime.hours}
                        onChange={(e) => handleTimeChange(e)}>
                            {Array.from({ length: 15 }, (_, i) => {
                                const hour = i + 7; // Parte da 7 e aggiunge l'offset
                                return (
                                    <option key={hour} value={hour}>{hour < 10 ? `0${hour}` : hour}</option>
                                );
                            })}
                        </select>
                        <span className='separator'>:</span>
                        <select 
                        className='select-box'
                        name="minutes"
                        value={selectedTime.minutes}
                        onChange={(e) => handleTimeChange(e)}
                        >
                        {/* Opzioni per i minuti */}
                        {Array.from({ length: 60 }, (_, i) => (
                            <option key={i} value={i}>{i < 10 ? `0${i}` : i}</option>
                        ))}
                        </select>
                    </div>
                </div>
                <hr className='linea-choose-date' />
                <div className='button-choose-date'>
                    <button onClick={handleSaveRecall}>Salva recall</button>
                    <button onClick={() => setMostraCalendar(false)}>Indietro</button>
                </div>
            </div>
        )
    }

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

    const getStartTime = (timeString) => {
        return timeString.includes('_-_') ? timeString.split('_-_')[0] : timeString;
      };
    
      useEffect(() => {
        const startTime = getStartTime(oraChiamataRichiesto);
        setOraChiamataRichiesto(startTime);
      }, [setOraChiamataRichiesto]);


    useEffect(() => {
        const getOrientatori = async () => {
            await axios.get(`/utenti/${userId}/orientatori`)
                .then(response => {
                    const data = response.data.orientatori;

                    setOrientatoriOptions(data);
                    const orientatorePredefinito = data.find(option => {
                        const nomeCompleto = `${option.nome} ${option.cognome}`;
                        return nomeCompleto === lead.orientatore;
                      });
                      const orientatorePredefinitoId = orientatorePredefinito ? orientatorePredefinito._id : '';
                     setOrientatori(orientatorePredefinitoId); 
                })
                .catch(error => {
                    console.error(error);
                });
        }

        if (state && state.token) getOrientatori();
    }, [])

    const updateLead = async () => {
        if (esito === "Non valido" || esito === "Venduto" || esito === "Non interessato"){
            if (!motivo || motivo == ""){
              window.alert("Inserisci il motivo")
              return
            } else {
                try {
                    const modifyLead = {
                        email,
                        numeroTelefono,
                        orientatori,
                        universita,
                        provincia,
                        note,
                        esito,
                        motivo,
                        corsoDiLaurea,
                        lavoro: lavoro == "Si" ? true : lavoro == "No" ? false : false,
                        facolta,
                        fatturato,
                        frequentiUni: frequentiUni == "Si" ? true : frequentiUni == "No" ? false : false,
                        oraChiamataRichiesto,
                        budget,
                        categories,
                        oreStudio,
                        enrollmentTime,
                        tipologiaCorso,
                    };
                    const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
                    fetchLeads();
                    setPopupModify(false);
                    toast.success('Il lead è stato modificato con successo.')
                } catch (error) {
                    console.error(error);
                }            
            }
          } else {
            try {
                const modifyLead = {
                    email,
                    numeroTelefono,
                    orientatori,
                    universita,
                    provincia,
                    note,
                    esito,
                    corsoDiLaurea,
                    facolta,
                    fatturato,
                    oraChiamataRichiesto,
                    motivo: "",
                    budget,
                    categories,
                    oreStudio,
                    frequentiUni: frequentiUni == "Si" ? true : frequentiUni == "No" ? false : false,
                    lavoro: lavoro == "Si" ? true : lavoro == "No" ? false : false,
                    enrollmentTime,
                    tipologiaCorso,
                };
                const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
                fetchLeads();
                setPopupModify(false);
                toast.success('Il lead è stato modificato con successo.')
            } catch (error) {
                console.error(error);
            }            
        }
    };

    const handleSaveName = async () => {
        const name = nome;
        const surname = cognome;
        try {
            const modifyLead = {
                nome,
                cognome,
            };
            const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
            onUpdateLead({
                ...lead,
                name,
                surname,
            });
            fetchLeads();
            setModificaNome(false);
            toast.success('Nome modificato!')
        } catch (error) {
            console.error(error);
        }
    };

    const saveMotivoverify = async () => {
        if (esito === "Non valido" || esito === "Venduto" || esito === "Non interessato"){
            if (!motivo || motivo == ""){
              window.alert("Inserisci il motivo")
              return
            } else if (esito === "Venduto" && fatturato === "0" ) {
                window.alert("Inserisci il fatturato")
                return
            } else {
                try {
                    const modifyLead = {
                        esito,
                        fatturato,
                        motivo,
                      };   
                      const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
                      onUpdateLead({
                        ...lead,
                        status: esito,
                        motivo: motivo,
                        fatturato: fatturato
                    });
                        fetchLeads();
                        toast.success('Stato modificato!');
                        setChooseMotivo(false);
                } catch (error) {
                    console.error(error);
                }
            }
        } else {
            try {
            const motivo = "";
            const modifyLead = {
            esito,
            fatturato,
            motivo,
            };   
            const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
            onUpdateLead({
                ...lead,
                status: esito,
                motivo: motivo,
                fatturato: fatturato
            });
            fetchLeads();
            toast.success('Stato modificato!');
            setChooseMotivo(false);
            } catch (error) {
              console.error(error);
            }
        }
    }

    const handleClickWhatsapp = () => {
        const whatsappLink = `https://wa.me/39${lead.telephone}`;
        window.open(whatsappLink, '_blank');
      };

      const formattedRecallDateTime = (recallDate, recallHours) => {
        const recallDateTime = moment(`${recallDate} ${recallHours}`, 'YYYY-MM-DD HH:mm');
        
        const formattedDate = recallDateTime.format('DD/MM/YY');
        const formattedTime = recallDateTime.format(' [alle ore] HH:mm');
      
        return `${formattedDate}${formattedTime}`;
      };

      const deleteRecall = async () => {
        const recallDate = null;
        const recallHours = null;
        try {
          const response = await axios.post('/delete-recall', {
            leadId: leadId,
          });
      
          if (response.status === 200) {
            console.log('Recall eliminata con successo');
            toast.success('Recall eliminata');
            onUpdateLead({
                ...lead,
                recallDate,
                recallHours,
            });
            fetchLeads();
          } else {
            console.error('Errore durante l\'eliminazione della recall');
          }
        } catch (error) {
          console.error('Errore durante la richiesta:', error.message);
        }
      };

      const [modificaNome, setModificaNome] = useState(false);
      const [nome, setName] = useState(lead?.name);
      const [cognome, setSurname] = useState(lead?.surname);

      const [openPage, setOpenPage] = useState("scheda");
      const [chooseMotivo, setChooseMotivo] = useState(false);

    return (
        <>
        {mostraCalendar ? (
            <div className='popup-modify' id={admin ? "popupadmincolors" : ''}>
               <ChooseDate /> 
            </div>
            ) : (
            <div className='popup-modify' id={admin ? "popupadmincolors" : ''}>
                {chooseMotivo && (
                    <div className='shadow-blur'>
                        <div style={{marginTop: '-90px', position: 'fixed'}} className="choose-esito-popup">
                            <div className='top-choose-esito'>
                            <h4>Modifica l'esito di {nome + " " + cognome}</h4>
                            </div>

                            <svg id="modalclosingicon-popup" onClick={() => { setChooseMotivo(false)}} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
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
                            <button style={{ fontSize: "14px" }} className='btn-orie' onClick={saveMotivoverify}>Salva modifiche</button>
                            </div>
                    </div>    
                )}
                <div className='popup-top'>
                   <div>           
                        <div>
                            <h4 className={openPage == "scheda" ? "page-scheda" : ""} onClick={() => setOpenPage("scheda")}>Scheda lead</h4>
                            <hr className={openPage == "scheda" ? "page-scheda-linea" : ""} />
                        </div>
                        <div>
                           <h4 className={openPage == "info" ? "page-scheda" : ""} onClick={() => setOpenPage("info")}>Maggiori info</h4>
                           <hr className={openPage == "info" ? "page-scheda-linea" : ""} /> 
                        </div>
                    </div>
                    <svg id="modalclosingicon-choose" onClick={onClose} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
                </div>
                <hr className='linea-che-serve2' />
                {openPage == "scheda" ? (
                    <>
                        <div className='popup-middle-top'>
                            <div className='popup-middle-top1'>
                                <div>
                                    {
                                    !modificaNome ? 
                                    <p>{lead.name} {lead.surname} <span onClick={() => setModificaNome(true)} className='span-nome'><FaPencilAlt size={14} style={{marginLeft: '10px'}} /></span></p>: 
                                    <p className='modifica-nome-input'>
                                        <input placeholder={lead.name} value={nome} onChange={(e) => setName(e.target.value)} />
                                        <input placeholder={lead.surname} value={cognome} onChange={(e) => setSurname(e.target.value)} />
                                        <FaSave className='salva-nome' onClick={handleSaveName} />
                                    </p>
                                    }
                                    <p><FiClock color='#30978B' /> Data di <b>creazione lead</b>: <span>{formatDate(lead.date)}</span></p>
                                    <p>{lead.lastModify && lead.lastModify !== null ? <><FiClock color='#3471CC' /> Data <b>ultima modifica</b>: <span>{formatDate(lead.date)}</span></> : ""}</p>
                                    <hr className='linea-al-top' />
                                    <p>Stato lead: 
                                        <span onClick={() => setChooseMotivo(true)}>{esito == "Non interessato" ? "Lead persa" : esito} <FaPencilAlt size={12} style={{marginLeft: '3px', cursor: 'pointer'}} /></span>
                                        {esito === "Venduto" && fatturato !== "0" && <span>{fatturato}€</span>}
                                    </p>
                                    {motivo && motivo !== "" ? <p className='motivo-top'>Motivo: <span>{motivo}</span></p> : null}
                                </div>
                            </div>
                            <div className='popup-middle-top2'>
                            <button className='btnWhats' onClick={handleClickWhatsapp}><WhatsAppOutlined /> Contatta su whatsapp</button>
                            {lead.recallDate && lead.recallHours && lead.recallDate !== null && lead.recallHours !== null ?
                            <button className='recallGreen'>
                                <img src={recallgreen} onClick={() => setMostraCalendar(true)} />
                                <span onClick={() => setMostraCalendar(true)}>
                                    Recall in data <br />
                                    {formattedRecallDateTime(lead.recallDate, lead.recallHours)}
                                </span>
                                <button className='delete-recall' onClick={deleteRecall}>x</button>
                            </button> : 
                            <button className='btcRecall' onClick={() => setMostraCalendar(true)}>
                                <img src={recallblue} />organizza una recall
                            </button>
                            }
                            </div> 
                            
                        </div>
                        <hr className='linea-che-serve' />
                        <div className='maggiori-informazioni'>
                            <h4>ANAGRAFICA</h4>
                            <div className='mi-div'>
                                <div>
                                    <p>Telefono</p>
                                    <input placeholder={lead.telephone} value={numeroTelefono} onChange={(e) => setNumeroTelefono(e.target.value)} />
                                </div>
                                <div>
                                    <p>Email</p>
                                    <input placeholder={lead.email} value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <div className={lead.leadAmbassador ? 'mi-div mgm-div' : 'mi-div'}>
                                <div>
                                    <p>Campagna</p>
                                    <input placeholder={lead.campagna ? mapCampagnaPerLeadsystem(lead.campagna) : ""} value={lead.campagna ? mapCampagnaPerLeadsystem(lead.campagna) : ""} disabled onChange={(e) => setCampagna(e.target.value)} />
                                </div>
                                {lead.leadAmbassador && 
                                <div>
                                    <p>Ambassador</p>
                                    <input placeholder={lead.leadAmbassador ? lead.leadAmbassador.firstName + " " + lead.leadAmbassador.lastName : ""} value={lead.leadAmbassador ? lead.leadAmbassador.firstName + " " + lead.leadAmbassador.lastName : ""} disabled />
                                </div>}
                                <div>
                                    <p>Orientatore</p>
                                    <label>
                                        <select 
                                        data-width="100%"
                                        required value={orientatori} onChange={(e) => setOrientatori(e.target.value)}>
                                            <option value="" disabled defaultChecked>{lead.orientatori ? lead.orientatori : 'Seleziona orientatore'}</option>
                                            {orientatoriOptions.map((option) => (
                                                <option key={option._id} value={option._id}>
                                                    {option.nome} {' '} {option.cognome}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <hr className='linea-che-serve' />
                        <div className='popup-bottom maggiori-informazioni'>
                            <p style={{ fontSize: "18px", display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginBottom: '0px' }}>Inserisci <span style={{ color: "#3471CC", display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginLeft: '5px' }}>
                                note
                                </span></p>
                            <textarea
                                placeholder='Inserisci una nota...'
                                id='textareanote' value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </>
                ) : (
                    <div className='maggiori-informazioni'>
                        <h4>Informazioni inserite dal cliente sul Comparatore</h4>
                        <div className='mi-div'>
                            <div>
                                <p>Tipologia di corso</p>
                                <input type='text' disabled value={tipologiaCorso} onChange={(e) => setTipologiaCorso(e.target.value)} />
                            </div>
                            <div>
                                <p>Area studi</p>
                                <input type='text' disabled value={corsoDiLaurea} onChange={(e) => setCorsoDiLaurea(e.target.value)} />
                            </div>
                        </div>
                        <div className='mi-div'>
                            <div>
                                <p>Corso di laurea</p>
                                <input type='text' disabled value={facolta} onChange={(e) => setFacolta(e.target.value)} />
                            </div>
                            <div>
                                <p>Budget</p>
                                <input type='text' disabled value={budget} onChange={(e) => setBudget(e.target.value)} />
                            </div>
                        </div>
                        <div className='mi-div'>
                            <div>
                                <p>Iscrizione</p>
                                <input type='text' disabled value={enrollmentTime} onChange={(e) => setEnrollmentTime(e.target.value)} />
                            </div>
                            <div>
                                <p>Frequenti l’università</p>
                                <input type='text' disabled value={frequentiUni} onChange={(e) => setFrequentiUni(e.target.value)} />
                            </div>
                        </div>    
                        <div className='mi-div'>
                            <div>
                                <p>Lavori?</p>
                                <input type='text' disabled value={lavoro} onChange={(e) => setLavoro(e.target.value)} />
                            </div>
                            <div>
                                <p>Tempo disponibile</p>
                                <input type='text' disabled value={oreStudio} onChange={(e) => setOreStudio(e.target.value)} />
                            </div>
                        </div> 
                        <div className='mi-div'>
                            <div>
                                <p>Categoria</p>
                                <input type='text' disabled value={categories} onChange={(e) => setCategories(e.target.value)} />
                            </div>
                        </div>     
                    </div>
                )}
                <div className='popup-bottom'>
                    <div className='popup-bottom-button'>
                        <a onClick={updateLead}>Salva scheda lead</a>
                        {/*<a onClick={()=>deleteLead(lead.id)}>Elimina lead</a> */}
                    </div>                    
                </div>

            </div>                  
            )}
      
        </>

    )
}

export default PopupModify