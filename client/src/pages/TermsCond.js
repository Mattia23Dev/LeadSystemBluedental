import React from 'react'
import './orientatori.scss';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

const TermsCond = () => {
  const navigate = useNavigate();

  const indietro = () => {
    navigate('/assistenza')
  };

  return (
    <div className='termini-condizioni'>
      <div onClick={indietro} className='indietro'><AiOutlineArrowLeft /></div>
        <h2>Termini e Condizioni - Lead System</h2>
        <p>
        <strong>Definizioni:</strong><br />
 Software: Si riferisce al software di lead management denominato "Lead System".
 Cliente: Chiunque si iscriva e utilizzi il software "Lead System".
 Lead: Potenziali clienti o contatti generati attraverso il software.<br /><br />
<strong>Abbonamento e Costi:</strong><br />
 L'abbonamento mensile al software "Lead System" ha un costo di 100€ + IVA. Questo permette al cliente di utilizzare il software e collegare le proprie campagne.
 L'abbonamento con lead generation inclusa consente al cliente di ricevere e gestire autonomamente le lead attraverso gli strumenti forniti dal software, tra cui WhatsApp, gestione degli esiti, report degli esiti e delle performance.
 Il costo per lead può variare in base alla stagionalità.<br /><br />
 <strong>Rinnovo dell'Abbonamento:</strong><br />
 Sottoscrivendo l'abbonamento, il cliente accetta automaticamente il rinnovo mensile del servizio o pacchetto scelto.
 In caso di aumento del costo delle lead, il cliente ha il diritto di rescindere l'accordo o richiedere la disattivazione del servizio. La disattivazione può comportare un reso.
 Se il cliente ha gestito le lead ricevute dal rinnovo e successivamente richiede un rimborso, le lead trattate ed esitate verranno dedotte dall'importo rimborsato.
 Il cliente può disattivare l'abbonamento in qualsiasi momento attraverso le impostazioni del software.<br /><br />
 <strong>Reclami e Assistenza:</strong><br />
 Se un cliente non è soddisfatto delle lead ricevute o incontra problemi tecnici, può inviare una richiesta alle seguenti email: info@leadsystem.software o info@funnelconsulting.it.
 Per reclami o problemi legati alla privacy, si prega di scrivere a: funnel@legalmail.it.<br /><br />
 <strong>Limitazioni di Responsabilità:</strong><br />
 "Lead System" non garantisce la conversione delle lead ma garantisce sulla qualità, ovvero si impegna a portare lead interessati a corsi online. La responsabilità della gestione e conversione delle lead è interamente a carico del cliente.<br /><br />
 <strong>Variazioni dei Termini e Condizioni:</strong><br />
 "Lead System" si riserva il diritto di modificare questi termini e condizioni in qualsiasi momento. Sarà responsabilità del cliente controllare regolarmente per eventuali aggiornamenti.<br /><br />
 <strong>Legge Applicabile:</strong><br />
 Questi termini e condizioni sono regolati e interpretati in conformità con le leggi dello Stato italiano.
Accettando questi termini e condizioni, il cliente conferma di aver letto, compreso e accettato tutte le clausole sopra elencate.
        </p>
    </div>
  )
}

export default TermsCond