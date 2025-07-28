// src/main.jsx

import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import Ekklesia from './pages/Ekklesia'; // AÑADIDO

import { AuthProvider } from './AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/usuario" element={<UserPage />} />
          <Route path="/ekklesia" element={<Ekklesia />} /> {/* AÑADIDO */}
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
