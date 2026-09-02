import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar";
import CreatePoll from "./pages/CreatePoll";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import Admin from "./pages/Admin";

import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <NavBar />
    <Routes>
      <Route path="/" element={<CreatePoll />} />
      <Route path="/vote/:pollId" element={<Vote />} />
      <Route path="/results/:pollId" element={<Results />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
);
