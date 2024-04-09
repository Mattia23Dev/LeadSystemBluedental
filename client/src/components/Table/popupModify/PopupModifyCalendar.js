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

const PopupModifyCalendar = ({ lead, onClose, setPopupModify, onUpdateLead, deleteLead , admin = false, fetchLeads}) => {
    const [state, setState] = useContext(UserContext);
    const leadId = lead.id;
    const userId = state.user._id;
    const [email, setEmail] = useState(lead.email);
    const [campagna, setCampagna] = useState(lead.campagna ? lead.campagna : "");
    const [numeroTelefono, setNumeroTelefono] = useState(lead.telephone);
    const [orientatori, setOrientatori] = useState(lead.orientatore ? lead.orientatore : '');
    const [città, setCittà] = useState(lead.città ? lead.città.charAt(0).toUpperCase() + lead.città.slice(1) : '');
    const [note, setNote] = useState(lead.note ? lead.note : '');
    const [orientatoriOptions, setOrientatoriOptions] = useState([]);
    const [esito, setEsito] = useState(lead.status);
    const [trattamento, setTrattamento] = useState(lead.trattamento ? lead.trattamento.replace(/_/g, ' ') : "");
    const [fatturato, setFatturato] = useState(lead.fatturato ? lead.fatturato : '0');
    const [oraChiamataRichiesto, setOraChiamataRichiesto] = useState(lead.oraChiamataRichiesto ? lead.oraChiamataRichiesto : '');
    const [mostraCalendar, setMostraCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(lead.recallDate && lead.recallDate !== null ? new Date(lead.recallDate) : new Date());
    const [selectedTime, setSelectedTime] = useState({ hours: 7, minutes: 0 });
    const [patientType, setPatientType] = useState('');
    const [treatment, setTreatment] = useState('');
    const [location, setLocation] = useState('');
    const [tentativiChiamata, setTentativiChiamata] = useState(lead.tentativiChiamata ? lead.tentativiChiamata : "0");

    const [motivo, setMotivo] = useState(lead.motivo ? lead.motivo : "");
    const patientTypes = ["Nuovo paziente", "Gia’ paziente"];
    const treatments = ["Impianti", "Pulizia dei denti", "Protesi Mobile", "Sbiancamento", "Ortodonzia", "Faccette dentali"];
    const locations = [
      "Desenzano Del Garda", "Melzo", "Carpi", "Lodi", "Cantù", "Mantova", "Seregno", "Milano Piazza Castelli", "Abbiategrasso",
      "Pioltello", "Vigevano", "Milano Via Parenzo", "Settimo Milanese", "Cremona", "Milano Lomellina", "Monza", "Busto Arsizio", "Brescia",
      "Cinisello Balsamo", "Cologno Monzese", "Varese", "Como", "San Giuliano Milanese", "Milano Brianza", "Bergamo", "Roma Marconi",
      "Roma Balduina", "Roma Prati Fiscali", "Roma Casilina", "Roma Tiburtina", "Roma Torre Angela", "Ostia", "Pomezia",
      "Ciampino", "Capena", "Cassino", "Frosinone", "Latina", "Valmontone outlet", "Roma Tuscolana", "Civitavecchia",
      "Terni", "Perugia", "Arezzo", "Firenze", "Lucca", "Prato", "Piacenza", "Ferrara", "Cesena", "Forlì", "Reggio Emilia",
      "Modena", "Parma", "Bologna", "Rovigo", "Treviso", "Padova", "Verona", "Vicenza", "Mestre", "Torino Chironi",
      "Settimo Torinese", "Biella", "Torino Botticelli", "Bari", "Genova", "Cagliari", "Sassari", "Pordenone", "Rimini",
      "Ravenna", "Rho", "Anzio"
    ];
    const [motivoLeadPersaList, setMotivoLeadPersaList] = useState([
        "Numero Errato", "Non interessato", "Fuori Zona", "Doppio contatto", "⁠Nessuna risposta (6)", "Già paziente"
    ]);

    
    function mapCampagnaPerLeadsystem(nomeCampagna) {
        if (nomeCampagna.includes('Gold')){
            return 'Gold';
        } else if (nomeCampagna.includes('Ambra')){
            return 'Ambra';
        } else if (nomeCampagna.includes('Altri centri')) {
          return 'Meta Web - Altri centri';
        } else if (nomeCampagna.includes('Meta Web')) {
            if (nomeCampagna === "Meta Web G"){
                return 'Meta Web G'
            } else return 'Meta Web';
        } else if (nomeCampagna.includes('Messenger') || nomeCampagna.includes("messenger")) {
          return 'Messenger';
        } else {
          return "Meta Web";
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
            await axios.get(`/utenti/65d3110eccfb1c0ce51f7492/orientatori`)
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
        if (esito === "Non valido" || esito === "Non interessato"){
            if (!motivo || motivo == ""){
              window.alert("Inserisci il motivo")
              return
            } else {
                try {
                    const modifyLead = {
                        email,
                        numeroTelefono,
                        orientatori,
                        note,
                        esito,
                        fatturato,
                        motivo,
                        città,
                        trattamento,
                        tentativiChiamata
                    };
                    const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
                    note,
                    esito,
                    fatturato,
                    motivo: "",
                    città,
                    trattamento,
                    tentativiChiamata
                };
                const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
            const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
        if (esito === "Non valido" || esito === "Non interessato"){
            if (!motivo || motivo == ""){
              window.alert("Inserisci il motivo")
              return
            } else {
                try {
                    const modifyLead = {
                        esito,
                        fatturato,
                        motivo,
                      };   
                      const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
        } else if (esito === "Fissato"){
            if (treatment === "" || location === "" || patientType === ""){
                window.alert('Compila tutti i campi')
                return
            } else {
                try {
                    const modifyLead = {
                        esito,
                        fatturato,
                        tipo: patientType, 
                        trattPrenotato: treatment, 
                        luogo: location,
                      };   
                      const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
            const response = await axios.put(`/lead/65d3110eccfb1c0ce51f7492/update/${leadId}`, modifyLead);
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
            <div className='popup-modify-calendar' id={admin ? "popupadmincolors" : ''}>
               <ChooseDate /> 
            </div>
            ) : (
            <div className='popup-modify-calendar' id={admin ? "popupadmincolors" : ''}>
                {chooseMotivo && (
                    <div className='shadow-blur'>
                        <div style={{marginTop: '-100px', position: 'fixed'}} className="choose-esito-popup-calendar">
                            <div className='top-choose-esito'>
                            <h4>Modifica l'esito di {nome + " " + cognome}</h4>
                            </div>

                            <svg id="modalclosingicon-popup" onClick={() => { setChooseMotivo(false)}} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
                                 <div className='esiti-option-div' style={{ display: 'flex', justifyContent: 'center', overflowY: 'scroll' }}>
                                    <div className={esito === "Da contattare" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Da contattare')}>
                                        <span><span>o</span></span>
                                        Da contattare
                                    </div>
                                    <div className={esito === "Non risponde" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Non risponde')}>
                                        <span><span>o</span></span>
                                        Non risponde
                                    </div>
                                    <div className={esito === "Da richiamare" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Da richiamare')}>
                                        <span><span>o</span></span>
                                        Da richiamare
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
                                    <div className={esito === "Fissato" ? "selected-option-motivo esito-option" : "esito-option"} onClick={() => setEsito('Fissato')}>
                                        <span><span>o</span></span>
                                        Fissato
                                        {esito === "Fissato" && <div className='choose-motivo' style={{display: 'flex', flexDirection: 'column'}}>
                                        {patientTypes.map((opzione, index) => (
                                            <label style={{ fontSize: '14px', color: 'gray', width: '100%', display: 'flex', gap: '10px', alignItems: 'center'}} key={index} className="radio-label radio-label-scheda">
                                                <input
                                                type="radio"
                                                name="motivo"
                                                value={opzione}
                                                checked={patientType === opzione}
                                                onChange={() => setPatientType(opzione)}
                                                />
                                                {opzione}
                                            </label>
                                            ))}
                                        </div>}
                                        {esito === 'Fissato' ?
                                        <>
                                        <label className='label-not-blue'>Trattamento</label>
                                                <select className="selectMotivo" value={treatment} onChange={(e) => setTreatment(e.target.value)}>
                                                <option value='' disabled>Seleziona motivo</option>
                                                {treatments.map((motivoOption, index) => (
                                                    <option key={index} value={motivoOption}>{motivoOption}</option>
                                                ))}
                                                </select>
                                                </>
                                            :
                                            null}
                                        {esito === "Fissato" && (
                                            <>
                                            <label className='label-not-blue'>Città</label>
                                                <select className="selectMotivo" value={location} onChange={(e) => setLocation(e.target.value)}>
                                                <option value='' disabled>Seleziona motivo</option>
                                                {locations.sort().map((motivoOption, index) => (
                                                    <option key={index} value={motivoOption}>{motivoOption}</option>
                                                ))}
                                                </select>
                                              </>  
                                            )}
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
                        {/*<div>
                           <h4 className={openPage == "info" ? "page-scheda" : ""} onClick={() => setOpenPage("info")}>Maggiori info</h4>
                           <hr className={openPage == "info" ? "page-scheda-linea" : ""} /> 
                         </div>*/}
                    </div>
                    <svg id="modalclosingicon-choose" onClick={onClose} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
                </div>
                <hr className='linea-che-serve2' />
                        <div className='popup-middle-top'>
                            <div className='popup-middle-top1'>
                                <div>
                                    {
                                    !modificaNome ? 
                                    <p>{lead.name} {lead.surname} <span onClick={() => setModificaNome(true)} className='span-nome'><FaPencilAlt size={14} style={{marginLeft: '10px'}} /></span></p>: 
                                    <p className='modifica-nome-input'>
                                        <input placeholder={lead.name} value={nome} onChange={(e) => setName(e.target.value)} />
                                        <FaSave className='salva-nome' onClick={handleSaveName} />
                                    </p>
                                    }
                                    <p><FiClock color='#30978B' /> Data di <b>creazione lead</b>: <span>{formatDate(lead.date)}</span></p>
                                    <p>{lead.lastModify && lead.lastModify !== null ? <><FiClock color='#3471CC' /> Data <b>ultima modifica</b>: <span>{formatDate(lead.date)}</span></> : ""}</p>
                                    <p style={{margin: '17px 0 10px 0'}}>Stato lead: 
                                        <span onClick={() => setChooseMotivo(true)}>{esito == "Non interessato" ? "Lead persa" : esito} <FaPencilAlt size={12} style={{marginLeft: '3px', cursor: 'pointer'}} /></span>
                                        {esito === "Fissato" && fatturato !== "0" && <span>{fatturato}€</span>}
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
                                <p className='delete-recall' onClick={deleteRecall}>x</p>
                            </button> : 
                            <button className='btcRecall' onClick={() => setMostraCalendar(true)}>
                                <img src={recallblue} />organizza una recall
                            </button>
                            }
                            </div> 
                            
                        </div>
                        <hr className='linea-che-serve' />
                        <div className='maggiori-informazioni'>
                            <h4>TENTATIVI DI CONTATTO</h4>
                            <div className='tentativi-contatto'>
                                <p>Numero tentativi di chiamata:</p>
                                <div>
                                    <button onClick={() => setTentativiChiamata("1")} className={tentativiChiamata === "1" ? "tent-active" : ""}>1</button>
                                    <button onClick={() => setTentativiChiamata("2")} className={tentativiChiamata === "2" ? "tent-active" : ""}>2</button>
                                    <button onClick={() => setTentativiChiamata("3")} className={tentativiChiamata === "3" ? "tent-active" : ""}>3</button>
                                    <button onClick={() => setTentativiChiamata("4")} className={tentativiChiamata === "4" ? "tent-active" : ""}>4</button>
                                    <button onClick={() => setTentativiChiamata("5")} className={tentativiChiamata === "5" ? "tent-active" : ""}>5</button>
                                    <button onClick={() => setTentativiChiamata("6")} className={tentativiChiamata === "6" ? "tent-active" : ""}>6</button>
                                </div>
                            </div>
                        </div>
                        <hr className='linea-che-serve' />
                        <div className='maggiori-informazioni'>
                            <h4>ANAGRAFICA</h4>
                            <div className='mi-div'>
                                <div>
                                    <p>Telefono</p>
                                    <input disabled placeholder={lead.telephone} value={numeroTelefono} onChange={(e) => setNumeroTelefono(e.target.value)} />
                                </div>
                                <div>
                                    <p>Email</p>
                                    <input disabled placeholder={lead.email} value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <div className={lead.leadAmbassador ? 'mi-div mgm-div' : 'mi-div'}>
                                <div>
                                    <p>Campagna</p>
                                    <input placeholder={lead.campagna ? lead.campagna : ""} value={mapCampagnaPerLeadsystem(lead.campagna)} disabled onChange={(e) => setCampagna(e.target.value)} />
                                </div>
                                {state.user.role && state.user.role === "orientatore" ? 
                                <div>
                                    <p>Operatore</p>
                                    <label>
                                        <select 
                                        data-width="100%"
                                        disabled
                                        required value={orientatori} onChange={(e) => setOrientatori(e.target.value)}>
                                            <option value="" disabled defaultChecked>{lead.orientatori ? lead.orientatori : 'Seleziona orientatore'}</option>
                                            {orientatoriOptions.map((option) => (
                                                <option key={option._id} value={option._id}>
                                                    {option.nome} {' '} {option.cognome}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>: <div>
                                    <p>Operatore</p>
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
                                </div>}
                            </div>
                            <div className='mi-div'>
                                <div>
                                    <p>Città</p>
                                    <input disabled placeholder={lead.città.charAt(0).toUpperCase()} value={città} onChange={(e) => setCittà(e.target.value)} />
                                </div>
                                <div className='trat-cont-input'>
                                    <p>Trattamento</p>
                                    <input className='input-trattamento-hover' disabled placeholder={lead.trattamento.replace(/_/g, ' ')} value={trattamento} onChange={(e) => setTrattamento(e.target.value)} />
                                    <span className="trattamento-fullname">{lead.trattamento.replace(/_/g, ' ')}</span>
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
                    {/*: (
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
                )*/}
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

export default PopupModifyCalendar