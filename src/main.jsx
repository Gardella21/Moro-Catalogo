import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Catalogo from './pages/Catalogo'
import Login from './pages/Login'
import Admin from './pages/Admin'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/ingresar" element={<Login />} />
        <Route path="/panel" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
