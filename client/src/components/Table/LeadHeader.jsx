import React, { useContext } from 'react'
import { UserContext } from '../../context';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BiRefresh } from 'react-icons/bi';
import '../MainDash/MainDash.scss';
import './LeadEntry.scss'

export default function LeadHeader({ 
  esito, SETtoggles, toggles, filteredData, type, getOtherLeads, refreshate, getOtherLeadsOri }) {

  const [state, setState] = useContext(UserContext);
  const userId = state.user._id;
  const ref = React.useRef(null);

  const leadTypeToClassName = {
    "Da contattare": "E1",
    "Appuntamento": "E2",
    "Non risponde": "E3",
    "Da richiamare": "E4",
    "Non interessato": "E5",
    "Fissato": "E6",
    "Presentato": "E7",
    "Annullato": "E8",
    "Non presentato": "E9"
  };

  const classNameNumber = leadTypeToClassName[type] || 0;

  return (
    <div
      className={`secheader `}
      ref={ref}
      onClick={() => {
        if (type == "Da contattare")
          SETtoggles({ ...toggles, dacontattare: !toggles.dacontattare })
        else if (type == "In lavorazione")
          SETtoggles({ ...toggles, inlavorazione: !toggles.inlavorazione })
        else if (type == "Non interessato" || type == "Lead persa"){
        if (refreshate){
          if (state.user.role && state.user.role === "orientatore"){
            getOtherLeadsOri();
          } else {
            getOtherLeads();
          }
        } else {
          SETtoggles({ ...toggles, noninteressato: !toggles.noninteressato })
        }
      }
        else if (type == "Opportunità")
          SETtoggles({ ...toggles, opportunita: !toggles.opportunita })
        else if (type == "Appuntamento")
          SETtoggles({ ...toggles, appuntamento: !toggles.appuntamento })
        else if (type == "Fatturato")
          SETtoggles({ ...toggles, fatturato: !toggles.fatturato })
        else if (type == "In valutazione")
          SETtoggles({ ...toggles, invalutazione: !toggles.invalutazione })
        else if (type == "Fissato")
          SETtoggles({ ...toggles, venduto: !toggles.venduto })
          else if (type == "Non valido"){
          if (refreshate){
            getOtherLeads();
          } else {
            SETtoggles({ ...toggles, nonValido: !toggles.nonValido })
          }
        }
        else if (type == "Non presentato")
          SETtoggles({...toggles, nonPresentato: !toggles.nonPresentato})
        else if (type == "Presentato")
          SETtoggles({...toggles, presentato: !toggles.presentato})
        else if (type == "Annullato")
          SETtoggles({ ...toggles, annullato: !toggles.annullato })
          else if (type == "Non risponde")
          SETtoggles({ ...toggles, nonRisponde: !toggles.nonRisponde })
          else if (type == "Iscrizione posticipata")
          SETtoggles({ ...toggles, iscrizionePosticipata: !toggles.iscrizionePosticipata })
          else if (type == "Da richiamare")
          SETtoggles({ ...toggles, irraggiungibile: !toggles.irraggiungibile })
      }}>
      <span>{type == "Fissato" ? "Fissato" : type}</span>
      <span className={refreshate ? 'refresh-lead' : ''}>
        {refreshate ? 
        <BiRefresh size={30} /> :
        type == "Lead persa" ?
        filteredData && filteredData.filter(x => x.status == "Non interessato").length : 
        filteredData && filteredData.filter(x => x.status == type).length}
      </span>
    </div>
  )
}
