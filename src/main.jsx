import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const BASE_PATH = "/AMVF2";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename={BASE_PATH}>
    <App />
  </BrowserRouter>
);
