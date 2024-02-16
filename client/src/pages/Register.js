import React, { useState, useContext } from "react";
import Input from "../components/Input";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UserContext } from "../context";
import { Link } from "react-router-dom";
import './loginRegister.css';
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameECP, setNameECP] = useState("");
  const [pIva, setPIva] = useState("");
  const [tag, setTag] = useState("");
  const [codeSdi, setCodeSdi] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [via, setVia] = useState("");
  const [legaleResponsabile, setLegaleResponsabile] = useState("");
  const [emailLegale, setEmailLegale] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };
  // context
  const [state, setState] = useContext(UserContext);

  const handleClick = async (e) => {
    if (codeSdi.length === 7 && pIva.length === 11 && password === confirmPassword) {
      try {
        e.preventDefault();
        const { data } = await axios.post("/register", {
          name,
          nameECP,
          email,
          password,
          role,
          isChecked,
          pIva,
          codeSdi,
          emailLegale,
          via,
          legaleResponsabile,
          tag,
        });
        console.log(data);
  
        if (data.error) {
          toast.error(data.error);
        } else {
          setName("");
          setEmail("");
          setPassword("");
          toast.success(
            `Hey ${data.user.name}. Ti sei registrato con successo!`
          );
          setState(data);
          localStorage.setItem("auth", JSON.stringify(data));
          if (data.user.role === 'admin') {
            navigate('/admin/lead-general')
          } else {
            navigate("/");
          }
        }
      } catch (err) {
        console.log(err);
        toast.error("Something went wrong. Try again");
      }
    } else {
      toast.error('Inserisci un corretto codice sdi, partita iva o conferma la tua password')
    };
  };

  const handleTagChange = (event) => {
    setTag(event.target.value);
  };

  return (
    <div className="d-flex justify-content-center register" style={{ height: "80vh" }}>
      <div className="container align-items-center d-flex">
        <div className="row col-md-6 offset-md-3 text-center">
          <h1 className="pt-5"><font color='#3471CC'>Registrati</font> ora</h1>
          <p className="lead pb-4">
            o accedi al tuo <a href="/login" className="a-login">account</a>
          </p>

          <div className="form-group">
            <Input
              label="Email *"
              type="email"
              value={email}
              setValue={setEmail}
              placeholder="Inserisci il tuo indirizzo email.."
              required
            />
             <Input 
              label="Nome *" 
              placeholder="Nome personale" 
              value={name} 
              setValue={setName} 
              required
            />
            <Input 
              label="Ragione Sociale *" 
              placeholder="Nome azienda s.r.l." 
              value={nameECP} 
              setValue={setNameECP} 
              required
            />
            <Input
              label="P.IVA *"
              type="number"
              value={pIva}
              setValue={setPIva}
              placeholder="Inserisci la P.IVA"
              required
            />
            <Input 
              label="CODICE UNIVOCO *" 
              placeholder="Inserisci SDI" 
              value={codeSdi} 
              setValue={setCodeSdi} 
              required
            />
            <Input 
              label="Legale responsabile *" 
              placeholder="Inserisci" 
              value={legaleResponsabile} 
              setValue={setLegaleResponsabile} 
              required
            />
            <Input 
              label="SEDE LEGALE *" 
              placeholder="Inserisci la sede legale" 
              value={via} 
              setValue={setVia} 
              required
            />
            <Input 
              label="Mail amministrazione *" 
              placeholder="Inserisci email legale" 
              value={emailLegale} 
              setValue={setEmailLegale} 
              required
            />
            <Input
              label="Password *"
              type="password"
              value={password}
              setValue={setPassword}
              placeholder="Inserisci la tua password.."
              required
            />
            <Input
              label="Conferma Password *"
              type="password"
              value={confirmPassword}
              setValue={setConfirmPassword}
              placeholder="Conferma la tua password.."
              required
            />
            {/*<label>
              <h2>Quali Lead vuoi ricevere?</h2>
              <select value={tag} onChange={handleTagChange}>
                <option value="">Seleziona un'opzione</option>
                <option value="opzione1">Opzione 1</option>
                <option value="opzione2">Opzione 2</option>
                <option value="opzione3">Opzione 3</option>
              </select>
  </label>*/}
            <label style={{width: '100%'}}>
              <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={handleCheckboxChange} 
              style={{marginBottom: '30px'}}
              required
              />
                &nbsp;Ho letto e accettato i&nbsp;
                <a href="https://www.iubenda.com/privacy-policy/90853557/cookie-policy" class="iubenda-white no-brand iubenda-noiframe iubenda-embed iubenda-noiframe " title="Cookie Policy ">Cookie Policy</a>
              &nbsp;e le&nbsp;
              <a href="https://www.iubenda.com/privacy-policy/90853557" class="iubenda-white no-brand iubenda-noiframe iubenda-embed iubenda-noiframe " title="Privacy Policy ">Privacy Policy</a>
            </label>

            <div>
              <button onClick={handleClick} className="button-reg">
                Crea account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
