import axios from "axios";
import React, { useEffect, useState, useContext, Suspense } from "react";
import PriceCard from "../components/cards/PriceCard";
import { UserContext } from "../context";
import '../components/MainDash/MainDash.scss';
import { SyncOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import LeggendaEsiti from "../components/MainDash/LeggendaEsiti";
const LazyMainDash = React.lazy(() => import('../components/MainDash/MainDash'));
const Home = ({ history }) => {
  const [state, setState] = useContext(UserContext);
  const [prices, setPrices] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const subStatus = localStorage.getItem("sub");
  const [codeVerifyEmail, setCodeVerifyEmail] = useState('');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [emailIsVerify, setEmailIsVerify] = useState('');
  const [otherPrices, setOtherPrices] = useState([]);
  const [saltaAbbonamento , setSaltaAbbonamento] = useState('');

  useEffect(() => {
    let result = [];
    const check = () =>
      state &&
      state.user &&
      state.user.subscriptions &&
      state.user.subscriptions.map((sub) => {
        result.push(sub.plan.id);
      });
    check();
    setUserSubscriptions(result);
  }, [state && state.user]);

  useEffect(() => {
    const isPaused = () => {
      state &&
        state.user &&
        state.user.subscriptions &&
        state.user.subscriptions.resumes_at &&
        history.push("/account");
    };

    state && state.user && isPaused();
  }, [state && state.user]);

  const fetchPrices = async () => {
    const { data } = await axios.get("/prices");
    console.log(data);
    const oneTimePrices = data.filter(price => price.type === "one_time");
    const filteredPrices = oneTimePrices.filter(price => {
      return (
        price.transform_quantity &&
        price.transform_quantity.divide_by
      );
    });
    const recurringPrices = data.filter(price => price.type === "recurring");
    localStorage.setItem("prices", JSON.stringify(filteredPrices));
    localStorage.setItem("priceRecurring", JSON.stringify(recurringPrices));
    const basePrice = recurringPrices.filter(price => price.nickname == "Leadsystem - Base Minima");
    const otherPrice = recurringPrices.filter(price => price.nickname !== "Leadsystem - Base Minima");
    setOtherPrices(otherPrice);
    setPrices(basePrice);
    console.log('prezzi', recurringPrices);
  };

  const handleVerifyEmail = async () => {
    try {
      const response = await axios.post('/verify-email', {
        email: emailToVerify,
        codeVerifyEmail: codeVerifyEmail,
      });
  
      toast.success('Email verificata correttamente');
      const user = response.data.user;
      const existingToken = JSON.parse(localStorage.getItem('auth')).token;
      const emailIsVerify200 = user.codeVerifyEmail;

      const updatedAuth = {
        token: existingToken,
        user: user
      };
      setEmailIsVerify(emailIsVerify200);
      localStorage.setItem('auth', JSON.stringify(updatedAuth));
      window.location.reload();
    } catch (error) {
      console.error(error.response.data.error); 
      toast.error('Email non verificata');
    }
  };

  const handleClick = async (e, price) => {
    e.preventDefault();
    if (userSubscriptions && userSubscriptions.includes(price.id)) {
      history.push(`/${price.nickname.toLowerCase()}`);
      return;
    }
    // console.log("plan clicked", price.id);
    if (state && state.token) {
      const { data } = await axios.post("/create-subscription", {
        priceId: price.id,
      });
      window.open(data);
    } else {
      history.push("/register");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const getSubscriptions = async () => {
      const { data } = await axios.get("/subscriptions");
      setSubscriptions(data.data);
      localStorage.setItem("sub", data.data.length);
      const emailIsVerify = state.user.codeVerifyEmail;
      const salta_abbonamento = state.user.saltaAbbonamento;
      console.log(salta_abbonamento);
      setSaltaAbbonamento(salta_abbonamento);
      setEmailIsVerify(emailIsVerify);
      setIsLoading(false);
    };

        //getRequestFromFacebook();

        const getSubscriptionStatus = async () => {
          const { data } = await axios.get("/subscription-status");
          console.log("SUBSCRIPTION STATUS => ", data);
          if (data && data.length === 0) {
            history.push("/");
          } else {
            // update user in local storage
            const auth = JSON.parse(localStorage.getItem("auth"));
            auth.user = data;
            localStorage.setItem("auth", JSON.stringify(auth));
            // update user in context
            setState(auth);
          }
        };
    
        getSubscriptionStatus();

    if (state && state.token) getSubscriptions();
  }, [state && state.token]);

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleSaltaAbbonamento = async() => {
    try {
      const response = await axios.post('/salta-abbonamento', {
        email: state.user.email,
      });
      setState(prevState => ({
        ...prevState,
        user: {
          ...prevState.user,
          saltaAbbonamento: "si"
        }
      }));
      console.log(response);
      setSaltaAbbonamento("si");
    } catch (error) {
      console.error(error); 
    }
  }

  const [showLegenda, setShowLegenda] = useState(false);

  const handleClickLegenda = () => {
    setShowLegenda(!showLegenda);
  }


  return (
    <div>
    {isLoading ? 
        <div
        className="d-flex justify-content-center fw-bold"
        style={{ height: "90vh" }}
      >
          <div className="d-flex align-items-center">
            <SyncOutlined spin style={{ fontSize: "50px" }} />
          </div>
      </div>
      :
      <div className="big-container">
      {emailIsVerify === 'Verificata' ? 
      subStatus > 0 ?  
      saltaAbbonamento == 'no' ?
      <div className="MainDash-abbonamento">
        <div className="row col-md-6 offset-md-3 text-center">
          <h1 className="pt-5 fw-bold">
           Fai un piano di <font color='#3471CC'>abbonamento con i Lead</font> 
          </h1>
          <p className="lead pb-4">Scegli il tuo piano aggiuntivo.</p>
        </div>

        <div className="plan-price" style={{marginTop: '-0px'}}>
          {otherPrices &&
            otherPrices.map((price) => (
              <PriceCard
                key={price.id}
                price={price}
                handleSubscription={handleClick}
                userSubscriptions={userSubscriptions}
              />
            ))}
        </div>
        <button className="btn-orie" style={{marginTop: '50px'}} onClick={handleSaltaAbbonamento}>Salta abbonamento aggiuntivo</button>
      </div>
      :
      <div>
        <div className={showLegenda ? "leggenda-visibile" : "leggenda-slide-cont"}>
            <LeggendaEsiti handleNotShow={() => setShowLegenda(false)} />
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyMainDash showLegenda={showLegenda} setShowLegenda={setShowLegenda} />
        </Suspense>
      </div>
      : (
      <div className="MainDash-abbonamento">
        <div className="row col-md-6 offset-md-3 text-center">
          <h1 className="pt-5 fw-bold">
           Fai un piano di <font color='#3471CC'>abbonamento</font> 
          </h1>
          <p className="lead pb-4">Scegli il tuo piano per le tue esigenze, ricorda che senza abbonamento non potrai visualizzare la tabella.</p>
        </div>

        <div className="plan-price home-price-first">
          {prices &&
            prices.map((price) => (
              <PriceCard
                key={price.id}
                price={price}
                handleSubscription={handleClick}
                userSubscriptions={userSubscriptions}
              />
            ))}
        </div>
      </div>
      ) 
      :(
      <div className="form-goup" style={{margin: '0 auto', marginTop: '80px', width: '60%', textAlign: 'center'}}>
      <h2>Verifica l'email</h2>
      <input
        type="text"
        placeholder="Email"
        value={emailToVerify}
        onChange={(e) => setEmailToVerify(e.target.value)}
        className="form-control"
        style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
      />
      <input
        type="text"
        placeholder="Code"
        value={codeVerifyEmail}
        onChange={(e) => setCodeVerifyEmail(e.target.value)}
        className="form-control"
        style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
      />
      <button className="button-reg" style={{margin:'20px 0px'}}  onClick={handleVerifyEmail}>Verifica l'email</button>
    </div>
    )}
    </div>
  }
  </div>
  );
};

export default Home;
