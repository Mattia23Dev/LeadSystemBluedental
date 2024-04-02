import React, { useContext, useState, useEffect, Suspense } from "react";
import "./MainDash.scss";
import { UserContext } from "../../context";
import TopDash from "./TopDash";
import { SidebarContext } from "../../context/SidebarContext";
import 'jspdf-autotable';
import Papa from 'papaparse';
import axios from "axios";
const LazyTable2 = React.lazy(() => import('../Table/Table2'));

async function notifyUser(notificationText){
  await Notification.requestPermission();
  if (!("Notification" in window)){
    alert('Browser non supporta le notifiche');
  } else if (Notification.permission === "granted"){
    const notification = new Notification('Grazie per l\'iscrizione', {
      body: notificationText,
    });
  } else if (Notification.permission !== "denied"){
    await Notification.requestPermission().then((permission) => {
      if(permission === "granted"){
        const notification = new Notification('Grazie per l\'iscrizione', {
          body: notificationText,
        });
      }
    })
  }
};

const MainDash = ({showLegenda, setShowLegenda, setNextSchedule}) => {
  const [state, setState] = useContext(UserContext);
  const [result, setResult] = useState(null);
  const [leadNum, setLeadNum] = useState('');
  const [leadNumVenduti, setLeadNumVenduti] = useState('');
  const [isMounted, setIsMounted] = useState(true);

  const publicVapidKey = "BA4JFmsO2AigZr9o4BH8lqQerqz2NKytP2nsxOcHIKbl5g98kbOzLECvxXYrQyMTfV_W7sHTUG6_GuWtTzwLlCw";

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const hasAccpeptNotification = state.user.notificationsEnabled;

  const { isSidebarOpen } = useContext(SidebarContext);
  const containerStyle = {
    transition: 'width 0.3s ease',
  }

  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleResults = (num, numVenduti) => {
    if (isMounted) {
      setLeadNum(num);
      setLeadNumVenduti(numVenduti);
    }
  };

  const generateCsvLead = () => {
    if (leadsPdf && leadsPdf.length > 0) {
      const csvData = leadsPdf.map((lead) => [lead.name, lead.surname, lead.email, lead.telephone, lead.status, lead.note, lead.orientatore, lead.date]);
      const csv = Papa.unparse({
        fields: ['Nome', 'Cognome', 'Email', 'Telefono', 'Esito', 'Note', 'Orientatore', 'Data'],
        data: csvData,
      });
      const blob = new Blob([csv], { type: "data:text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'lead.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('Non ci sono dati da esportare.');
    }
  };


const [search, SETsearch] = useState('');
const [leadsPdf , setLeadsPdf] = useState([]);

const [isEnabled, setIsEnabled] = useState(false);

const handleEnableNotifications = async () => {
    //https://leadsystem.software/worker.js
    //https://leadsystem-production.up.railway.app/api/subscribe
    await notifyUser('Riceverai notifiche quando ti saranno entrati lead!');
  try {
    const registration = await navigator.serviceWorker.register('worker.js', {
      scope: '/'
    });

    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });


      await fetch("https://leadsystem-production.up.railway.app/api/subscribe", {
        method: "POST",
        body: JSON.stringify(newSubscription),
        headers: {
          "content-type": "application/json"
        }
      }).then(async () => {
        const response = await axios.post('/enable-notifications', {
          userId: state.user._id,
          subscription: newSubscription,
        });
  
        if (response.status === 200) {
          setIsEnabled(true);
        }
  
        setState({
          ...state,
          user: {
            ...state.user,
            notificationsEnabled: response.data.notificationsEnabled
          }
        });

      });
    } else {
      const response = await axios.post('/enable-notifications', {
        userId: state.user._id,
        subscription: subscription,
      });
      
      if (response.status === 200) {
        setIsEnabled(true);
      }

      setState({
        ...state,
        user: {
          ...state.user,
          notificationsEnabled: response.data.notificationsEnabled
        }
      });

    };

    } catch (error) {
      console.error('Errore nell\'abilitazione delle notifiche:', error);
    }

};

  const rifiuta = () => {
    setState({ ...state, user: { ...state.user, notificationsEnabled: true } }); 
  }

  return (
    <>
      {hasAccpeptNotification == false && !(Notification.permission === "granted") ? 
      (
      <div className="notify" id="popupdeletelead">
        <div className="popup-top">
          <h4>Abilita le notifiche</h4>
        </div>
        <svg id="modalclosingicon" onClick={rifiuta} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" /></svg>
        <p>Non perderti nessun lead.</p>
        <p>Se non succede niente, probabilmente chrome sta bloccando le notifiche, puoi verificare <br />
        in impostazioni  / privacy e sicurezza / impostazioni sito / notifiche / su leadsystem.software <br />
        impostare le notifiche su 'Chiedi (predefinita)'. </p>
        <button className='btn-orie' onClick={handleEnableNotifications}>Abilita notifiche</button>
      </div>
      )
      :
      null
      }
      <TopDash SETsearch={SETsearch} hideattivi hideexportLeads generatePdf={generateCsvLead} showLegenda={showLegenda} setShowLegenda={setShowLegenda}/>
      <hr className="linea-filtri" />
      <div className="table-main-mobile">
        <Suspense fallback={<div>Loading...</div>}>
          <LazyTable2 setNextSchedule={setNextSchedule} onResults={handleResults} searchval={search} setLeadsPdf={setLeadsPdf} />
        </Suspense>
      </div>
    </>
  );
};

export default MainDash;
