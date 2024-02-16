import React, { Suspense, useContext } from "react";
import { Route, Navigate } from "react-router-dom";
import { UserContext } from "../../context";
import Sidebar from "../SideBar/Sidebar";
import { SidebarContext } from "../../context/SidebarContext";

const AuthRouteWithLayout = ({ component: Component, ...rest }) => {
  const [state, setState] = useContext(UserContext);
  const { isSidebarOpen } = useContext(SidebarContext);
  
  const containerStyle = {
    transition: 'width 0.3s ease',
  };

  if (!state) {
    return <Navigate to="/login" />;
  }

  return state && state.token ? (
    <div className="big-container">
      <Sidebar />
      <div  className={`${isSidebarOpen ? 'boost-container' : 'boost-container-closed'}`} style={containerStyle}>
        <Component {...rest} />
      </div>
    </div>
  ) : (
    ""
  );
};

export default AuthRouteWithLayout;
