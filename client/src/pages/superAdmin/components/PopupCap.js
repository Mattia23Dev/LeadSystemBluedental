import React, {useState} from "react";
import axios from "axios";
import toast from "react-hot-toast";

const PopupCap = ({selectUsers, fetchData, setPopupModifyCounterLead}) => {
    const [counterValue, setCounterValue] = useState(selectUsers.dailyCap ? selectUsers.dailyCap : 0);
    const handleModifyCounter = async() => {
      try {
        const response = axios.post("/modify-daily-cap", {
          userId: selectUsers._id,
          dailyCap: counterValue,
        }).then((res) => {
          toast.success('Contatore modificato');
          fetchData();
          setPopupModifyCounterLead(false);
        })
      } catch (error) {
        console.log(error);
        toast.error('Si è verificato un errore')
      }
    }

    return(
      <div className='add-popup-lead-super'>
          <div className='top-popup-super'>
            <p onClick={() => setPopupModifyCounterLead(false)}>X</p>
            <h4>Modifica il Daily di {selectUsers !== null ? selectUsers.nameECP : null}</h4>
          </div>
          <div className='middle-popup-super'>
             <h3>Il Cap è di {selectUsers !== null ? selectUsers.dailyCap : null}</h3> 
             <input 
             type='number' 
             className='custom-file-input' 
             value={counterValue} 
             onChange={(e) => setCounterValue(parseInt(e.target.value, 10))} />
             <button onClick={handleModifyCounter}>Modifica Cap</button>
          </div>
      </div>
    )
  }

  export default PopupCap;