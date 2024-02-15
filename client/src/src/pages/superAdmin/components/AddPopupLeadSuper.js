import React from "react";

const AddPopupLeadSuper = ({setPopupAddLead, setPopupAddLeadManual}) => {

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      console.log(file);
      // Puoi gestire il file qui, ad esempio leggere il suo contenuto o eseguire altre operazioni
    };

    return(
      <div className='add-popup-lead-super'>
          <div className='top-popup-super'>
            <p onClick={() => setPopupAddLead(false)}>X</p>
            <h4>Importa Lead</h4>
          </div>
          <div className='middle-popup-super'>
             <h3>Carica il tuo CSV</h3> 
             <input type='file' accept='.csv' className='custom-file-input' onChange={handleFileUpload} />
             <p>Formati accettati: .csv</p>
             <button>Carica file</button>
          </div>
          <div className='bottom-popup-super'>
            <h3>Oppure aggiungi un lead manualmente</h3>
            <button onClick={() => setPopupAddLeadManual(true)}>Aggiungi Manualmente</button>
          </div>
      </div>
    )
  }

  export default AddPopupLeadSuper