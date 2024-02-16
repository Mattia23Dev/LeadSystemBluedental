import React, { useContext } from "react";
import { Route, Navigate } from "react-router-dom";
import { UserContext } from "../../context";

const SuperAdminRoute = ({ path }) => {
  const [state, setState] = useContext(UserContext);

  if (!state) {
    return <Navigate to="/super-admin" />;
  }

  return state.user.role === 'superadmin' && state && state.token ? path : null;
};

export default SuperAdminRoute;