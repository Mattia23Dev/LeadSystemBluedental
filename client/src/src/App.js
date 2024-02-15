import React, {Suspense} from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthRoute from "./components/routes/AuthRoute";
import Home from "./pages/Home";
import Boost from "./pages/Boost";
import Dashboard from "./pages/dashboard";
import SuperAdminRoute from "./components/routes/SuperAdminRoute";
import CalendarM from "./pages/Calendar";

const LazyRegister = React.lazy(() => import("./pages/Register"));
const LazyLoginSuperAdmin = React.lazy(() => import("./pages/LoginSuperAdmin"));
const LazyLogin = React.lazy(() => import("./pages/Login"));
const LazyTermsCond = React.lazy(() => import("./pages/TermsCond"));
const LazyLeadWA = React.lazy(() => import("./pages/LeadWA"));
const LazyStripeSuccessBoost = React.lazy(() => import("./pages/stripe-success-boost"));
const LazyAccount = React.lazy(() => import("./pages/Account"));
const LazyImpostazioni = React.lazy(() => import("./pages/BottomSidebar/Impostazioni"));
const LazyAssistenza = React.lazy(() => import("./pages/BottomSidebar/Assistenza"));
const LazyOrientatori = React.lazy(() => import("./pages/Orientatori"));
const LazyHomeSuper = React.lazy(() => import("./pages/superAdmin/HomeSuper"));
const LazyDashboardMarketing = React.lazy(() => import("./pages/superAdmin/DashboardMarketing"));
const LazyExportCsv = React.lazy(() => import("./pages/superAdmin/ExportCsv"));

function App() {
        {/*
        Eliminato le seguenti pagine che non servivano, tutta la cartella admin

        <AdminRoute exact path="/admin/lead-general" component={HomeAdmin} />
        <AdminRoute exact path="/admin/ecp" component={EcpAdmin} />
        <AdminRoute exact path="/admin/impostazioni" component={ImpostazioniAdmin} />
        <AdminRoute exact path="/admin/dashboard" component={DashboardAdmin} />
        <Route exact path="/admin/login" component={LoginAdmin} />
        <AuthRoute exact path="/stripe/cancel" component={StripeCancel} />
        <AuthRoute exact path="/faq" component={Faq} />
        <AuthRoute exact path="/stripe/success" component={StripeSuccess} />
        */}
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
        }}
      />
        <Switch>
          <Route
            exact
            path="/register"
            component={() => (
              <Suspense fallback={<div>Loading...</div>}>
                <LazyRegister />
              </Suspense>
            )}
          />

          <Route
            exact
            path="/super-admin"
            component={() => (
              <Suspense fallback={<div>Loading...</div>}>
                <LazyLoginSuperAdmin />
              </Suspense>
            )}
          />

          <Route
            exact
            path="/login"
            component={() => (
              <Suspense fallback={<div>Loading...</div>}>
                <LazyLogin />
              </Suspense>
            )}
          />  
            <AuthRoute
              exact
              path="/"
              component={() => (
                  <Home />
              )}
            />

            <AuthRoute
              exact
              path="/dashboard"
              component={() => (
                  <Dashboard />
              )}
            />

            <AuthRoute
              exact
              path="/termini-condizioni"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyTermsCond />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/leadwhatsapp"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyLeadWA />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/stripe/success/boost"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyStripeSuccessBoost />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/account"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyAccount />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/calendar"
              component={() => (
                  <CalendarM />
              )}
            />

            <AuthRoute
              exact
              path="/impostazioni"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyImpostazioni />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/orientatori"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyOrientatori />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/assistenza"
              component={() => (
                <Suspense fallback={<div>Loading...</div>}>
                  <LazyAssistenza />
                </Suspense>
              )}
            />

            <AuthRoute
              exact
              path="/boost"
              component={() => (
                  <Boost />
              )}
            />
              <SuperAdminRoute
                exact
                path="/super-admin/home"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <LazyHomeSuper />
                  </Suspense>
                )}
              />

              <SuperAdminRoute
                exact
                path="/super-admin/dash-marketing"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <LazyDashboardMarketing />
                  </Suspense>
                )}
              />
          <SuperAdminRoute exact path="/super-admin/export"
            component={() => (
              <Suspense fallback={<div>Loading...</div>}>
                <LazyExportCsv />
              </Suspense>
            )} />
        </Switch>
    </Router>
  );
}

export default App;
