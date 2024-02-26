import React from 'react'
import './orientatori.scss';
import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context';
import toast from 'react-hot-toast';
import { SyncOutlined } from "@ant-design/icons";
import { SidebarContext } from '../context/SidebarContext';
import { FaPencilAlt } from "react-icons/fa";
import '../components/Table/popupModify/popupModify.scss';

const Orientatori = () => {
  const [filterValue, setFilterValue] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [arrayFatturatoPerOrientatoreUser, setArrayFatturatoPerOrientatoreUser] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [state, setState, headerIndex, SETheaderIndex] = useContext(UserContext);
  const [deleting, setDeleting] = useState(false);
  const [selectedOrientatore, setSelectedOrientatore] = useState(null);
  const [modifyOrientatore, setModifyOrientatore] = useState(false);
  const userId = state.user._id;
  console.log(userId);

  const { isSidebarOpen } = useContext(SidebarContext);
  const containerStyle = {
    transition: 'width 0.3s ease',
  }

  const handleNomeChange = (event) => {
    setNome(event.target.value);
  };

  const handleCognomeChange = (event) => {
    setCognome(event.target.value);
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleNumeroTelefonoChange = (event) => {
    setNumeroTelefono(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const orientatoreData = {
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: email,
      telefono: numeroTelefono,
      utente: userId,
    };

    axios.post('/create-orientatore', orientatoreData)
      .then(response => {
        console.log(response.data);
        toast.success('Hai aggiunto correttamente l\'orientatore');
        setNome('');
        setCognome('');
        setEmail('');
        setNumeroTelefono('');
        getOrientatori();
      })
      .catch(error => {
        console.error(error);
        // Gestisci l'errore qui
      });
  };

  const getOrientatori = async () => {
    await axios.get(`/utenti/${userId}/orientatori`)
      .then(response => {
        const data = response.data;
        console.log(data.orientatori);
        setFilteredData(data.orientatori);
        setOriginalData(data.orientatori);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
      });
  }

    const calculateFatturatoByOrientatoreUser = async () => {
      try {
        const response = await axios.post(`/calculateFatturatoByOrientatoreUser/${userId}`, { userId });
        const fatturatoByOrientatore = response.data;
        console.log(fatturatoByOrientatore);
        setArrayFatturatoPerOrientatoreUser(fatturatoByOrientatore.sort((a, b) => b.sommaFatturato - a.sommaFatturato));
      } catch (error) {
        console.error(error);
        // Gestisci l'errore
      }
    };

  useEffect(() => {
    setIsLoading(true);

    if (state && state.token) getOrientatori();
    calculateFatturatoByOrientatoreUser();
  }, [])

  useEffect(() => {
    const filteredDataIn = filteredData.map((row) => {
      return {
        nome: row.nome,
        cognome: row.cognome,
        email: row.email,
        telefono: row.telefono,
      };
    });
    setFilteredData(filteredDataIn);
    console.log(filteredDataIn);
  }, [])

  const deleteOrientatore = async (orientatoreId) => {
    try {
      const response = await axios.delete('/delete-orientatore', { data: { id: orientatoreId } });
      console.log(response.data.message);
      toast.success('Hai eliminato correttamente l\'orientatore');
      getOrientatori();
    } catch (error) {
      console.error(error);
      toast.error('Si è verificato un errore.')
    }

    setDeleting(false)
  };

  const handleDelete = (event) => {
    event.preventDefault();
    console.log(selectedOrientatore._id);
    deleteOrientatore(selectedOrientatore._id)
  }

  const handleRowClick = (orientatore, choose) => {
    setSelectedOrientatore(orientatore);

    if (choose == 'delete'){
    setDeleting(true);
    } else if (choose == 'modify'){
      setModifyOrientatore(true);
    };

    SETheaderIndex(0);
  };

  const onClosePopupModify = () => {
    setModifyOrientatore(false);
  }


  return (
    <>
      <div>

        {deleting && (
          <div className="popup-orientatore">
            <svg id="modalclosingicon" style={{ fill: "#3471CC" }} onClick={() => { setDeleting(false); SETheaderIndex(999) }} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>


            <h2>Eliminazione Orientatore</h2>
            <p>Sei sicuro di voler eliminare l'orientatore {selectedOrientatore.nome}?</p>
            <button className='btn-orie' onClick={handleDelete}>Elimina</button>
          </div>
        )}

{modifyOrientatore && (
          <ModifyOrientatore getOrientatori={getOrientatori} onClose={onClosePopupModify} selectedOrientatore={selectedOrientatore} setPopupModify={() => setModifyOrientatore(false)} />
        )}

        <div className='orientatori'>
          <div className="Table" id='Table'>
            <div className="table-big-container-admin" id='table-container'>
              <div className="table-filters" id='table-filters-orient'>
                <div>
                  <h4>Orientatori</h4>
                </div>

                <div id={"orientatorisearch"} style={{ display: 'flex', alignItems: 'center' }}>


                  <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" enable-background="new 0 0 50 50">
                    <path d="M20.745,32.62c2.883,0,5.606-1.022,7.773-2.881L39.052,40.3c0.195,0.196,0.452,0.294,0.708,0.294
	c0.255,0,0.511-0.097,0.706-0.292c0.391-0.39,0.392-1.023,0.002-1.414L29.925,28.319c3.947-4.714,3.717-11.773-0.705-16.205
	c-2.264-2.27-5.274-3.52-8.476-3.52s-6.212,1.25-8.476,3.52c-4.671,4.683-4.671,12.304,0,16.987
	C14.533,31.37,17.543,32.62,20.745,32.62z M13.685,13.526c1.886-1.891,4.393-2.932,7.06-2.932s5.174,1.041,7.06,2.932
	c3.895,3.905,3.895,10.258,0,14.163c-1.886,1.891-4.393,2.932-7.06,2.932s-5.174-1.041-7.06-2.932
	C9.791,23.784,9.791,17.431,13.685,13.526z"/>
                  </svg>

                  <input
                    type="text"
                    placeholder="Cerca..."
                    onChange={(e) => setFilterValue(e.target.value)}
                    value={filterValue} />
                </div>
              </div>
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
                <div id="oftable">

                  <table style={{ minWidth: '40%' }} aria-label="simple table" className="table-container">
                    <thead style={{ top: "1rem" }}>
                      <tr>
                        <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "500" }}>Nome</th>
                        <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "500" }}>Telefono</th>
                        <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "500" }}>Email</th>
                        <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '20px', fontWeight: "500" }}>Modifica</th>
                      </tr>
                    </thead>
                    <tbody style={{ textAlign: 'left', width: '100%' }} className="table-body-container">
                      {filteredData && filteredData
                        .filter(r =>
                          r.nome.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()) ||
                          r.cognome.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()) ||
                          r.telefono.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()) ||
                          r.email.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase())
                        )
                        .map((row) =>
                          <tr key={row._id}>
                            <td>{row.nome + ' ' + row.cognome}</td>
                            <td>{row.telefono}</td>
                            <td>
                              {row.email}
                            </td>
                            <td>
                              <svg style={{cursor: 'pointer', margin: '0 20px'}} onClick={() => handleRowClick(row, 'delete')} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z" /></svg>
                              <FaPencilAlt style={{cursor: 'pointer'}} onClick={() => handleRowClick(row, 'modify')} size={18} />
                            </td>

                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
          <div className='right-orientatori'>
            <h5 style={{ fontSize: "20px", width: "90%", color: "grey" }}>Classifica <span style={{ color: "black" }}>orientatori</span></h5>
            <div className='classifica'>
              <div id='overflowhandler'>
                {arrayFatturatoPerOrientatoreUser && arrayFatturatoPerOrientatoreUser
                  .map((data, k) => {
                    if (data.orientatore)
                      return (
                        <div key={data.orientatore._id} className='classifica-nomi'>
                          <span id='s1'>#{k + 1}</span>
                          <span id='s2'>{data.orientatore.nome}</span>
                          <span id='s3'>{data.sommaFatturato}</span>
                        </div>
                      )
                  })}
              </div>
            </div>
            <div className='add-orientatori'>
              <h4>Aggiungi <font color='#3471CC'>orientatori</font></h4>
              <div className='input-orientatori'>
                <div className='input-item'>
                  <label>Nome:</label>
                  <input type="text" value={nome} onChange={handleNomeChange} />
                </div>
                <div className='input-item'>
                  <label>Cognome:</label>
                  <input type="text" value={cognome} onChange={handleCognomeChange} />
                </div>
                <div className='input-item'>
                  <label>Email:</label>
                  <input type="email" value={email} onChange={handleEmailChange} />
                </div>
                <div className='input-item'>
                  <label>Numero di telefono:</label>
                  <input type="number" value={numeroTelefono} onChange={handleNumeroTelefonoChange} />
                </div>
                <button onClick={handleSubmit} className='btn-orie-add' type="submit">Aggiungi Orientatore</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const ModifyOrientatore = ({selectedOrientatore, onClose, setPopupModify, getOrientatori}) => {
  const [modifyName, setModifyName] = useState(selectedOrientatore.nome ? selectedOrientatore.nome : '');
  const [modifyEmail, setModifyEmail] = useState(selectedOrientatore.email ? selectedOrientatore.email : '');
  const [modifyCognome, setModifyCognome] = useState(selectedOrientatore.cognome ? selectedOrientatore.cognome :'');
  const [modifyTelefono, setModifyTelefono] = useState(selectedOrientatore.telefono ? selectedOrientatore.telefono :'');
  const orientatoreId = selectedOrientatore._id
  const handleModify = async() => {
    try {
      const modifyOrientatore = {
        email : modifyEmail,
        telefono : modifyTelefono,
        nome: modifyName,
        cognome: modifyCognome,
    };
    const response = await axios.put(`/update-orientatore/${orientatoreId}`, modifyOrientatore);

    setPopupModify(false);
    toast.success('L\'orientatore è stato modificato con successo.');
    getOrientatori();
    console.log(response.data.message);
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <div className="popup-orientatore">
    <svg id="modalclosingicon" style={{ fill: "#3471CC" }} onClick={() => onClose()} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>


    <h2>Modifica Orientatore {selectedOrientatore.nome}</h2>
    <div>
      <div className='popup-middle-bottom1'>
            <div>
                <p>Nome <span><FaPencilAlt size={14} /></span></p>
                <input placeholder={selectedOrientatore.nome} value={modifyName} onChange={(e) => setModifyName(e.target.value)} />
            </div>
            <div>
                <p>Cognome <span><FaPencilAlt size={14} /></span></p>
                <input placeholder={selectedOrientatore.cognome} value={modifyCognome} onChange={(e) => setModifyCognome(e.target.value)} />
            </div>
        </div>
        <div className='popup-middle-bottom1'>
            <div>
                <p>Indirizzo email <span><FaPencilAlt size={14} /></span></p>
                <input placeholder={selectedOrientatore.email} value={modifyEmail} onChange={(e) => setModifyEmail(e.target.value)} />
            </div>
            <div>
                <p>Telefono <span><FaPencilAlt size={14} /></span></p>
                <input placeholder={selectedOrientatore.telefono} value={modifyTelefono} onChange={(e) => setModifyTelefono(e.target.value)} />
            </div>
        </div>
    </div> 
    <button className='btn-orie' onClick={handleModify}>Modifica</button>
    
  </div>
  )
}


export default Orientatori