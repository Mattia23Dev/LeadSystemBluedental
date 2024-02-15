import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { SyncOutlined } from "@ant-design/icons";
import { UserContext } from "../context";

const StripeSuccessBoost = ({ history }) => {
  const [state, setState] = useContext(UserContext);

  const checkPaymentWaiting = async () => {
    await axios.get('/check-payment-waiting')
   .then(response => {
     console.log(response.data);
     setTimeout(() => {
      history.push("/account");
    }, 1000);
   })
   .catch(error => {
     console.error(error);
   });
   }

  useEffect(() => {

    checkPaymentWaiting();

  }, []);

  return (
    <div
      className="d-flex justify-content-center fw-bold"
      style={{ height: "90vh" }}
    >
      <div className="d-flex align-items-center">
        <SyncOutlined spin style={{ fontSize: "50px" }} />
      </div>
    </div>
  );
};

export default StripeSuccessBoost;
