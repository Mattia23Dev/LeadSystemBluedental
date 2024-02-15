import React, {useState} from "react";

const FontiModal = ({saveOrganizzazione, setModalOrg, organizzazione}) => {
    const [selectedOption, setSelectedOption] = useState(organizzazione && organizzazione);
  
    const handleOptionSelect = (option) => {
      setSelectedOption(option);
    };

    const fonti = ["Google", "Meta Web", "Meta Lead", "Ads"]
    return (
      <div className='modal-fonti-container'>
        <div className='modal-organizzazione'>
          <span onClick={() => setModalOrg(false)}>x</span>
          <h4>Fonte</h4>
          <p>Seleziona filtro</p>
            <ul className='mo-list'>
            {fonti &&
                fonti.map((opzione, index) => (
                  <li key={index}>
                    <label>
                      <input
                        type="radio"
                        name="opzioni"
                        value={opzione}
                        checked={selectedOption && selectedOption === opzione}
                        onChange={() => handleOptionSelect(opzione)}
                      />
                      {opzione}
                    </label>
                  </li>
                ))}
            </ul>
            <button onClick={() => saveOrganizzazione(selectedOption)}>Salva</button>
        </div>
      </div>
    )
  };

  export default FontiModal;