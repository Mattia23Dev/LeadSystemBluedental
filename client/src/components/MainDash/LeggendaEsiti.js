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
                <p>Lead appena entrata, ancora da lavorare</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Non risponde</p>
                <p>L’ho provato a contattatare ma non risponde, posso richiamare fino a 5 tentativi</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Da richiamare</p>
                <p>Mi ha risposto, ma ho ripreso appuntamento per risentirlo/a.</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Lead persa</p>
                <p>Oltre i 6 tentativi di chiamata</p>
                </div>
            </div>
            <div className="esiti-item">
                <span>0</span>
                <div>
                <p>Fissato</p>
                <p>Fissato appuntamento con il cliente</p>
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