import React, { useState, useContext } from 'react'
import Sidebar from '../../components/SideBar/Sidebar'
import './assistenza.scss';
import { UserContext } from '../../context';
import toast from 'react-hot-toast';
import axios from 'axios';
import { IoMdCall } from 'react-icons/io'
import { MdEmail } from 'react-icons/md';
import TopDash from '../../components/MainDash/TopDash';
import { SidebarContext } from '../../context/SidebarContext';

const Assistenza = () => {
  const [state, setState] = useContext(UserContext);
  const [message, setMessage] = useState("")
  const name = state.user.name;
  const email = state.user.email;

  const { isSidebarOpen } = useContext(SidebarContext);
  const containerStyle = {
    transition: 'width 0.3s ease',
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/send-email', {
        name,
        email,
        message,
      });
      console.log(response.data);
      toast.success(`Grazie ${name} per aver inviato la richiesta di assistenza, un operatore ti risponderà il prima possibile`)
      // Mostra un messaggio di successo all'utente
    } catch (error) {
      console.error(error);
      toast.error(`Scusaci ${name} si è verificato un errore`)
      // Mostra un messaggio di errore all'utente
    }
  };

  return (
    <>
      <div>
        <div className='assistenza-top'>
          <h2>Hai bisogno di <font color='#3471CC'>assistenza?</font></h2>
        </div>
        <div className='ass'>
          <div className='assistenza-bottom'>
            <div className='assistenza-bottom-item'>
              <div>
                <h4>Contatto <font color='#3471CC'>telefonico</font></h4>
                <p id='sub'>Chiamaci o scrivi su whatsapp</p>
              </div>
              <div>
                <p id='num-mail'><span><IoMdCall size={40} color='#3471CC' /></span>
                +39 351 358 3765
                </p>
              </div>
            </div>
            <div className='assistenza-bottom-item'>
              <div>
                <h4>Contatto <font color='#3471CC'>E-mail</font></h4>
              </div>
              <div>
                <p id='num-mail'><span><MdEmail size={40} color='#3471CC' /></span>
                Info@funnelconsulting.IT
                </p>
              </div>
            </div>

            <div className='assistenza-bottom-item' id='privacycookies'>
              <a href="https://www.iubenda.com/privacy-policy/90853557"
                // class="iubenda-white no-brand iubenda-noiframe iubenda-embed iubenda-noiframe " title="Privacy Policy "
                >
                Privacy
                Policy</a>

              <a href="https://www.iubenda.com/privacy-policy/90853557/cookie-policy"
                // class="iubenda-white no-brand iubenda-noiframe iubenda-embed iubenda-noiframe " title="Cookie Policy "
                >Cookie
                Policy</a>
                <a href='/termini-condizioni'>
                  Termini e condizioni
                </a>

            </div>


          </div>
        </div>
      </div>
    </>
  )
}

export default Assistenza