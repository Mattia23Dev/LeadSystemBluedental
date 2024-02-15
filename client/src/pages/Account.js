import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context";
import Sidebar from "../components/SideBar/Sidebar";
import "./account.scss";
import PriceCard from "../components/cards/PriceCard";
import { SyncOutlined } from "@ant-design/icons";
import { SidebarContext } from "../context/SidebarContext";

const Account = ({ history }) => {
  const [state, setState] = useContext(UserContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [prices, setPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const { isSidebarOpen } = useContext(SidebarContext);
  const containerStyle = {
    transition: 'width 0.3s ease',
  };

  useEffect(() => {
    const storedPrices = JSON.parse(localStorage.getItem("priceRecurring"));
    setPrices(storedPrices || []);
  }, []);

  useEffect(() => {
    console.log(prices);
  }, [prices]);

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

  const handleClick = async (e, price) => {
    e.preventDefault();
    if (userSubscriptions && userSubscriptions.includes(price.id)) {
      return;
    }
    // console.log("plan clicked", price.id);
    if (state && state.token) {
      const { data } = await axios.post("/create-subscription", {
        priceId: price.id,
        paymentMethod: paymentMethod,
      });
      console.log(data);
      window.open(data);
    } else {
      return null
    }
  };

  const getSubscriptions = async () => {
    const { data } = await axios.get("/subscriptions");
    console.log("subs => ", data.data);
    setSubscriptions(data.data);
    setIsLoading(false);
  };

  const getPayments = async () => {
    const { data } = await axios.get("/payments");
    console.log("payments => ", data.data);
    setPayments(data.data);
    localStorage.setItem("payments", JSON.stringify(data.data));
  };

  useEffect(() => {
    //setIsLoading(true);

    if (state && state.token) getSubscriptions();
    if (state && state.token) getPayments();
  }, [state && state.token]);

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  return (
    <>
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
        <div>
          <div className="plan">
            <h2>Scegli il piano adatto</h2>
            <h2>alle <font color='#3471CC'>tue esigenze</font></h2>
            <div className='plan-price'>
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
        </div>
      }
    </>
  );
};

export default Account;
