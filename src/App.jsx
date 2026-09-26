import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import OperadorLayout from './pages/OperadorLayout';
import AdminLayout from './pages/admin/AdminLayout';

// Operador Pages
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import CapturaPage from './pages/CapturaPage';
import HistorialPage from './pages/HistorialPage';
import InsumosPage from './pages/InsumosPage';

// Admin Pages
import TiendasPage from './pages/admin/TiendasPage';
import CatalogoPage from './pages/admin/CatalogoPage';
import SesionesPage from './pages/admin/SesionesPage';
import ExportarPage from './pages/admin/ExportarPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<SetupPage />} />

        {/* Operador Rutas */}
        <Route path="/operador" element={<OperadorLayout />}>
          <Route index element={<Navigate to="captura" replace />} />
          <Route path="captura" element={<CapturaPage />} />
          <Route path="historial" element={<HistorialPage />} />
          <Route path="insumos" element={<InsumosPage />} />
        </Route>

        {/* Admin Rutas */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="tiendas" replace />} />
          <Route path="tiendas" element={<TiendasPage />} />
          <Route path="catalogo" element={<CatalogoPage />} />
          <Route path="sesiones" element={<SesionesPage />} />
          <Route path="exportar" element={<ExportarPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
