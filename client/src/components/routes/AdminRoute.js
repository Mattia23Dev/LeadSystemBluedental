import React, { useContext } from "react";
import { Route, Redirect } from "react-router-dom";
import { UserContext } from "../../context";

const AdminRoute = ({ ...rest }) => {
  const [state, setState] = useContext(UserContext);

  if (!state) {
    return <Redirect to="/login" />;
  }

  return state.user.role === 'admin' && state && state.token ? <Route {...rest} /> : "";
};

export default AdminRoute;