import React, { useState, useContext, useEffect } from 'react'
import Sidebar from '../components/SideBar/Sidebar'
import './boost.scss';
import { UserContext } from '../context';
import axios from 'axios';
import PriceOneTimeCard from '../components/cards/PriceOneTimeCard';
import toast from 'react-hot-toast';
import { SyncOutlined } from "@ant-design/icons";
import { SidebarContext } from '../context/SidebarContext';

const Boost = () => {

  const { isSidebarOpen } = useContext(SidebarContext);

  const containerStyle = {
    transition: 'width 0.3s ease',
  };

  const [prices, setPrices] = useState([]);
  const [state, setState] = useContext(UserContext);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedPrices = JSON.parse(localStorage.getItem("prices"));
    setPrices(storedPrices || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    console.log(prices);
  }, [prices]);

  const handleClick = async (e, price) => {
    e.preventDefault();
    if (userSubscriptions && userSubscriptions.includes(price.id)) {
      return;
    }
    // console.log("plan clicked", price.id);
    if (state && state.token) {
      const { data } = await axios.post("/create-payment", {
        priceId: price.id,
        numLeads: price.transform_quantity.divide_by,
      });
      window.open(data);
      toast.success("Hai acquistato correttamente il pacchetto");
    } else {
      return null
    }
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
          <div className='boost'>
            <h2 id='boosttit'>Hai bisogno di altri <font color='#3471CC'>leads ?</font>🚀</h2>
            <div className='boost-price'>
              {prices &&
                prices.map((price) => (
                  <PriceOneTimeCard
                    key={price.id}
                    price={price}
                    handleSubscription={handleClick}
                    userSubscriptions={userSubscriptions}
                  />
                ))}
            </div>
          </div>
      }
    </>
  )
}

export default Boost