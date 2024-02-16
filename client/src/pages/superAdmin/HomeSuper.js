import React, {useContext, useEffect, useState} from 'react'
import axios from 'axios';
import { SyncOutlined } from "@ant-design/icons";
import './homeSuper.css';
import TopDash from '../../components/MainDash/TopDash';
import { FaPencilAlt } from "react-icons/fa";
import { UserContext } from '../../context';
import { toast } from 'react-hot-toast';
import AddLeadPopupSuper from './PopupAddSuper';
import schedaEcpImage from '../../imgs/Group.png';
import TableSuperAdmin from './components/TableSuperAdmin';
import moment from 'moment';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dashMarketing from '../../imgs/dash-marketing.png';
import LeadDeletedPopup from './components/LeadDeletedPopup';
import Rating from 'react-rating';
import PopupCounterLeadSuper from './components/PopupCounterLeadSuper';
import AddPopupLeadSuper from './components/AddPopupLeadSuper';
import PopupCap from './components/PopupCap';
import { useNavigate } from 'react-router-dom';

const HomeSuper = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [popupAddLead, setPopupAddLead] = useState(false);
    const [popupAddLeadManual, setPopupAddLeadManual] = useState(false);
    const [popupModifyCounterLead, setPopupModifyCounterLead] = useState(false);
    const [popupClient, setPopupClient] = useState(false);
    const [selectUsers, setSelectUsers] = useState(null);
    const [state] = useContext(UserContext);
    const [leadDeletedPopup, setLeadDeletedPopup] = useState(false);
    const [leadDeleted, setLeadDeleted] = useState(null);
    const [viewPageLeadPopup, setViewPageLeadPopup] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [originalUsers, setOriginalUsers] = useState([]);
    const [endDate, setEndDate] = useState(null);

    const [leadAssegnati, setLeadAssegnati] = useState([]);
    const [leadEntrati, setLeadEntrati] = useState([]);
    const [leadEntratiWha, setLeadEntratiWha] = useState([]);
    const [leadEntratiWo, setLeadEntratiWo] = useState([]);
    const [leadEntratiWhaOrig, setLeadEntratiWhaOrig] = useState([]);
    const [leadEntratiWoOrig, setLeadEntratiWoOrig] = useState([]);
    const [leadAssegnatiOriginal, setLeadAssegnatiOriginal] = useState([]);
    const [leadEntratiOriginal, setLeadEntratiOriginal] = useState([]);

    const calculateDailyAverage = (leads) => {
      const leadCountByDay = {};
    
      leads.forEach((lead) => {
        const leadDate = moment(lead.data).format('YYYY-MM-DD');
        if (leadCountByDay[leadDate]) {
          leadCountByDay[leadDate]++;
        } else {
          leadCountByDay[leadDate] = 1;
        }
      });
    
      const totalLeads = Object.values(leadCountByDay).reduce((acc, count) => acc + count, 0);
      const numDays = Object.keys(leadCountByDay).length;
    
      const dailyAverage = totalLeads / numDays;
    
      return dailyAverage;
    };
    
        const fetchData = async () => {
          try {
            const response = await axios.get('/get-all-user-super-admin');
            const usersWithPaymentsAndLeads = response.data;
            const usersWithAverage = usersWithPaymentsAndLeads.map((user) => {
              const leads = user.leads || [];
              const dailyAverage = calculateDailyAverage(leads).toFixed(1);
        
              return {
                ...user,
                dailyAverage,
              };
            });
            setUsers(usersWithAverage);
            setOriginalUsers(usersWithAverage);
            setIsLoading(false);
          } catch (error) {
            console.error(error);
          }
        };
    
        const fetchLeadDeleted = async () => {
          try {
            const response = await axios.get('/get-lead-deleted');
            const leadDeleted = response.data;
            setLeadDeleted(leadDeleted);
          } catch (error) {
            console.error(error);
          }
        };

        const fetchLeadForCounter = async() => {
          await axios.get('/get-all-leads-for-counter')
          .then(response => {
            const leadsData = response.data;
            setLeadAssegnati(leadsData.leads);
            setLeadEntrati(leadsData.facebookLeads);
            setLeadEntratiWo(leadsData.wordpressLeads);
            setLeadEntratiWha(leadsData.whatsappLeads)
            setLeadAssegnatiOriginal(leadsData.leads);
            setLeadEntratiOriginal(leadsData.facebookLeads);
            setLeadEntratiWhaOrig(leadsData.whatsappLeads);
            setLeadEntratiWoOrig(leadsData.wordpressLeads);
          })
          .catch(error => {
            console.error('Errore nel recupero dei lead:', error);
          });
        }
    
    
        useEffect(() => {
          setIsLoading(true);
          fetchData();
          fetchLeadDeleted();
          fetchLeadForCounter();
        }, []);

    const filterDataByDate = (data, startDate, endDate) => {
      const filteredData = data.filter((row) => {
        const rowDate = new Date(row.data);
        const formattedRowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());

        const selectedDateStart = new Date(startDate);
        const formatteddDateStart = new Date(selectedDateStart.getFullYear(), selectedDateStart.getMonth(), selectedDateStart.getDate());

        const selectedDateEnd = new Date(endDate);
        const formatteddDateEnd = new Date(selectedDateEnd.getFullYear(), selectedDateEnd.getMonth(), selectedDateEnd.getDate());

        return formattedRowDate.getTime() >= formatteddDateStart.getTime() && formattedRowDate.getTime() <= formatteddDateEnd.getTime();
      });
  
      return filteredData;
    };

    const filterDataByDateWha = (data, startDate, endDate) => {
      const filteredData = data.filter((row) => {
        const rowDate = new Date(row.timestamp);
        const formattedRowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());

        const selectedDateStart = new Date(startDate);
        const formatteddDateStart = new Date(selectedDateStart.getFullYear(), selectedDateStart.getMonth(), selectedDateStart.getDate());

        const selectedDateEnd = new Date(endDate);
        const formatteddDateEnd = new Date(selectedDateEnd.getFullYear(), selectedDateEnd.getMonth(), selectedDateEnd.getDate());

        return formattedRowDate.getTime() >= formatteddDateStart.getTime() && formattedRowDate.getTime() <= formatteddDateEnd.getTime();
      });
  
      return filteredData;
    };

    const filterDataByOneDate = (data, selectedDate) => {
      const filteredData = data.filter((row) => {
        const rowDate = new Date(row.data ? row.data : row.timestamp);
        const formattedRowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    
        const selectedDateObj = new Date(selectedDate);
        const formattedSelectedDate = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
    
        return formattedRowDate.getTime() === formattedSelectedDate.getTime();
      });
    
      return filteredData;
    };

    const handleClearFilter = () => {
      setStartDate(null);
      setEndDate(null);
      setUsers(originalUsers);
      setLeadAssegnati(leadAssegnatiOriginal);
      setLeadEntrati(leadEntratiOriginal);
      setLeadEntratiWha(leadEntratiWhaOrig);
      setLeadEntratiWo(leadEntratiWoOrig);
    };

    const handleLogout = () => {
      localStorage.removeItem('auth');
      navigate('/super-admin');
      toast.success('Ti sei disconnesso con successo!')
    }
    

    useEffect(() => {
      if (startDate && endDate && new Date(startDate) < new Date(endDate)) {
        const filteredLeadAssegnati = filterDataByDate(leadAssegnatiOriginal, startDate, endDate);
        const filteredLeadEntrati = filterDataByDate(leadEntratiOriginal, startDate, endDate);
        const filteredLeadEntratiWha = filterDataByDateWha(leadEntratiWhaOrig, startDate, endDate);
        const filteredLeadEntratiWo = filterDataByDate(leadEntratiWoOrig, startDate, endDate);

        const filteredLeadUsers = originalUsers.map(user => ({
          ...user,
          leads: filterDataByDate(user.leads, startDate, endDate)
        }));
  
        setUsers(prevState => filteredLeadUsers);
        setLeadAssegnati(prevState => filteredLeadAssegnati);
        setLeadEntrati(prevState => filteredLeadEntrati);
        setLeadEntratiWha(prevState => filteredLeadEntratiWha);
        setLeadEntratiWo(prevState => filteredLeadEntratiWo);
      } else if (startDate && new Date(startDate).toString() !== 'Invalid Date') {
        console.log('Aspe')
        /*const filteredLeadAssegnati = filterDataByOneDate(leadAssegnatiOriginal, startDate)
        const filteredLeadEntrati = filterDataByOneDate(leadEntratiOriginal, startDate);
        const filteredLeadEntratiWha = filterDataByOneDate(leadEntratiWhaOrig, startDate);
        const filteredLeadEntratiWo = filterDataByOneDate(leadEntratiWoOrig, startDate);

        const filteredLeadUsers = originalUsers.map(user => ({
          ...user,
          leads: filterDataByOneDate(user.leads, startDate)
        }));

        setUsers(prevState => filteredLeadUsers);
        setLeadAssegnati(prevState => filteredLeadAssegnati);
        setLeadEntrati(prevState => filteredLeadEntrati);
        setLeadEntratiWha(prevState => filteredLeadEntratiWha);
        setLeadEntratiWo(prevState => filteredLeadEntratiWo);*/
      }
    }, [startDate, endDate, leadAssegnati, leadEntrati, leadEntratiWha, leadEntratiWo]);

    const PageLeadEcp = () => {
      const handleClosePopupAll = () => {
        setPopupClient(false);
        setViewPageLeadPopup(false);
      }
      return (
        <div className='page-lead-ecp'>
            <TableSuperAdmin userId={selectUsers?._id} handleClosePopupAll={handleClosePopupAll} />
        </div>
      )
    }  


    const handlePopupAddLead = (user) => {
      setSelectUsers(user);
      if (popupAddLead === false){
      setPopupAddLead(true);
      } else {
        setPopupAddLead(false);
      }
    }

    const handlePopupModifyCounter = (user) => {
      setSelectUsers(user);
      if (popupModifyCounterLead=== false){
      setPopupModifyCounterLead(true);
      } else {
        setPopupModifyCounterLead(false);
      }
    };

    const [popupModifyCap, setPopupModifyCap] = useState(false);

    const handlePopupModifyCap = (user) => {
      setSelectUsers(user);
      if (popupModifyCap=== false){
      setPopupModifyCap(true);
      } else {
        setPopupModifyCap(false);
      }
    }

    const handlePopupClient = (user) => {
      setSelectUsers(user);
      if (popupClient === false){
      setPopupClient(true);
      } else {
        setPopupAddLead(false);
      }
    }

    const PopupClient = () => {
      const [note, setNote] = useState(selectUsers.note ? selectUsers.note : '');
      const [rating, setRating] = useState(selectUsers.rating ? selectUsers.rating : 0);
      const [cr, setCr] = useState();
      console.log(selectUsers);

      const handlePopupChange = () => {
        setPopupClient(false);
        setPopupAddLead(true);
      }

      const pageOpenEcpLead = () => {
        setViewPageLeadPopup(true); 
        setPopupClient(false);
      };

      const handleRatingChange = (value) => {
        setRating(value);
      };

      const handleAccountStatus = async () => {
        try {
          const updatedStatus = !selectUsers.active;
      
          const response = await axios.post('/update-user-status-admin', {
            userId: selectUsers._id,
            active: updatedStatus,
          });
          
            console.log(response);
            fetchData();
            setPopupClient(false);
            toast.success('Stato aggiornato');
        } catch (error) {
          toast.error('Errore');
        }
      };

      const handleSaveEcp = () => {
        try {
          const userData ={
            userId: selectUsers._id,
            note :note,
            rating: rating,
         }
         
          axios.post('/modify-rating-note-super', userData)
          .then(response => {
            fetchData();
            setPopupClient(false);
          })
          .catch(error => {
            console.log(error);
          });
        } catch (error) {
          console.error(error);
        }
      };

      const calculate = () => {
        const totalLeads = selectUsers.leads.length;
        const soldLeads = selectUsers.leads.filter((lead) => lead.esito === 'Venduto');
        const numSoldLeads = soldLeads.length;
        
        const percentageSold = (numSoldLeads / totalLeads) * 100;
      
        setCr(percentageSold.toFixed(2));
      };

      useEffect(() => {
          calculate();
      }, [selectUsers]);


      return(
        <div className='scheda-ecp-popup-super'>
            <div className='top-popup-super-scheda-ecp'>
              <p onClick={() => setPopupClient(false)}>X</p>
              <h4>Scheda Ecp</h4>
            </div>
            <div className='middle-popup-super-scheda-ecp'>
              <div>
                <div className='image-container-super'>
                  <img alt='' src={schedaEcpImage} />
                </div>
                <div className='select-users-container'>
                  <h3>{selectUsers !== null ? selectUsers.nameECP : null}</h3> 
                  <p>{selectUsers.active ? 'Attivo' : 'Bloccato'} <span></span></p>
                  <p><ClockCircleOutlined style={{fontSize: '24px'}}/> dal {selectUsers.subscriptions[0] && selectUsers.subscriptions.length > 0 ? moment.unix(selectUsers.subscriptions[0].created).format('DD/MM/YYYY HH:mm') : "Non Attivo"}</p>
                </div>
              </div>
              <div>
                <a style={{textDecoration: 'none', cursor: 'pointer'}} onClick={pageOpenEcpLead} className='button-scheda-ecp'>Pagina Lead</a>
              </div>
              <div>
                <button onClick={handlePopupChange} className='button-scheda-ecp'>Aggiungi Lead</button>
              </div>
            </div>
            <div className='middle2-popup-super-scheda-ecp'>
              <div className='sub-middle2'>
                <label>Indirizzo email</label>
                <input type='text' placeholder={selectUsers.email} />
                <label>Nome</label>
                <input type='text' placeholder={selectUsers.nameECP} />
              </div>
              <div className='sub-middle2'>
                <label>Servizi Attivi</label>
               {selectUsers.subscriptions.map((sub) => (
                  <p>{sub.plan.nickname}</p>
               ))}
                <label>Fatturazione</label>
                <div>
                  <p>Nome ECP: <strong>{selectUsers.nameECP}</strong></p>
                  <p>Indirizzo: <strong>{selectUsers.via ? selectUsers.via : 'Non impostata'}</strong></p>
                  <p>P.IVA: <strong>{selectUsers.pIva}</strong></p>
                  <p>Codice SDI: <strong>{selectUsers.codeSdi}</strong></p>
                </div>

              </div>
              <div className='sub-middle2'>
                <label>Acquisti</label>
                <input type='text' placeholder={selectUsers.monthlyLeadFix} />
                <label>Ultimo Rcquisto</label>
                <input type='text' placeholder={selectUsers.subscriptions[0] && selectUsers.subscriptions.length > 0 ? moment.unix(selectUsers.subscriptions[0].current_period_start).format('DD/MM/YYYY') : ""} />
                <label>Prossimo Rinnovo</label>
                <input type='text' placeholder={selectUsers.subscriptions[0] && selectUsers.subscriptions.length > 0 ? moment.unix(selectUsers.subscriptions[0].current_period_end).format('DD/MM/YYYY') : ""} />
              </div>
            </div>
            <div className='bottom-popup-super'>
              <div>
                <div className='cr'>
                  <h4>Conversion Rate</h4>
                  <h6>{cr ? cr : 0}%</h6>
                </div>

                <textarea
                  className='note-ecp'
                    placeholder='Inserisci una nota...'
                    id='textareanote' value={note} onChange={(e) => setNote(e.target.value)} />

                <div className='rating'>
                  <h4>Soddisfazione</h4>
                  <Rating
                      initialRating={rating}
                      emptySymbol="far fa-star"
                      fullSymbol="fas fa-star"
                      onClick={handleRatingChange}
                    />
                </div>
              </div>
              <div className='bottom-popup-super-div'>
                <button style={{ marginTop: '0px' }} onClick={handleAccountStatus}>
                  {selectUsers.active ? 'Blocca Account' : 'Attiva Account'}
                </button>
                <button onClick={handleSaveEcp}>
                    salva
                </button>
              </div>
            </div>
        </div>
      )
    };

    const handleChangeRatingByTable = (user, rating, note) => {
        try {
          const userData ={
            userId: user._id,
            note : note,
            rating: rating,
         }
         
          const response = axios.post('/modify-rating-note-super', userData);

          fetchData();
        } catch (error) {
          console.error(error);
        }
    };

    const calculateConversionRate = (user) => {
      const totalLeads = user.leads.length;
      const soldLeads = user.leads.filter((lead) => lead.esito === 'Venduto');
      const numSoldLeads = soldLeads.length;
    
      if (totalLeads === 0 || soldLeads === 0) {
        return 0;
      }
    
      return ((numSoldLeads / totalLeads) * 100).toFixed(2);
    };

    function isRenewalNear(subscription) {
      if (!subscription) {
        return false;
      }
      
      const nextRenewalDate = moment.unix(subscription.current_period_end);
      const currentDate = moment();
      const daysUntilRenewal = nextRenewalDate.diff(currentDate, 'days');
      
      return daysUntilRenewal !== null && daysUntilRenewal <= 7;
    }
    console.log(leadEntratiWo);

  return (
    <div className='container-home-super'>
      <div className='sidebar-super-admin'>
        <Link to={'/super-admin/dash-marketing'} className='link-super'><img alt='dashboard-marketing' src={dashMarketing} /> <h6>Marketing</h6></Link>
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
        <div className='sub-container-home-super' style={{marginTop: '20px'}}>
          {/*<TopDash hideattivi/>*/}
          {viewPageLeadPopup === true ? <PageLeadEcp /> : null}
          {popupAddLead === true ? <AddPopupLeadSuper setPopupAddLead={setPopupAddLead} setPopupAddLeadManual={setPopupAddLeadManual} /> : null}
          {popupModifyCounterLead === true ? <PopupCounterLeadSuper setPopupModifyCounterLead={setPopupModifyCounterLead} selectUsers={selectUsers} fetchData={fetchData} /> : null}
          {popupModifyCap === true ? <PopupCap setPopupModifyCounterLead={setPopupModifyCap} selectUsers={selectUsers} fetchData={fetchData} /> : null}
          {popupClient === true ? <PopupClient /> : null}
          {popupAddLeadManual === true ? <AddLeadPopupSuper setAddOpen={() => setPopupAddLeadManual(false)} selectUserId={selectUsers._id} setClosePopup={() => setPopupAddLeadManual(false)} fetchData={fetchData}  /> : null}
          {leadDeletedPopup === true ? <LeadDeletedPopup leadDeleted={leadDeleted} setLeadDeletedPopup={() => setLeadDeletedPopup(false)} /> : null}
             <div style={{display: 'flex', justifyContent: 'space-around'}}>
              <button style={{border: 'none', margin: '20px 0'}} className='button-add-lead-super' onClick={() => setLeadDeletedPopup(true)}>Guarda i Lead cancellati</button>
              <button style={{border: 'none', margin: '20px 0'}} className='button-add-lead-super' onClick={handleLogout}>Esci</button>
              <button style={{border: 'none', margin: '20px 0'}} className='button-add-lead-super' onClick={handleClearFilter}>Pulisci filtro</button>
              <div className='wrapperwrapper' style={{display: 'flex', justifyContent: 'space-around', margin: '20px 0', gap: '3rem'}}>
                <div className="wrapper filter-data-super">
                    <div>
                      <label>Da</label>
                      <input value={!startDate ? "" : new Date(startDate).toISOString().split('T')[0]} type="date" onChange={(e) => setStartDate(e.target.valueAsDate)} />
                    </div>
                    <div>
                      <label>A</label>
                      <input value={!endDate ? "" : new Date(endDate).toISOString().split('T')[0]} type="date" onChange={(e) => setEndDate(e.target.valueAsDate)} />
                    </div>
                </div>
                <div className='counter'>
                  <h4>Lead in coda</h4>
                  <h6>{leadEntrati ? 
                  leadEntrati.filter((lead) => {
                    return lead.assigned === false;
                  }).length + leadEntratiWo.filter((lead) => {
                    return lead.assigned === false;
                  }).length
                  : '0'}</h6>
                </div>  
                <div className='counter'>
                  <h4>Lead Entrati</h4>
                  <h6>{leadEntrati ? leadEntrati.length + leadEntratiWha.length + leadEntratiWo.length : '0'}</h6>
                </div>
                <div className='counter'>
                  <h4>Lead Assegnati</h4>
                  <h6>{leadAssegnati && leadAssegnati.length > 0 ? leadAssegnati.length : '0'}</h6>
                </div>
              </div>
             </div>
             <div className='table-home-super' style={{overflowY: 'scroll', maxHeight: '60%'}}>
              <table aria-label="simple table" className="table-container" style={{overflowY: 'scroll', maxHeight: '60%'}}>
                <thead style={{ zIndex: '5', position: 'sticky', top: '-20px' }}>
                  <tr className='tr-super-thead'>
                    <th style={{ fontWeight: "600" }}>Cliente</th>
                    <th style={{ fontWeight: '600' }}>Abbonamento</th>
                    <th style={{ fontWeight: "600" }}>Lead Acquistati</th>
                    <th style={{ fontWeight: "600" }}>Status</th>
                    <th style={{ fontWeight: "600" }}>Lead Recapitati</th>
                    <th style={{ fontWeight: "600" }}>Lead Mancanti</th>
                    <th style={{ fontWeight: "600" }}>Cap Daily</th>
                    <th style={{ fontWeight: "600" }}>Rating</th>
                    <th style={{ fontWeight: "600" }}>Media</th>
                    <th style={{ fontWeight: "600" }}>CR%</th>
                    <th style={{ fontWeight: "600" }}></th>
                  </tr>
                </thead>

                <tbody style={{ color: "white", textAlign: 'left' }} className="table-body-container" id="table2lista">
                  {users && users
                    .map((row) => (
                      <tr className='tr-home-super' key={row._id} style={{margin: '10px 0'}}>
                        <td>{row.nameECP} <span style={{margin:'0 10px'}} onClick={() => handlePopupClient(row)}>Edit <FaPencilAlt size={7} /></span></td>
                        <td>{row.subscriptions[0] && row.subscriptions.length > 0 ? (row.subscriptions[0].plan.amount / 100)+ '€ / mese' : 'Nessuna iscrizione'}</td>
                        <td>{row.monthlyLeadFix ? row.monthlyLeadFix + ' / mese' : 0}</td>
                        <td className='td-status'>
                            {row.subscriptions && row.subscriptions.length > 0 ? (
                                <>
                                {isRenewalNear(row.subscriptions[0]) ? (
                                  <>
                                  <span className="status-dot pending-status">0</span> In scadenza
                                  </>
                                ): (
                                  <>
                                  <span className="status-dot active-status">0</span> Attivo
                                  </>
                                )}
                                </>
                              ) : (
                                <>
                                  <span className="status-dot blocked-status">0</span> Bloccato
                                </>
                              )}
                        </td>
                        <td>{row.leads.length}</td>
                        <td>
                          {row.monthlyLeadCounter} <span style={{margin:'0 20px'}} onClick={() => handlePopupModifyCounter(row)}>Edit <FaPencilAlt size={7} /></span>
                        </td>
                        <td>
                          {row.dailyCap ? row.dailyLead + ' / ' + row.dailyCap : 'N/a'} <span style={{margin:'0 20px'}} onClick={() => handlePopupModifyCap(row)}>Edit <FaPencilAlt size={7} /></span>
                        </td>
                        <td className="fixed-width-cell">{row.rating ? 
                                          <Rating
                                          initialRating={row.rating}
                                          emptySymbol="far fa-star"
                                          fullSymbol="fas fa-star"
                                          onClick={(value) => handleChangeRatingByTable(row, value, row.note)}
                                        />
                         : 
                         ''}</td>
                        <td style={{cursor: 'pointer'}} className="Details">{row.dailyAverage}/day</td>
                        <td  className="fixed-width-cell">{calculateConversionRate(row)}%</td>
                        <td style={{cursor: 'pointer'}} className="button-add-lead-super button2" onClick={() => handlePopupAddLead(row)}>Aggiunta lead</td>
                      </tr>
                    ))}
                </tbody>


              </table>
             </div>
            <div className='bottom-home-super'></div>
        </div>
        }

    </div>
  
  )
}

export default HomeSuper