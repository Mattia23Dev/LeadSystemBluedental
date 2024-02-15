import React, { useContext } from "react";
import { UserContext } from "../../context";
import './PriceCard.css';

const PriceOneTimeCard = ({ price, handleSubscription, userSubscriptions }) => {
  const [state] = useContext(UserContext);

  const dynamicDescription = () => {
    if (price.nickname === "BASIC") {
      return "5 exclusice stocks";
    } else if (price.nickname === "STANDARD") {
      return "10 exclusice stocks";
    } else if (price.nickname === "PREMIUM") {
      return "20 exclusice stocks";
    }
  };

  const buttonStyle = () => {
    return price.nickname === "BASIC" ? "btn-outline-danger" : "btn-danger";
  };

  const headerStyle = () => {
    return price.nickname === "PREMIUM" ? "bg-danger text-light" : "";
  };

  const borderStyle = () => {
    return price.nickname === "PREMIUM" ? "border-danger" : "";
  };

  const buttonText = () => {
    return state && state.token ? "Buy the plan" : "Sign up";
  };

  return (
    <div className="col price-card-container">
      <div className='card'>
        <div className='top-card-price'>
          <h4>{price.nickname}</h4>
          <h2>{price.transform_quantity.divide_by}{" Lead"}</h2>
        </div>

        <div className="card-body">
          <h1 className="card-title pricing-card-title">
            {(price.unit_amount / 100).toLocaleString("it-IT")}{",00€ "}<br />
            <small className="text-muted fw-light">IVA esclusa</small>
          </h1>

          {/* <pre>{JSON.stringify(price, null, 4)}</pre> */}

          {/* <Link to="/register"> */}
          <button
            onClick={(e) => handleSubscription(e, price)}
            className='button-price-one-time'
          >
            Ottieni il boost
          </button>
          {/* </Link> */}
        </div>
      </div>
    </div>
  );
};

export default PriceOneTimeCard;
