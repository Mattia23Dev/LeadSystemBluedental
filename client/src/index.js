import React from "react";
import { createRoot } from 'react-dom/client';
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { UserProvider } from "./context";
import { SidebarProvider } from "./context/SidebarContext";

/*if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/worker.js')
      .then((registration) => {
        console.log('Service Worker registrato con successo:', registration);
      })
      .catch((error) => {
        console.error('Errore durante la registrazione del Service Worker:', error);
      });
  });
}*/


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </UserProvider>
  </React.StrictMode>
);

reportWebVitals();
