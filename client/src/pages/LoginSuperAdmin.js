import React, { useState, useContext } from "react";
import Input from "../components/Input";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UserContext } from "../context";
import './loginRegister.css';
import { useNavigate } from "react-router-dom";

 const LoginSuperAdmin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // context
  const [state, setState] = useContext(UserContext);

  const handleClick = async (e) => {
    try {
      e.preventDefault();
      const { data } = await axios.post("/login-superadmin", {
        email,
        password,
      });
      console.log(data);

      if (data.error) {
        toast.error(data.error);
      } else {
        setEmail("");
        setPassword("");
        setState(data);
        localStorage.setItem("auth", JSON.stringify(data));
        navigate("/super-admin/home");
        toast.success("Bentornato!")
      }
    } catch (err) {
      console.log(err);
      toast.error("Qualcosa è andato storto, prova più tardi.");
    }
  };

  return (
    <div className="d-flex justify-content-center login" style={{ height: "80vh" }}>
      <div className="container align-items-center d-flex">
        <div className="row col-md-6 offset-md-3 text-center">
          <h1 className="pt-5">Accedi al tuo account da <font color='#3471CC'>Super Amministratore</font></h1>
          <div className="form-group">
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

            <div>
              <button onClick={handleClick} className="button-reg">
                Accedi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginSuperAdmin;