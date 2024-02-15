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


const Impostazioni = ({ history }) => {
  moment.locale("it");
  const [state, setState] = useContext(UserContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
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
    setIsLoading(true);
    const getSubscriptions = async () => {
      const { data } = await axios.get("/subscriptions");
      console.log("subs => ", data.data);
      setSubscriptions(data.data);
    };

    const getPayments = async () => {
      try {
        const { data } = await axios.get("/payments");
        console.log("payments => ", data);
        setPayments(data.payments);
        setInvoices(data.invoices);  
        localStorage.setItem("payments", JSON.stringify(data.payments));
        setIsLoading(false);
      } catch (error) {
        console.error("Errore nel recupero dei pagamenti:", error);
      }
    };

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

    if (state && state.token) getSubscriptions();
    if (state && state.token) getPayments();
    if (state && state.token) fetchUser();
  }, [state && state.token]);


  const manageSubscriptions = async () => {
    const { data } = await axios.get(`/customer-portal/${userId}`);
    window.open(data.url);
  };
  

  const handleEditClick = () => {
    setIsEditing(true);
  };


  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('payments');
    localStorage.removeItem('sub');
    localStorage.removeItem('table-lead');
    history.push('/login');
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
            {/* chiedere come vogliono design */}
            <div className='impostazioni-top'>
              <button className='impostazioni-button' onClick={handleLogout}>Esci</button>
            </div>
          </div>

          <div className='impostazioni' id='imp1'>
                <div className='impostazioni-abbonamento'>
                {subscriptions &&
              subscriptions.map((sub, index) => (
                  <div key={index} className="analitic-container" style={{marginTop: '30px'}}>
                    <div className="analitic-item">
                      <div className="item1">
                        <img src={icon2} alt="" />
                      </div>
                      <div className="item2">
                        <p>{sub.status === 'active' ? "Piano attivo" : "Non attivo"}</p>
                        <span>{sub.status === 'active' ? <span id='pianoattivo'></span> : <span id='pianononattivo'></span>}</span>
                        <p>{sub.plan.nickname}</p>
                        <p><span>Attivo da:</span> <span style={{ fontWeight: "500", color: "#3471CC" }}>{moment(sub.current_period_start * 1000)
                          .format("dddd, D MMMM")
                          .toString()}</span></p>
                      </div>
                    </div>
                    <div className="analitic-item" style={{ borderRight: 'none' }}>
                      <div className="item1">
                        <img src={icon1} alt="" />
                      </div>
                      <div className="item2">
                        <p>Dettagli piano</p>
                        <p>{sub.plan ?
                          sub.plan.transform_usage ?
                            sub.plan.transform_usage.divide_by + " leads "
                            :
                            " 0 leads "
                          :
                          " 0 leads "
                        }</p>
                        <p>{(sub.plan.amount / 100).toLocaleString("it-IT")}{",00 €/mese"}</p>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
            <div className='impostazioni-upgrade'>
              <div>
                <img src={Arrow} alt='arrow' />
              </div>
              <div>
                <h4>Scopri i<font color='#3471CC'> piani</font></h4>
                <a href='/account' className='button-upgrade'>Effettua upgrade</a>
                <a onClick={manageSubscriptions} style={{cursor: 'pointer'}} className='button-upgrade'>Gestisci iscrizione</a>
              </div>
            </div>
          </div>

        {/*<div className='impostazioni' style={{marginTop: '40px'}}>
            <h6>Imposta il numero massimo di lead che vuoi ricevere al giorno:</h6>
            <input type='number' value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} />
            <button className='impostazioni-button' onClick={changeDailyCap}> Salva</button>
          </div>*/}


          <div className='impostazioni' id='imp2'>
            <div className='impostazioni-pagamenti'>
              <h4 id='titcronfatt'>
                <span>Cronologia <font color='#3471CC'>fatture e fatturazione</font></span>
                <span id='paginationwrapper'>
                  <div id='displaypages'>
                    <span id='current'>1-50</span> di 100
                  </div>
                  <div id="arrows">
                    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"><path d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z" /></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"><path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" /></svg>
                  </div>
                </span>
              </h4>

              <div className="cercafatture">

                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" enable-background="new 0 0 50 50">
                  <path fill="#231F20" d="M20.745,32.62c2.883,0,5.606-1.022,7.773-2.881L39.052,40.3c0.195,0.196,0.452,0.294,0.708,0.294
	c0.255,0,0.511-0.097,0.706-0.292c0.391-0.39,0.392-1.023,0.002-1.414L29.925,28.319c3.947-4.714,3.717-11.773-0.705-16.205
	c-2.264-2.27-5.274-3.52-8.476-3.52s-6.212,1.25-8.476,3.52c-4.671,4.683-4.671,12.304,0,16.987
	C14.533,31.37,17.543,32.62,20.745,32.62z M13.685,13.526c1.886-1.891,4.393-2.932,7.06-2.932s5.174,1.041,7.06,2.932
	c3.895,3.905,3.895,10.258,0,14.163c-1.886,1.891-4.393,2.932-7.06,2.932s-5.174-1.041-7.06-2.932
	C9.791,23.784,9.791,17.431,13.685,13.526z"/>
                </svg>

                <input
                  type="text"
                  placeholder="Cerca per numero d'ordine"
                  onChange={(e) => SETsearch(e.target.value)}
                />
              </div>

              <div className='table-cont'>
                <table style={{ minWidth: 650 }} aria-label="simple table" className="table-container pagamenti-table">
                  <thead id='fatturetittab'>
                    <tr>
                      <th style={{ color: 'lightgray', fontSize: '25px' }}>Data</th>
                      <th style={{ color: 'lightgray', fontSize: '25px' }}>N. Ordine</th>
                      <th style={{ color: 'lightgray', fontSize: '25px' }}>Importo</th>
                      <th style={{ color: 'lightgray', fontSize: '25px' }}>Azione</th>
                      <th style={{ color: 'lightgray', fontSize: '25px' }}>Stato</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "white", textAlign: 'left' }} className="table-body-container">
                    {payments &&
                      payments
                        .filter(p => p.id.slice(-4).includes(search))
                        .filter(p => {
                          let flag = true

                          if (startDate)
                            flag = new Date(moment.unix(p.created).toDate()) >= new Date(startDate)
                          if (endDate)
                            flag = flag && new Date(moment.unix(p.created).toDate()) <= new Date(endDate)

                          return flag
                        })
                        .sort((a, b) => - new Date(moment.unix(a.created)) + new Date(moment.unix(b.created)))
                        .map((payment) => {
                          const matchingInvoice = invoices.find(invoice => invoice.id === payment.invoice);
                         return (
                          <tr key={payment.id}>
                            <td>{moment.unix(payment.created).format('DD/MM/YYYY')}</td>
                            <td>{payment.id.slice(-4)}</td>
                            <td>{(payment.amount_total / 100).toLocaleString("it-IT")}{",00 €"}</td>
                            <td>
                              {matchingInvoice && (
                                    <a href={matchingInvoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                      <img src={download} alt='invoicing' />
                                    </a>
                              )}
                            </td>
                            <td>
                              <span className={"status " + makeStyle(payment.payment_status)} >
                                {payment.payment_status == "paid" ?
                                  "Pagato"
                                  :
                                  payment.payment_status == "unpaid" ?
                                    "In sospeso"
                                    :
                                    "Errore"
                                }
                                <font></font>
                              </span>
                            </td>
                          </tr>
                        )
                        }
                        )}
                  </tbody>
                </table>
              </div>
            </div>
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