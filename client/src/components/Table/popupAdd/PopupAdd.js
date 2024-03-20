import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import './popupAdd.scss';
import { UserContext } from '../../../context';
import { ProvinceItaliane } from '../../Data';
import toast from 'react-hot-toast';

const AddLeadPopup = ({ setAddOpen, popupRef, fetchLeads }) => {
  const [state, setState, headerIndex, SETheaderIndex] = useContext(UserContext);
  const [data, setData] = useState(new Date());
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [trattamento, setTrattamento] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [campagna, setCampagna] = useState('');
  const [esito, setEsito] = useState('Da contattare');
  const [orientatori, setOrientatori] = useState(state.user.role && state.user.role === "orientatore" ? state.user._id : null);
  const [note, setNote] = useState('');
  const [città, setCittà] = useState("");
  const [orientatoriOptions, setOrientatoriOptions] = useState([])
  const locations = [
    "Abbiategrasso", "Anzio", "Arezzo", "Bari", "Bergamo", "Biella", "Bologna", "Brescia", "Busto Arsizio", "Cagliari", 
    "Cantù", "Capena", "Carpi", "Cassino", "Cesena", "Ciampino", "Cinisello Balsamo", "Civitavecchia", "Cologno Monzese", 
    "Como", "Cremona", "Desenzano del Garda", "Ferrara", "Firenze", "Forlì", "Frosinone", "Genova", "Latina", "Lodi", 
    "Lucca", "Mantova", "Melzo", "Mestre", "Milano", "Modena", "Monza", "Ostia", "Padova", "Perugia", "Parma", "Piacenza", 
    "Pioltello", "Pomezia", "Pordenone", "Prato", "Ravenna", "Reggio Emilia", "Rho", "Rimini", "Roma", "San Giuliano Milanese", "Sassari", "Seregno", 
    "Terni", "Torino", "Treviso", "Varese", "Verona", "Vicenza", "Vigevano"
  ];

  const handleDateChange = (date) => {
    setData(date);
  };

  const userId = state.user._id;

  useEffect(() => {
    const getOrientatori = async () => {
      await axios.get(`/utenti/65d3110eccfb1c0ce51f7492/orientatori`)
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const newLead = {
        data,
        nome,
        cognome,
        email,
        numeroTelefono,
        campagna,
        esito,
        orientatori: orientatori == "" ? null : orientatori,
        note,
        città,
        trattamento,
        from: 'user',
      };
      console.log(newLead);
      const response = await axios.post(`lead/create/65d3110eccfb1c0ce51f7492`, newLead);
      toast.success('Hai aggiunto il lead!');
      fetchLeads();
      setAddOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Assicurati di avere compilato tutti i campi obbligatori!")
    }
  };

  return (
    <div className="add-lead-popup" id='aggiungileadpop' ref={popupRef}>
      <div className='popup-top'>
        <svg id="modalclosingicon" onClick={() => { setAddOpen(false); SETheaderIndex(999) }} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
        <h4>Aggiungi Lead</h4>
      </div>

      <form onSubmit={handleSubmit} className='form-add'>
        <label>
          Data*:
          <input
              type="date"
              value={data}
              style={{ width: "100%", border: "none" }}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="Seleziona una data"
            />
        </label>
        <label>
          Nome*:
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label>
          Cognome*:
          <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} required />
        </label>
        <label>
          Email*:
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Telefono*:
          <input type="tel" value={numeroTelefono} onChange={(e) => setNumeroTelefono(e.target.value)} required />
        </label>
        {state.user.role && state.user.role === "orientatore" ? null :
        <label>
          Orientatori:
          <select value={orientatori} onChange={(e) => setOrientatori(e.target.value)}>
            <option value="">Nessun orientatore</option>
            {orientatoriOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.nome} {' '} {option.cognome}
              </option>
            ))}
          </select>
        </label>}
        <label>
          Campagna:
          <input type="text" value={campagna} onChange={(e) => setCampagna(e.target.value)} />
        </label>
        <label>
          Esito:
          <select required value={esito} onChange={(e) => setEsito(e.target.value)}>
            <option value="" disabled>Seleziona un esito</option>
            <option value='Da contattare'>Da contattare</option>
            <option value='Non risponde'>Non risponde</option>
            <option value="Da richiamare">Da richiamare</option>
            <option value='Non interessato'>Lead persa</option>
            {/*<option value='Fissato'>Fissato</option>*/}
          </select>
        </label>
        <label>
          Città:
          <select required value={città} onChange={(e) => setCittà(e.target.value)}>
            <option value="">Seleziona una città</option>
            {locations.map((motivoOption, index) => (
              <option key={index} value={motivoOption}>{motivoOption}</option>
            ))}
          </select>
        </label>
        <label>
          Trattamento:
          <select required value={trattamento} onChange={(e) => setTrattamento(e.target.value)}>
            <option value="" disabled>Seleziona un trattamento</option>
            <option value='Implantologia per singolo dente'>Implantologia per singolo dente</option>
            <option value='Implantologia a carico immediato'>Implantologia a carico immediato</option>
            <option value="Implantologia computer guidata">Implantologia computer guidata</option>
            <option value='Impianti per mancanza di osso (Impianti pterigoidei)'>Impianti per mancanza di osso (Impianti pterigoidei)</option>
            <option value="Protesi dentale semifissa">Protesi dentale semifissa</option>
            <option value='Pulizia dei denti'>Pulizia dei denti</option>
            <option value="Ortodonzia trasparente">Ortodonzia trasparente</option>
            <option value='Faccette dentali'>Faccette dentali</option>
            <option value='Sbiancamento'>Sbiancamento</option>
          </select>
        </label>
        <label>
          Note:
          <textarea type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </form>

      <div className='btnsubmitwrapper'>
        <button style={{ fontSize: "19px" }} type="submit" onClick={handleSubmit} className='btn-add'>Aggiungi</button>
        <div style={{ cursor: "pointer", marginTop: "20px" }} onClick={() => { setAddOpen(false); SETheaderIndex(999) }}><u>Torna indietro</u></div>

      </div>
    </div>
  );
};

export default AddLeadPopup;