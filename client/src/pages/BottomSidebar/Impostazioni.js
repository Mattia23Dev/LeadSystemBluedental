import React, { useState, useEffect, useContext } from 'react'
import Sidebar from '../../components/SideBar/Sidebar'
import './impostazioni.scss';
import { UserContext } from '../../context';
import axios from 'axios';
import moment from "moment";
import "moment/locale/it";
import toast from 'react-hot-toast';
import { SyncOutlined } from "@ant-design/icons";
import icon1 from '../../imgs/Group.png';
import icon2 from '../../imgs/Group3.png';
import Arrow from '../../imgs/Arrow.png';
import download from '../../imgs/download.png';
import { FaPencilAlt } from "react-icons/fa";
import { SidebarContext } from '../../context/SidebarContext';
import {useNavigate} from 'react-router-dom';


const makeStyle = (status) => {
  if (status === 'paid') {
    return "paid"
    // background: 'rgb(145 254 159 / 47%)',
    // color: 'green',

  }
  else if (status === 'unpaid') {
    return "unpaid"
    // {
    //   background: '#ffadad8f',
    //   color: 'red',
    // }
  }
  else {
    return "error"
    // {
    //   background: '#59bfff',
    //   color: 'white',
    // }
  }
}


const Impostazioni = () => {
  moment.locale("it");
  const [state, setState] = useContext(UserContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userImp, setUserImp] = useState();
  const [pIva, setPIva] = useState(state.user.pIva);
  const [codeSdi, setCodeSdi] = useState();
  const [nameECP, setNameECP] = useState();
  const [city, setCity] = useState();
  const [emailNotification, setEmailNotification] = useState();
  const [via, setVia] = useState();
  const [cap, setCap] = useState();
  const [stato, setStato] = useState();
  const [search, SETsearch] = useState("")
  const userId = state.user._id;
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoadingMin, setIsLoadingMin] = useState(true);

  const [dailyCap, setDailyCap] = useState(0);

  const { isSidebarOpen } = useContext(SidebarContext);
  const containerStyle = {
    transition: 'width 0.3s ease',
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`/getUser-impostazioni/${userId}`);
        console.log(response.data);
        const user = response.data;
        setUserImp(user);
        setIsLoadingMin(false);
        setDailyCap(user.dailyCap);
      } catch (error) {
        console.error('Errore durante la richiesta', error);
        throw error;
      }
    };
    const fetchOrientatore = async () => {
      try {
        const response = await axios.get(`/getOri-impostazioni/${userId}`);
        console.log(response.data);
        const user = response.data;
        setUserImp(user);
        setIsLoadingMin(false);
        setDailyCap(user.dailyCap);
      } catch (error) {
        console.error('Errore durante la richiesta', error);
        throw error;
      }
    };
    if (state && state.token) {
      if (state.user.role && state.user.role === "orientatore"){
        fetchOrientatore()
      } else {
        fetchUser()
      }
    };
  }, [state && state.token]);
  
  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('payments');
    localStorage.removeItem('sub');
    localStorage.removeItem('table-lead');
    navigate('/login');
    toast.success('Ti sei disconnesso con successo!')
  }

  const handleUpdate = async () => {
    console.log(nameECP, pIva, codeSdi);
    try {
      const response = await axios.put('/update-user', {
        _id: state.user._id,
        nameECP: nameECP,
        codeSdi: codeSdi,
        pIva: pIva,
        city: city,
        via: via,
        cap: cap,
        stato: stato,
        emailNotification: emailNotification,
      });
      setIsEditing(false);
      toast.success('Profilo aggiornato correttamente')
      setState({ user: response.data, token: state.token });
      localStorage.setItem("auth", JSON.stringify(state));
      window.location.reload()
      console.log(response.data);

    } catch (error) {
      console.error(error);
      toast.error('Si è verificato un errore, prova tra qualche minuto.')
    }
  };
  
  return (
    <>
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
        <div>

          <div className="toptoptop">
            <div className='impostazioni-top'>
              <button className='impostazioni-button' onClick={handleLogout}>Esci</button>
            </div>
          </div>

          <div className='impostazioni' id='imp2'>
            <div className='impostazioni-profilo'>
              <h5>Impostazioni di <font color='#3471CC'>fatturazione</font></h5>
              {isEditing ? (
                <form className='impostazioni-form'>
                  <div className='form-personal-date'>
                    <div id='riga'>
                      <p>Partita Iva <span><FaPencilAlt size={14} /></span></p>
                      <input placeholder={pIva} value={pIva} onChange={(e) => setPIva(e.target.value)} />
                    </div>
                    <div id='riga'>
                          <p>Email per notifiche <span><FaPencilAlt size={14} /></span></p>
                          <input placeholder={emailNotification ? emailNotification : ''} value={emailNotification} onChange={(e) => setEmailNotification(e.target.value)} />
                    </div>

                    <div id='riga'>
                      <p>Codice univoco <span><FaPencilAlt size={14} /></span></p>
                      <input placeholder={codeSdi} value={codeSdi} onChange={(e) => setCodeSdi(e.target.value)} />
                    </div>

                    <div className='form-bottom'>
                      <p>Sede legale <span><FaPencilAlt size={14} /></span></p>
                      <div className='form-bottom-legal'>
                        <div>
                          <p>Via <span><FaPencilAlt size={14} /></span></p>
                          <input placeholder={via ? via : ''} value={via} onChange={(e) => setVia(e.target.value)} />
                        </div>
                        <div>
                          <p>Città <span><FaPencilAlt size={14} /></span></p>
                          <input placeholder={city ? city : ''} value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                      </div>
                      <div className='form-bottom-legal'>
                        <div>
                          <p>Cap <span><FaPencilAlt size={14} /></span></p>
                          <input placeholder={cap} value={cap} onChange={(e) => setCap(e.target.value)} />
                        </div>
                        <div>
                          <p>Stato <span><FaPencilAlt size={14} /></span></p>
                          <input placeholder={stato} value={stato} onChange={(e) => setStato(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={handleUpdate} className='impostazioni-button'>
                    Salva
                  </button>
                </form>
              ) : (
                <div id='nomodifdata'>
                  {isLoadingMin ?
                    <div className="d-flex align-items-center">
                      <SyncOutlined spin style={{ fontSize: "50px" }} />
                    </div>
                    :
                    <>
                      <p><label>Nome:</label>{" " + userImp.name}</p>
                      <p><label>Email:</label>{" " + userImp.email}</p>
                      <p><label>P.Iva:</label>{" " + userImp.pIva}</p>
                      <p><label>SDI:</label>{" " + userImp.codeSdi}</p>
                      <p><label>ECP:</label>{" " + userImp.nameECP}</p>
                      <p><label>Indirizzo:</label>{userImp.via ? " " + userImp.via + ', ' + userImp.cap  : ""}</p>
                      <p><label>Città:</label>{userImp.city ? " " + userImp.city + ', ' + userImp.stato : ""}</p>
                      <p><label>Email per notifiche:</label>{userImp.emailNotification ? " " + userImp.emailNotification : ""}</p>
                    </>
                  }

                  <button type="button" onClick={handleEditClick} className='impostazioni-button'>
                    Modifica
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    </>
  )
}

export default Impostazioni