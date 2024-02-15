import React, {useState} from 'react'
import './popupMotivo.css';
import vendutoImg from '../../../imgs/venduto.png';
import nonVendImg from '../../../imgs/nonvend.png';
import indietro from '../../../imgs/indietro.png';
import bonificato from '../../../imgs/bonificato.png';

const PopupMotivo = ({type, onClose, spostaLead, leadId}) => {
    const [motivo, setMotivo] = useState("");
    const [importoBonificato, setImportoBonificato] = useState("");

    const [motivoNonValidoList, setMotivoNonValidoList] = useState([
        "Linea disattivata", "Numero errato", "Lead doppione", "Lead in carico ad ateneo"
    ]);
    const [motivoLeadPersaList, setMotivoLeadPersaList] = useState([
        "Disconoscimento richiesta", "Richiesta vecchia", "Nessuna risposta",
        "Solo curiosità", "Non vuole intermediari", "Fuori budget", "Prodotto non disponibile",
        "Altro ateneo", "Difficoltà nel reperire documentazione", "Titolo straniero senza equipollenza",
        "Prevalutazione rifiutata", "Motivi familiari/lavorativi"
    ]);
    const [motivoVendutoList, setMotivoVendutoList] = useState([
        "Promozione / sconto", "Convenzione", "Prevalutazione corretta",
        "Scatto di carriera", "Titolo necessario per concorso pubblico / candidatura",
        "Tempi brevi", "Sede d’esame vicino casa", "Consulenza orientatore",
    ]);

    const motivoList = type === "Venduto" ? motivoVendutoList :
    type === "Non valido" ? motivoNonValidoList : motivoLeadPersaList;

    const saveMotivo = () => {
        if (motivo !== "") {
            if (type === "Venduto"){
              if (importoBonificato !== ""){
                spostaLead(motivo, leadId, importoBonificato, type);   
              }  else {
                window.alert('Seleziona l\'importo');
              }
            } else {   
             spostaLead(motivo, leadId, "0", type);   
            }
            
        } else {
            window.alert('Seleziona un motivo');
        }
    }

  return (
    <div className='popup-motivo'>
        <img onClick={onClose} src={indietro} />
        <div className='popup-motivo-top'>
            {type === "Venduto" ? (
                <img src={vendutoImg} />
            ) : (
                <img src={nonVendImg} />
            )}
            {type === "Venduto" ? (
             <div>   
                <h4>Lead Venduta</h4>
                <p>Lo stato della lead è stato cambiato, specifica la leva di vendita utilizzata con una delle seguenti opzioni:</p>   
             </div>
            ) : type === "Non valido" ? (
            <div>   
                <h4>Lead Non valida</h4>
                <p>Lo stato della lead è stato cambiato, specifica il motivo selezionando una delle seguenti opzioni:</p>   
             </div>
            ) : (
            <div>   
                <h4>Lead Persa</h4>
                <p>Lo stato della lead è stato cambiato, specifica il motivo selezionando una delle seguenti opzioni:</p>   
             </div>
            )}
        </div>
        <div className='choose-motivo'>
            {motivoList.map((opzione, index) => (
                <label key={index} className="radio-label">
                    <input
                    type="radio"
                    name="motivo"
                    value={opzione}
                    checked={motivo === opzione}
                    onChange={() => setMotivo(opzione)}
                    />
                    {opzione}
                </label>
            ))}
        </div>
        {type === "Venduto" && 
        <div className='fatturato'>
            <p>Inserisci importo della retta annuale</p>
            <div>
                <input
                type="number"
                value={importoBonificato}
                onChange={(e) => setImportoBonificato(e.target.value)}
                 />
                <img src={bonificato} />
            </div>
        </div>
        }
        <div className='salva-motivo'>
            <button onClick={saveMotivo}>Salva modifiche</button>
        </div>
    </div>
  )
}

export default PopupMotivo