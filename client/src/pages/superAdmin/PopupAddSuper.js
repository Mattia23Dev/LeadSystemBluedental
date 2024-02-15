import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import './popupAddSuper.scss';
import { UserContext } from '../../context';
import { ProvinceItaliane } from '../../components/Data';
import toast from 'react-hot-toast';

const AddLeadPopupSuper = ({ setAddOpen, selectUserId, setClosePopup, fetchData }) => {
  const [state, SETheaderIndex] = useContext(UserContext);
  const [data, setData] = useState(null);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [campagna, setCampagna] = useState('');
  const [corsoDiLaurea, setCorsoDiLaurea] = useState('');
  const [frequentiUni, setFrequentiUni] = useState(false);
  const [lavoro, setLavoro] = useState(false);
  const [facolta, setFacolta] = useState('');
  const [oreStudio, setOreStudio] = useState('');
  const [esito, setEsito] = useState('Da contattare');
  const [orientatori, setOrientatori] = useState('');
  const [universita, setUniversita] = useState('');
  const [provincia, setProvincia] = useState('');
  const [note, setNote] = useState('');
  const [fatturato, setFatturato] = useState('0');
  const [orientatoriOptions, setOrientatoriOptions] = useState([])

  const handleDateChange = (date) => {
    setData(date);
  };

  useEffect(() => {
    const getOrientatori = async () => {
      await axios.get(`/utenti/${selectUserId}/orientatori`)
        .then(response => {
          const data = response.data.orientatori;

          setOrientatoriOptions(data);
          console.log(data);
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
        //opzionali
        corsoDiLaurea,
        frequentiUni,
        lavoro,
        facolta,
        oreStudio,
        esito,
        orientatori: orientatori === '' ? null : orientatori,
        universita,
        provincia,
        note,
        fatturato,
        from: 'superadmin',
      };
      console.log(newLead);

      const response = await axios.post(`/lead/create/${selectUserId}`, newLead);
      console.log(response.data); // Risposta dal backend
      toast.success('Hai aggiunto il lead!');
      setClosePopup();
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Assicurati di avere compilato tutti i campi obbligatori!")
    }
  };

  return (
    <div className="add-lead-popup-super-manual" id='aggiungileadpop'>
      <div className='top-add-popup-super'>
        <h4>Aggiungi Lead</h4>
      </div>

      <svg id="modalclosingicon" onClick={() => { setAddOpen(false); SETheaderIndex(999) }} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>


      <form className='form-add'>
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
        <label>
          Campagna:
          <input type="text" value={campagna} onChange={(e) => setCampagna(e.target.value)} />
        </label>
        <label>
          Orientatori:
          <select value={orientatori} onChange={(e) => setOrientatori(e.target.value)}>
            <option value="" disabled>Seleziona un orientatore</option>
            {orientatoriOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.nome} {' '} {option.cognome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Esito:
          <select required value={esito} onChange={(e) => setEsito(e.target.value)}>
            <option value="" disabled>Seleziona un esito</option>
            <option value='Da contattare'>Da contattare</option>
            <option value='In lavorazione'>In lavorazione</option>
            <option value='Non interessato'>Non interessato</option>
            <option value='Opportunità'>Opportunità</option>
            <option value='In valutazione'>In valutazione</option>
            <option value='Venduto'>Iscrizione</option>
          </select>
        </label>
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
        <label>
          Corso di laurea:
          <input type='text' value={corsoDiLaurea} onChange={(e) => setCorsoDiLaurea(e.target.value)} />
        </label>
        <label>
          Facoltà:
          <input 
          type="text" 
          value={facolta} 
          onChange={(e) => setFacolta(e.target.value)} 
          />
        </label>
        <label>
          Università:
          <select value={universita} onChange={(e) => setUniversita(e.target.value)}>
            <option value="" disabled>Seleziona un'università</option>
            <option value='Unimercatorum'>Unimercatorum</option>
            <option value='Sanraffaele'>Sanraffaele</option>
            <option value='Unipegaso'>Unipegaso</option>
            <option value='Aulab'>Aulab</option>
          </select>
        </label>
        <label>
          Ore studio:
          <select value={oreStudio} onChange={(e) => setOreStudio(e.target.value)}>
            <option value="" disabled>Seleziona un orario</option>
            <option value='1'>1</option>
            <option value='2'>2</option>
            <option value='3'>3</option>
            <option value='5'>5</option>
          </select>
        </label>
        <label>
          Provincia:
          <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
            <option value="" disabled>Seleziona una provincia</option>
            {ProvinceItaliane.map((provincia) => (
              <option key={provincia} value={provincia}>
                {provincia}
              </option>
            ))}
          </select>
        </label>
        <label>
          Frequenta l'università?
          <div id='newleadradios'>
            <div>
              <input
                type="radio"
                checked={frequentiUni === true}
                onChange={() => setFrequentiUni(true)}
              />
              SI
            </div>
            <div>
              <input
                type="radio"
                checked={frequentiUni === false}
                onChange={() => setFrequentiUni(false)}
              />
              NO
            </div>
          </div>
        </label>
        <label>
          Lavora già?
          <div id='newleadradios'>
            <div>
              <input
                type="radio"
                checked={lavoro === true}
                onChange={() => setLavoro(true)}
              />
              SI
            </div>
            <div>
              <input
                type="radio"
                checked={lavoro === false}
                onChange={() => setLavoro(false)}
              />
              NO
            </div>
          </div>
        </label>
        <label>
          Note:
          <textarea type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </form>

      <div className='btnsubmitwrapper-super'>
        <button style={{ fontSize: "19px" }} type="submit" onClick={handleSubmit} className='btn-add-super-popup'>Aggiungi</button>
        <div style={{ cursor: "pointer", marginTop: "10px" }} onClick={() => { setAddOpen(false); SETheaderIndex(999) }}><u>Torna indietro</u></div>

      </div>
    </div>
  );
};

export default AddLeadPopupSuper;