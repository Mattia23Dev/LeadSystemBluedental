import React, { useContext } from "react";
import { Route, Redirect } from "react-router-dom";
import { UserContext } from "../../context";

const SuperAdminRoute = ({ ...rest }) => {
  const [state, setState] = useContext(UserContext);

  if (!state) {
    return <Redirect to="/super-admin" />;
  }

  return state.user.role === 'superadmin' && state && state.token ? <Route {...rest} /> : "";
};

export default SuperAdminRoute;