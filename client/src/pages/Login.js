import React, { useState, useContext, useEffect } from "react";
import Input from "../components/Input";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UserContext } from "../context";
import './loginRegister.css';
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [recoveryPasswordPopup, setRecoveryPasswordPopup] = useState(false);
  const [nextStepPopup, SetNextStepPopup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // context
  const [state, setState] = useContext(UserContext);
  const [isChecked, setIsChecked] = useState(false);
  const [emailReset, setEmailReset] = useState('');
  const [partitaIvaReset, setPartitaIvaReset] = useState('');
  const [messageReset, setMessageReset] = useState('');

  const [emailResetNext, setEmailResetNext] = useState('');
  const [codeResetNext, setCodeResetNext] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleClick = async (e) => {
    try {
      e.preventDefault();
      const { data } = await axios.post("/login", {
        email,
        password,
      });

      if (data.error) {
        toast.error('Email o Password errata');
      } else {
        setPassword("");
        if (data.user.new === true){
          setCambiaPass(true)
          setState(data);
          localStorage.setItem("auth", JSON.stringify(data));
        } else {
          setEmail("");
          setState(data);
          localStorage.setItem("auth", JSON.stringify(data));
          navigate("/");
          toast.success("Bentornato!")  
        }
      }
    } catch (err) {
      console.log(err);
      toast.error("Qualcosa è andato storto, prova più tardi.");
    }
  };

  const handleRecoveryPassword = async () => {
    try {
      const response = await axios.post('/recovery-password', {
        emailReset,
        partitaIvaReset,
      });
      setMessageReset(response.data.message);
      setRecoveryPasswordPopup(false);
      SetNextStepPopup(true);
    } catch (error) {
      setMessageReset(error.response.data.error);
    }
  };

  const handleResetPassword = async () => {
    try {
      const response = await axios.post('/reset-password', {
        emailResetNext,
        codeResetNext,
        newPassword,
      });
      console.log(response.message);
      toast.success('Hai cambiato la password, accedi!')
      SetNextStepPopup(false);
    } catch (error) {
      toast.error('Si è verificato un errore');
    }
  };

  const [cambiaPass, setCambiaPass] = useState(false);
  const handleChangePass = async () => {
    try {
      const data = await axios.post('/change-ori-password', {
        email,
        newPassword,
      });
      console.log(data);
      setState(data.data);
      localStorage.setItem("auth", JSON.stringify(data.data));
      toast.success('Hai cambiato la password, benvenuto!')
      setCambiaPass(false);
      navigate("/");
    } catch (error) {
      toast.error('Si è verificato un errore');
    }
  }

  return (
    <div className="d-flex justify-content-center login" style={{ height: "80vh" }}>
      {recoveryPasswordPopup ? (
      <div className="form-goup" style={{margin: '60px 0 0 0'}}>
        <h1 className="pt-5">Recupera <font color='#3471CC'>password</font></h1>
        <input
          type="text"
          placeholder="Email"
          value={emailReset}
          onChange={(e) => setEmailReset(e.target.value)}
          className="form-control"
          style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
        />
        <input
          type="text"
          placeholder="Partita IVA"
          value={partitaIvaReset}
          onChange={(e) => setPartitaIvaReset(e.target.value)}
          className="form-control"
          style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
        />
        <button className="button-reg" style={{margin:'20px 40px'}} onClick={handleRecoveryPassword}>Invia il codice di verifica</button>
        <button className="button-reg" style={{margin:'20px 40px'}} onClick={() => setRecoveryPasswordPopup(false)}>Chiudi</button>
        {messageReset && <p>{messageReset}</p>}
      </div>
       )  :  nextStepPopup  ? (
      <div className="form-goup" style={{margin: '80px 0 0 0'}}>
      <h2>Reset Password</h2>
      <input
        type="text"
        placeholder="Email"
        value={emailResetNext}
        onChange={(e) => setEmailResetNext(e.target.value)}
        className="form-control"
        style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
      />
      <input
        type="text"
        placeholder="Code"
        value={codeResetNext}
        onChange={(e) => setCodeResetNext(e.target.value)}
        className="form-control"
        style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
      />
      <input
        type="password"
        placeholder="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="form-control"
        style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
      />
      <button className="button-reg" style={{margin:'20px 0px'}}  onClick={handleResetPassword}>Reset Password</button>
    </div>
     ) :(
            <div className="container align-items-center d-flex">
        <div className="row col-md-6 offset-md-3 text-center">
          <h1 className="pt-5">Accedi al tuo <font color='#3471CC'>account</font></h1>
          <p className="lead pb-4">
            <a style={{color: 'black', margin: '0 50px'}} href="/register">Non hai un account?</a>
            <a style={{color: 'black', margin: '0 50px', cursor:'pointer', fontSize: '0.8rem', textDecoration: 'underline'}} onClick={() => setRecoveryPasswordPopup(true)} >Recupera password</a>
          </p>

          {!cambiaPass ? <div className="form-group">
            <Input
              label="Email"
              type="email"
              value={email}
              setValue={setEmail}
              placeholder="Inserisci la tua email.."
            />
            <Input
              label="Password"
              type="password"
              value={password}
              setValue={setPassword}
              placeholder="Inserisci la tua password.."
            />
             <label style={{width: '100%'}}>
              <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={handleCheckboxChange} 
              style={{marginBottom: '30px'}}
              />
              <font color='#3471CC'>  Memorizza</font> i dati di accesso.
            </label>
            <div>
              <button onClick={handleClick} className="button-reg">
                Accedi
              </button>
            </div> 
          </div> :
            <div className="form-group">
              <Input
                label="Cambia password"
                type="password"
                value={newPassword}
                setValue={setNewPassword}
                placeholder="Inserisci la tua password.."
              />
              <div>
                <button className="salta-login" onClick={() => {navigate('/'); toast.success('Benvenuto')}}>
                  Salta
                </button>
                <button onClick={handleChangePass} className="button-reg">
                  Cambia password
                </button>
              </div> 
            </div>}
        </div>
      </div>
      )
      }

    </div>
  );
};

export default Login;
