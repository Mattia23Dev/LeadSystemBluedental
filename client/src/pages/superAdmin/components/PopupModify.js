import React, { useContext, useState, useEffect } from 'react'
import '../../../components/Table/popupModify/popupModify.scss'
import { WhatsAppOutlined } from '@ant-design/icons';
import { FaPencilAlt, FaSave } from "react-icons/fa";
import { FiClock } from 'react-icons/fi';
import icon1 from '../../../imgs/Group.png';
import { UserContext } from '../../../context';
import { ProvinceItaliane } from '../../../components/Data';
import axios from 'axios';
import toast from 'react-hot-toast';
import recallblue from '../../../imgs/recallblue.png';
import indietro from '../../../imgs/indietro.png';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import recallgreen from '../../../imgs/recallGren.png';
import moment from 'moment'

const PopupModify = ({ lead, onClose, setPopupModify, onUpdateLead, deleteLead , admin = false, popupRef, fetchLeads, setInfoPopup, userIdNew}) => {
    const [state, setState] = useContext(UserContext);
    const leadId = lead.id;
    const userId = userIdNew;
    const [email, setEmail] = useState(lead.email);
    const [numeroTelefono, setNumeroTelefono] = useState(lead.telephone);
    const [orientatori, setOrientatori] = useState(lead.orientatore ? lead.orientatore : '');
    const [universita, setUniversita] = useState(lead.università ? lead.università : '');
    const [provincia, setProvincia] = useState(lead.provincia ? lead.provincia : '');
    const [note, setNote] = useState(lead.note ? lead.note : '');
    const [orientatoriOptions, setOrientatoriOptions] = useState([]);
    const [esito, setEsito] = useState(lead.status);
    const [corsoDiLaurea, setCorsoDiLaurea] = useState(lead.corsoDiLaurea ? lead.corsoDiLaurea : '');
    const [frequentiUni, setFrequentiUni] = useState(lead.frequentiUni ? lead.frequentiUni : false);
    const [lavoro, setLavoro] = useState(lead.lavoro ? lead.lavoro : false);
    const [facolta, setFacolta] = useState(lead.facolta ? lead.facolta : '');
    const [fatturato, setFatturato] = useState(lead.fatturato ? lead.fatturato : '0');
    const [oraChiamataRichiesto, setOraChiamataRichiesto] = useState(lead.oraChiamataRichiesto ? lead.oraChiamataRichiesto : '');
    const [mostraCalendar, setMostraCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(lead.recallDate && lead.recallDate !== null ? new Date(lead.recallDate) : new Date());
    const [selectedTime, setSelectedTime] = useState({ hours: 0, minutes: 0 });

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
                        {/* Opzioni per le ore */}
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i < 10 ? `0${i}` : i}</option>
                        ))}
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
                lavoro,
                facolta,
                fatturato,
                frequentiUni,
                oraChiamataRichiesto,
            };
            const response = await axios.put(`/lead/${userId}/update/${leadId}`, modifyLead);
            fetchLeads();
            setPopupModify(false);
            toast.success('Il lead è stato modificato con successo.')
        } catch (error) {
            console.error(error);
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

    return (
        <>
        {mostraCalendar ? (
            <div className='popup-modify' id={admin && "popupadmincolors"} ref={popupRef}>
               <ChooseDate /> 
            </div>
            ) : (
            <div className='popup-modify' id={admin && "popupadmincolors"} ref={popupRef}>
                <div className='popup-top'>
                <svg id="modalclosingicon" onClick={onClose} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
                    <h4>Scheda lead</h4>
                </div>
                <div className='popup-middle-top'>
                    <div className='popup-middle-top1'>
                        <div>
                            <img src={icon1} alt='image' />
                        </div>
                        <div>
                            {
                            !modificaNome ? 
                            <p>{lead.name} {lead.surname} <span onClick={() => setModificaNome(true)} className='span-nome'><FaPencilAlt size={14} /></span></p>: 
                            <p className='modifica-nome-input'>
                                <input placeholder={lead.name} value={nome} onChange={(e) => setName(e.target.value)} />
                                <input placeholder={lead.surname} value={cognome} onChange={(e) => setSurname(e.target.value)} />
                                <FaSave className='salva-nome' onClick={handleSaveName} />
                            </p>
                            }
                            <p>Data di creazione lead: <FiClock />{formatDate(lead.date)}</p>
                            <p>Stato lead: <span>{lead.status == "Non interessato" ? "Lead persa" : lead.status}</span></p>
                            {lead?.motivo && lead.motivo !== "" ? <p>Motivo: <span>{lead.motivo}</span></p> : null}
                        </div>
                    </div>
                    <div className='popup-middle-top2'>
                    {lead.campagna && lead.campagna !== 'Whatsapp' ?  <button className='btnWhats' onClick={handleClickWhatsapp}><WhatsAppOutlined /> Contatta su whatsapp</button> : null}
                    {lead.recallDate && lead.recallHours && lead.recallDate !== null && lead.recallHours !== null ?
                    <button className='recallGreen'>
                        <img src={recallgreen} onClick={() => setMostraCalendar(true)} />
                        Recall in data <br />
                        {formattedRecallDateTime(lead.recallDate, lead.recallHours)}
                        <button className='delete-recall' onClick={deleteRecall}>x</button>
                        <button className='edit-recall' onClick={() => setMostraCalendar(true)}><FaPencilAlt /></button>
                    </button> : 
                    <button className='btcRecall' onClick={() => setMostraCalendar(true)}>
                        <img src={recallblue} />organizza una recall
                    </button>
                    }
                    </div> 
                    
                </div>
                <div className='popup-middle-bottom'>
                    <div className='popup-middle-bottom1'>
                        <div>
                            <p>Indirizzo email <span><FaPencilAlt size={14} /></span></p>
                            <input placeholder={lead.email} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <p>Telefono <span><FaPencilAlt size={14} /></span></p>
                            <input placeholder={lead.telephone} value={numeroTelefono} onChange={(e) => setNumeroTelefono(e.target.value)} />
                        </div>
                    </div>
                    <div className='popup-middle-bottom2'>
                        <div>
                            <p>Orientatore <span><FaPencilAlt size={14} /></span></p>
                            <label>
                                <select required value={orientatori} onChange={(e) => setOrientatori(e.target.value)}>
                                    <option value="" disabled defaultChecked>{lead.orientatori ? lead.orientatori : 'Seleziona orientatore'}</option>
                                    {orientatoriOptions.map((option) => (
                                        <option key={option._id} value={option._id}>
                                            {option.nome} {' '} {option.cognome}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div>
                            <p>Università <span><FaPencilAlt size={14} /></span></p>
                            <select value={universita} onChange={(e) => setUniversita(e.target.value)}>
                                <option value="" disabled>{lead.università ? lead.università : "Seleziona università"}</option>
                                <option value='Unimercatorum'>Unimercatorum</option>
                                <option value='Sanraffaele'>Sanraffaele</option>
                                <option value='Unipegaso'>Unipegaso</option>
                                <option value='Aulab'>Aulab</option>
                            </select>
                        </div>
                    </div>
                    <div className='popup-middle-bottom2'  style={{margin: '0 10px 0 0px'}}>
                        <div>
                            <p>Provincia <span><FaPencilAlt size={14} /></span></p>
                            <label>
                                <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                                    <option value={lead.provincia ? lead.provincia : ""} disabled>{lead.provincia ? lead.provincia : "Seleziona provincia"}</option>
                                    {ProvinceItaliane.map((provincia) => (
                                        <option key={provincia} value={provincia}>
                                            {provincia}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div>
                        <p>Esito <span><FaPencilAlt size={14} /></span></p>
                            <select required value={esito} onChange={(e) => setEsito(e.target.value)}>
                                <option value="" disabled>{lead.status ? lead.status : null}</option>
                                <option value='Da contattare'>Da contattare</option>
                                <option value='In lavorazione'>In lavorazione</option>
                                <option value='Non risponde'>Non risponde</option>
                                <option value="Irraggiungibile">Irraggiungibile</option>
                                <option value="Non valido">Non valido</option>
                                <option value='Non interessato'>Lead persa</option>
                                <option value='Opportunità'>Opportunità</option>
                                <option value='In valutazione'>In valutazione</option>
                                <option value='Venduto'>Venduto</option>
                                <option value="Iscrizione posticipata">Iscrizione posticipata</option>
                            </select>
                        </div>
                    </div>
                    {esito === 'Venduto' ?
                    <label id='prezzovendita'>
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
                    <div className='popup-middle-bottom2' style={{margin: '0 0px 0 0px'}}>
                        <div>
                            <p>Corso di laurea <span><FaPencilAlt size={14} /></span></p>
                            <input type='text' value={corsoDiLaurea} onChange={(e) => setCorsoDiLaurea(e.target.value)} />
                        </div>
                        <div>
                            <p>Inizio università? <span><FaPencilAlt size={14} /></span></p>
                            <input 
                            type="text" 
                            value={facolta} 
                            onChange={(e) => setFacolta(e.target.value)} 
                            />
                        </div>

                    </div>
                    <div className='popup-middle-bottom2' style={{marginBottom : '30px' , width: '90%'}}>
                        <div>
                            <p>Frequenta l'università? <span><FaPencilAlt size={14} /></span></p>
                        <div id='newleadradios'>
                            <input
                            type="radio"
                            checked={frequentiUni === true}
                            onChange={() => setFrequentiUni(true)}
                            />
                            SI
                            <input
                            type="radio"
                            checked={frequentiUni === false}
                            onChange={() => setFrequentiUni(false)}
                            style={{margin: '0 0px 0 20px'}}
                            />
                            NO
                        </div>
                        </div>

                    <div>
                        <p>Lavora già? <span><FaPencilAlt size={14} /></span></p>
                        <div id='newleadradios'>
                            <input
                            type="radio"
                            checked={lavoro === true}
                            onChange={() => setLavoro(true)}
                            />
                            SI
                            <input
                            type="radio"
                            checked={lavoro === false}
                            onChange={() => setLavoro(false)}
                            style={{margin: '0 0px 0 20px'}}
                            />
                            NO
                        </div>
                    </div>
                    <div>
                    <p>Orario di chiamata <span><FaPencilAlt size={14} /></span></p>
                        <input
                            type='time'
                            value={oraChiamataRichiesto}
                            onChange={(e) => setOraChiamataRichiesto(e.target.value)}
                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '16px' }}
                            />
                    </div>

                    </div>
                </div>
                <div className='popup-bottom'>
                    <p style={{ fontSize: "25px" }}>Inserisci <span style={{ color: "#3471CC" }}>note</span> <span>
                        <FaPencilAlt size={20} /></span></p>
                    <textarea
                        placeholder='Inserisci una nota...'
                        id='textareanote' value={note} onChange={(e) => setNote(e.target.value)} />
                        <div className='popup-bottom-button'>
                                <a onClick={updateLead}>Salva configurazione</a>
                                <a onClick={()=>deleteLead(lead.id)}>Elimina lead</a> 
                        </div>

                </div>
            </div>                  
            )}
      
        </>

    )
}

export default PopupModify