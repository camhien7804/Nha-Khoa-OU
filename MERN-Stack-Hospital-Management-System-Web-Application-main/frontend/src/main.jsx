// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nextProvider } from "react-i18next";
import "./i18n.js";   

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
  </React.StrictMode>
);
