import React from 'react'
import { BsArrowReturnLeft } from "react-icons/bs";

const LeggendaEsiti = ({handleNotShow}) => {
  return (
    <div className="legenda-container">
        <div className="leggenda-top">
        <BsArrowReturnLeft className="indietro-icona"/>
        <p>Leggenda esiti</p>
        </div>  
        <div className="esiti-list">
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Da contattare</p>
                <p>Lead appena entrata, ancora non c’è stato un primo contatto</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>In lavorazione</p>
                <p>C’è stato un dialogo con la lead che è rimasto aperto e avete fissato una recall</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Non risponde</p>
                <p>Le lead che non rispondono fino al terzo tentativo di chiamata</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Irraggiungibile</p>
                <p>Lead che necessita della 4 chiamata da altro operatore con numero di telefono differente</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Non valido</p>
                <p>Numero di telefono sbagliato, Linea telefonica disabilitata, lead doppione, lead contattato da altro ateneo</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Lead persa</p>
                <p>Lead non interessato all’offerta formativa, lead curioso, lead con il quale per qualche ragione non è possibile finalizzare la vendita, lead che non ha risposto alla 4 chiamata</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Opportunità</p>
                <p>La lead è interessata ad acquistare e che deve inoltrarvi la documentazione per la valutazione</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>In valutazione</p>
                <p>vi è stato uno scambio di documentazione tra la lead e l’ECP, avete inoltrato la documentazione per l’immatricolazione</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Venduto</p>
                <p>Pagamento avvenuto</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Iscrizione posticipata</p>
                <p>Lead che ha espresso la volontà di iscriversi al nuovo anno accademico (es. Luglio)</p>
                </div>
            </div>
        </div> 
        <div className='btn-dentro-legenda'>
            <button onClick={handleNotShow}>Indietro</button>
        </div>
    </div>  
  )
}

export default LeggendaEsiti