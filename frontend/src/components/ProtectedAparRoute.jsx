import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAparIsAuthenticated } from '../store/slices/aparAuthSlice.js';

export default function ProtectedAparRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = useSelector(selectAparIsAuthenticated);
  const initializeStatus = useSelector((state) => state.aparAuth?.initializeStatus);
  const mustChangePassword = useSelector((state) => Boolean(state.aparAuth?.user?.mustChangePassword));

  if (initializeStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm font-medium text-gray-500">Checking APAR session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/apar/login" replace state={{ from: location }} />;
  }

  if (mustChangePassword) {
    return <Navigate to="/apar/login" replace state={{ from: location }} />;
  }

  return children;
}
