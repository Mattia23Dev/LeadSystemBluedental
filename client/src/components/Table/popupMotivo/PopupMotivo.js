import React, {useContext, useState} from 'react'
import './popupMotivo.css';
import vendutoImg from '../../../imgs/venduto.png';
import nonVendImg from '../../../imgs/nonvend.png';
import indietro from '../../../imgs/indietro.png';
import bonificato from '../../../imgs/bonificato.png';
import moment from 'moment';
import Calendar from 'react-calendar';
import { UserContext } from '../../../context';

const PopupMotivo = ({type, onClose, spostaLead, leadId}) => {
      const appFissatoDate = leadId.appFissato && leadId.appFissato !== null
      ? moment(leadId.appFissato, 'YY-MM-DD HH:mm').toDate()
      : new Date();

    const initialHours = appFissatoDate.getHours();
    const initialMinutes = appFissatoDate.getMinutes();

    const [motivo, setMotivo] = useState("");
    const [importoBonificato, setImportoBonificato] = useState("");
    const [patientType, setPatientType] = useState('');
    const [treatment, setTreatment] = useState('');
    const [location, setLocation] = useState('');
    const [selectedDate, setSelectedDate] = useState(appFissatoDate);

    const [selectedTime, setSelectedTime] = useState(leadId.appFissato && leadId.appFissato !== null ? { hours: initialHours, minutes: initialMinutes } : {hours: 7, minutes: 0});
    const [state, setState] = useContext(UserContext);
    const userFixId = state.user.role && state.user.role === "orientatore" ? state.user.utente : state.user._id;
    console.log(leadId.appFissato)
  const patientTypes = ["Nuovo paziente", "Gia’ paziente"];
  const treatments = ["Impianti", "Pulizia dei denti", "Protesi Mobile", "Sbiancamento", "Ortodonzia", "Faccette dentali", "Generico"];
  const locations = [
    "Desenzano Del Garda", "Melzo", "Carpi", "Lodi", "Cantù", "Mantova", "Seregno", "Milano Piazza Castelli", "Abbiategrasso",
    "Pioltello", "Vigevano", "Milano Via Parenzo", "Settimo Milanese", "Cremona", "Milano Brianza", "Monza", "Busto Arsizio", "Brescia",
    "Cinisello Balsamo", "Cologno Monzese", "Varese", "Como", "San Giuliano Milanese", "Milano Lomellina", "Bergamo", "Roma Marconi",
    "Roma Balduina", "Roma Prati Fiscali", "Roma Casilina", "Roma Tiburtina", "Roma Torre Angela", "Ostia", "Pomezia",
    "Ciampino", "Capena", "Cassino", "Frosinone", "Latina", "Valmontone outlet", "Roma Tuscolana", "Civitavecchia",
    "Terni", "Perugia", "Arezzo", "Firenze", "Lucca", "Prato", "Piacenza", "Ferrara", "Cesena", "Forlì", "Reggio Emilia",
    "Modena", "Parma", "Bologna", "Rovigo", "Treviso", "Padova", "Verona", "Vicenza", "Mestre", "Torino Chironi",
    "Settimo Torinese", "Biella", "Torino Botticelli", "Bari", "Genova", "Cagliari", "Sassari", "Pordenone", "Rimini",
    "Ravenna", "Rho", "Anzio", "Bassano del Grappa", "Alessandria", "Massa", "Livorno", "Trento", "Udine"
  ];

  const handleTreatmentChange = (event) => {
    setTreatment(event.target.value);
  };

  const handleLocationChange = (event) => {
    setLocation(event.target.value);
  };

    const [motivoLeadPersaList, setMotivoLeadPersaList] = useState([
        "Numero Errato", "Non interessato", "Fuori Zona", "Doppio contatto", "⁠Nessuna risposta (6)", "Già paziente"
    ]);
    const [motivoVendutoList, setMotivoVendutoList] = useState([
        "Promozione / sconto", "Convenzione", "Prevalutazione corretta",
        "Scatto di carriera", "Titolo necessario per concorso pubblico / candidatura",
        "Tempi brevi", "Sede d’esame vicino casa", "Consulenza orientatore",
    ]);

    const motivoList = type === "Venduto" ? motivoVendutoList : motivoLeadPersaList;

    const formatDateTime = () => {
      const year = selectedDate.getFullYear().toString().slice(-2);
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const hours = selectedTime.hours.toString().padStart(2, '0');
      const minutes = selectedTime.minutes.toString().padStart(2, '0');
  
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };
    const saveMotivo = () => {
        if (type === "Venduto" || type === "Fissato") {
             spostaLead("", leadId, importoBonificato, type, patientType, treatment, location);
            } else {
                if (motivo !== ""){
                   spostaLead(motivo, leadId, "0", type); 
                }else {
                    window.alert('Inserisci il motivo')
                    return
                }
        }
    }

    const saveMotivoCallCenter = () => {
      const dataformattata = formatDateTime()
      console.log(dataformattata);
        if (type === "Venduto" || type === "Fissato") {
             spostaLead("", leadId, importoBonificato, type, patientType, treatment, location, dataformattata);
            } else {
                if (motivo !== ""){
                   spostaLead(motivo, leadId, "0", type, "", "", "", null);
                }else {
                    window.alert('Inserisci il motivo')
                    return
                }
        }
    }

    const handleDateChange = (date) => {
      setSelectedDate(date);
    };
    const handleTimeChange = (e) => {
      const { name, value } = e.target;
      setSelectedTime((prevTime) => ({
        ...prevTime,
        [name]: parseInt(value, 10),
      }));
    };

  return (
    <div className={userFixId === "664c5b2f3055d6de1fcaa22b" ? 'popup-motivo allargato-pm' : 'popup-motivo'}>
        <img onClick={onClose} src={indietro} />
        <div className='popup-motivo-top'>
            {type === "Fissato" ? (
                <img src={vendutoImg} />
            ) : (
                <img src={nonVendImg} />
            )}
            {type === "Fissato" ? (
             <div>   
                <h4>Lead Fissata</h4>
                <p>Lo stato della lead è stato cambiato, specifica queste informazioni:</p>   
             </div>
            ) : (
            <div>   
                <h4>Lead Persa</h4>
                <p>Lo stato della lead è stato cambiato, specifica il motivo selezionando una delle seguenti opzioni:</p>   
             </div>
            )}
        </div>
        {type !== "Venduto" && type !== "Fissato" ?
         (<div className='choose-motivo'>
            {motivoList.map((opzione, index) => (
                <label key={index} className="radio-label">
                    <input
                    type="radio"
                    name="motivo"
                    value={opzione}
                    checked={motivo === opzione}
                    onChange={() => setMotivo(opzione)}
                    />
                    {opzione}
                </label>
            ))}
        </div>) : (
          <div className='flexa'>
            <div className='motivo-venduto'>
            <div className='choose-motivo'>
            <p style={{textAlign: 'center'}}>Tipologia paziente</p>
            {patientTypes.map((opzione, index) => (
                <label key={index} className="radio-label">
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
            </div>
       
             <div className='venduto-motivo'>
               <label htmlFor="treatmentSelect">Trattamento:</label>
               <select id="treatmentSelect" onChange={handleTreatmentChange} value={treatment}>
                 <option value="">Seleziona</option>
                 {treatments.map(treatment => (
                   <option key={treatment} value={treatment}>{treatment}</option>
                 ))}
               </select>
             </div>
       
             <div className='venduto-motivo'>
               <label htmlFor="locationSelect">Luogo Prenotazione:</label>
               <select id="locationSelect" onChange={handleLocationChange} value={location}>
                 <option value="">Seleziona</option>
                 {locations.sort().map(location => (
                   <option key={location} value={location}>{location}</option>
                 ))}
               </select>
             </div>
             </div>

             {userFixId === "664c5b2f3055d6de1fcaa22b" && 
             <div className='motivo-venduto'>
                  <label htmlFor="locationSelect">Data Prenotazione:</label>
                    <Calendar
                        onChange={(date) => {
                        handleDateChange(date);
                    }}
                    className="custom-calendar calendar-fissato" 
                    value={selectedDate} />                    
                <div className='orario-container'>
                    <p>Orario prenotazione</p>
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
             </div>}
         </div>
        )}
        <div className='salva-motivo'>
            <button onClick={() => {
              if (userFixId === "664c5b2f3055d6de1fcaa22b"){
                saveMotivoCallCenter()
              } else {
                saveMotivo()
              }
            }}>Salva modifiche</button>
        </div>
    </div>
  )
}

export default PopupMotivo