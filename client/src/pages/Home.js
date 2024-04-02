import React, { useEffect, useState, useContext, Suspense } from "react";
import { UserContext } from "../context";
import '../components/MainDash/MainDash.scss';
import { SyncOutlined } from "@ant-design/icons";
import LeggendaEsiti from "../components/MainDash/LeggendaEsiti";
import '../components/MainDash/MainDash.scss';
import '../components/Table/Table2.scss';
const LazyMainDash = React.lazy(() => import('../components/MainDash/MainDash'));
const Home = ({ history, setNextSchedule }) => {
  const [state, setState] = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const check = () =>
      state &&
      state.user &&
    check();
  }, [state && state.user]);

  const [showLegenda, setShowLegenda] = useState(false);

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
      <div>
        <div>
          <div className={showLegenda ? "leggenda-visibile" : "leggenda-slide-cont"}>
              <LeggendaEsiti handleNotShow={() => setShowLegenda(false)} />
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyMainDash setNextSchedule={setNextSchedule} showLegenda={showLegenda} setShowLegenda={setShowLegenda} />
          </Suspense>
        </div>
      </div>
  }
  </div>
  );
};

export default Home;
