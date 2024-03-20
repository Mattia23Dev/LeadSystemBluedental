import React, {useState} from 'react'
import './popupMotivo.css';
import vendutoImg from '../../../imgs/venduto.png';
import nonVendImg from '../../../imgs/nonvend.png';
import indietro from '../../../imgs/indietro.png';
import bonificato from '../../../imgs/bonificato.png';

const PopupMotivo = ({type, onClose, spostaLead, leadId}) => {
    const [motivo, setMotivo] = useState("");
    const [importoBonificato, setImportoBonificato] = useState("");
    const [patientType, setPatientType] = useState('');
    const [treatment, setTreatment] = useState('');
    const [location, setLocation] = useState('');

  const patientTypes = ["Nuovo paziente", "Gia’ paziente"];
  const treatments = ["Impianti", "Pulizia dei denti", "Protesi Mobile", "Sbiancamento", "Ortodonzia", "Faccette dentali"];
  const locations = [
    "Desenzano Del Garda", "Melzo", "Carpi", "Lodi", "Cantù", "Mantova", "Seregno", "Milano Piazza Castelli", "Abbiategrasso",
    "Pioltello", "Vigevano", "Milano Via Parenzo", "Settimo Milanese", "Cremona", "Milano Brianza", "Monza", "Busto Arsizio", "Brescia",
    "Cinisello Balsamo", "Cologno Monzese", "Varese", "Como", "San Giuliano Milanese", "Milano Lomellina", "Bergamo", "Roma Marconi",
    "Roma Balduina", "Roma Prati Fiscali", "Roma Casilina", "Roma Tiburtina", "Roma Torre Angela", "Ostia", "Pomezia",
    "Ciampino", "Capena", "Cassino", "Frosinone", "Latina", "Valmontone outlet", "Roma Tuscolana", "Civitavecchia",
    "Terni", "Perugia", "Arezzo", "Firenze", "Lucca", "Prato", "Piacenza", "Ferrara", "Cesena", "Forlì", "Reggio Emilia",
    "Modena", "Parma", "Bologna", "Rovigo", "Treviso", "Padova", "Verona", "Vicenza", "Mestre", "Torino Chironi",
    "Settimo Torinese", "Biella", "Torino Botticelli", "Bari", "Genova", "Cagliari", "Sassari", "Pordenone", "Rimini",
    "Ravenna", "Rho", "Anzio"
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

  return (
    <div className='popup-motivo'>
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
        )}
        <div className='salva-motivo'>
            <button onClick={saveMotivo}>Salva modifiche</button>
        </div>
    </div>
  )
}

export default PopupMotivo