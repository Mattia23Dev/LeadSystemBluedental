import React, { useContext } from "react";
import { UserContext } from "../../context";

const PriceCard = ({ price, handleSubscription, userSubscriptions }) => {
  const [state] = useContext(UserContext);

  const buttonStyle = () => {
    return userSubscriptions && userSubscriptions.includes(price.id) ? "button-active-sub" : "button-not-active-sub";
  };

  const headerStyle = () => {
    return userSubscriptions && userSubscriptions.includes(price.id) ? "header-active-sub" : "header-not-active-sub";
  };

  const borderStyle = () => {
    return userSubscriptions && userSubscriptions.includes(price.id) ? "card-active-sub" : "card-not-active-sub";
  };
  const bodyStyle = () => {
    return userSubscriptions && userSubscriptions.includes(price.id) ? "body-active-sub" : "body-not-active-sub";
  };

  const buttonText = () => {
    return state && state.token ? "Attiva adesso" : "Accedi";
  };

  return (
    <div className="col">
      <div className={`${borderStyle()}`}>
        <div className={`${headerStyle()}`}>
          <h4>{price.nickname}</h4>
          <h2>{price.transform_quantity ? price.transform_quantity.divide_by + " Lead " : " 0 Lead "}<br />{"al Mese"}</h2>
        </div>

        <div className={`${bodyStyle()}`}>
          <h1 className="card-title pricing-card-title">
            {(price.unit_amount / 100).toLocaleString("it-IT")}{",00€ /"}
            <br /><small>Mese IVA esclusa</small>
          </h1>

          {/* <pre>{JSON.stringify(price, null, 4)}</pre> */}

          {/* <Link to="/register"> */}
          <button
            onClick={(e) => handleSubscription(e, price)}
            className={`${buttonStyle()}`}
          >
            {userSubscriptions && userSubscriptions.includes(price.id)
              ? "Attivo"
              : buttonText()}
          </button>
          {userSubscriptions && userSubscriptions.includes(price.id)
              ? 
              <a href="/boost" className="link-boost-page">Ordina leads</a>
              : 
              null
              }
        </div>
      </div>
    </div>
  );
};

export default PriceCard;
