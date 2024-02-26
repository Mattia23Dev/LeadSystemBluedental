import React, { useContext, useEffect, useState } from 'react'
import './LeadEntry.scss'
import recall from '../../imgs/recallGren.png';
import recGreen from '../../imgs/recPegGreen.png';
import recRed from '../../imgs/recPegRed.png';
import recYellow from '../../imgs/recPegYellow.png';
import '../MainDash/MainDash.scss';
//import { useDrag, useDrop } from 'react-dnd';
//import { MyDnDContext } from '../../context/MyDnDcontext';


// id: lead._id,
// name: lead.nome,
// surname: lead.cognome,
// email: lead.email,
// date: lead.data,
// telephone: cleanedTelephone,
// status: lead.esito,
// orientatore: lead.orientatori.nome,

export default function LeadEntry({ secref, id, index, data, handleModifyPopup, handleModifyPopupEsito, handleRowClick, campagna, etichette, selezionOrientatore }) {

  const ref = React.useRef(null);
  const [etichettaModify, setEtichettaModify] = useState(false);
  const [leadSel, setLeadSel] = useState(null);

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', JSON.stringify({ id: data }));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    //handleModifyPopup(droppedItem.id);
  };

  function isSameDate(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
    
  const createDate = new Date(data?.date);
  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const recallDate = new Date(data.recallDate);
  const normalizedRecallDate = new Date(recallDate.getFullYear(), recallDate.getMonth(), recallDate.getDate()).getTime();
  const daysSinceCreation = Math.floor((today - createDate) / (1000 * 60 * 60 * 24));

  if (data)
    return (
      <div key={index} className={data.campagna === "Mgm" ? "leadentry mgm-lead" : "leadentry"}
        ref={ref}
        draggable="true"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >

        <div className="dis">
          <p className='topnomelead'>Nome lead</p>
          <div className="top-bollettino">
            <p className='name'>{data.name}</p>
            <p 
            onClick={data?.orientatore ? null : () => selezionOrientatore(data)} 
            className={data?.orientatore ? 'iniziali' : 'iniziali redIniz'}
            >
              {data?.orientatore ? (
                    <>
                      {(() => {
                        const parts = data.orientatore.split(' ');

                        if (parts.length >= 2) {
                          const iniziali = parts[0].trim().charAt(0).toUpperCase() + parts[1].trim().charAt(0).toUpperCase();
                          return <span>{iniziali}</span>;
                        } else {
                          return "NV";
                        }
                      })()}
                    </>
                  ) : (
                    "+"
                  )}
              </p>
          </div>
          <div className="modifica" onClick={() => handleModifyPopup(data)}>+ Info</div>
          <hr style={{width: '70%'}}/>
          <div className='date-recall'>
            <p>Chiamate effettuate <span>{data.tentativiChiamata ? data.tentativiChiamata: '0'}</span></p>
          </div>
          <div className='options'>
            <div className="sposta" onClick={() => handleModifyPopupEsito(data)}>Sposta</div>
          </div>

          <div id="dragme">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-grip-vertical" viewBox="0 0 16 16"> <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /> </svg>
          </div>
        </div>
        <div className='recPeg'>
          {data?.recallDate && normalizedRecallDate < normalizedToday ?
            <img src={recRed} alt="Recall" />
            : data?.recallDate && normalizedRecallDate == normalizedToday ? 
            <img src={recYellow} alt="Recall" />
          : data?.recallDate && normalizedRecallDate > normalizedToday ?
           <img src={recGreen} alt="Recall" /> : null}
        </div>
        <div className="elim">
              <svg onClick={() => handleRowClick(data)} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M170.5 51.6L151.5 80h145l-19-28.4c-1.5-2.2-4-3.6-6.7-3.6H177.1c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80H368h48 8c13.3 0 24 10.7 24 24s-10.7 24-24 24h-8V432c0 44.2-35.8 80-80 80H112c-44.2 0-80-35.8-80-80V128H24c-13.3 0-24-10.7-24-24S10.7 80 24 80h8H80 93.8l36.7-55.1C140.9 9.4 158.4 0 177.1 0h93.7c18.7 0 36.2 9.4 46.6 24.9zM80 128V432c0 17.7 14.3 32 32 32H336c17.7 0 32-14.3 32-32V128H80zm80 64V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16z" /></svg>
        </div>
      </div>
    )
  return <></>
}
