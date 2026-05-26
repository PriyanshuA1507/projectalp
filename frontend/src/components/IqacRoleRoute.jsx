import React from 'react';
import { useSelector } from 'react-redux';
import { ROLES } from '../config/rolePermissions.js';
import { selectInitializeStatus, selectRole } from '../store/slices/authSlice.js';
import AccessDenied from './AccessDenied.jsx';

const ALLOWED_IQAC_ROLES = new Set([ROLES.IQAC_HEAD, ROLES.DEAN, ROLES.DEPARTMENT_HOD]);

export default function IqacRoleRoute({ children }) {
  const role = useSelector(selectRole);
  const initializeStatus = useSelector(selectInitializeStatus);

  if (initializeStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm font-medium text-gray-500">Checking access...</span>
      </div>
    );
  }

  if (!ALLOWED_IQAC_ROLES.has(role)) {
    return <AccessDenied message="Only IQAC Head, Dean, and Department HOD accounts can access the IQAC section." />;
  }

  return children;
}
