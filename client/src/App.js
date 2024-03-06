import React, {Suspense} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthRoute from "./components/routes/AuthRoute";
import Home from "./pages/Home";
import Dashboard from "./pages/dashboard";
import SuperAdminRoute from "./components/routes/SuperAdminRoute";
import CalendarM from "./pages/Calendar";
import AuthRouteWithLayout from "./components/routes/AuthRoute";
import Assistenza from "./pages/BottomSidebar/Assistenza";
import Orientatori from "./pages/Orientatori";
import Impostazioni from "./pages/BottomSidebar/Impostazioni";
import TermsCond from "./pages/TermsCond";
import './components/SideBar/Sidebar.scss';
import './App.css';
import './pages/loginRegister.css';
import Login from "./pages/Login";

const LazyRegister = React.lazy(() => import("./pages/Register"));
const LazyLoginSuperAdmin = React.lazy(() => import("./pages/LoginSuperAdmin"));
const LazyLogin = React.lazy(() => import("./pages/Login"));
const LazyHomeSuper = React.lazy(() => import("./pages/superAdmin/HomeSuper"));

function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
        }}
      />
        <Routes>
          <Route
            exact
            path="/register"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <LazyRegister />
              </Suspense>
            }
          />

          <Route
            exact
            path="/super-admin"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <LazyLoginSuperAdmin />
              </Suspense>
            }
          />

          <Route
            exact
            path="/login"
            element={
                <Login />
            }
          />  
          <Route
            exact
            path="/"
            element={<AuthRouteWithLayout component={Home} />}
          />

          <Route
            exact
            path="/dashboard"
            element={<AuthRouteWithLayout component={Dashboard} />}
            />

          <Route
            exact
            path="/termini-condizioni"
            element={<AuthRouteWithLayout component={TermsCond} />}
          />

          <Route
            exact
            path="/calendar"
            element={<AuthRouteWithLayout component={CalendarM} />}
          />

          <Route
            exact
            path="/impostazioni"
            element={<AuthRouteWithLayout component={Impostazioni} />}
          />

          <Route
            exact
            path="/orientatori"
            element={<AuthRouteWithLayout component={Orientatori} />}
          />
            <Route
              exact
              path="/assistenza"
              element={<AuthRouteWithLayout component={Assistenza} />}
            />
          <Route
            exact
            path="/super-admin/home"
            element={<SuperAdminRoute path={<LazyHomeSuper />} />}
          />
        </Routes>
    </Router>
  );
}

export default App;
