import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isDevUser } from '../../lib/devAccess';

export default function ProtectedDevRoute({ children }) {
  const { user } = useAuth();
  return isDevUser(user) ? children : <Navigate to="/admin/tiendas" replace />;
}