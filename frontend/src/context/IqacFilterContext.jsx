import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRole, selectUser } from '../store/slices/authSlice.js';
import { ROLES } from '../config/rolePermissions.js';
import { getCurrentAcademicYear, msUntilNextKolkataDay } from '../utils/academicYears.js';

const STORAGE_KEY = 'iqac-dashboard-scope';

const IqacFilterContext = createContext(null);

const readStoredScope = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { academicYear: getCurrentAcademicYear(), departmentId: 'All' };
    const parsed = JSON.parse(raw);
    return {
      academicYear: parsed.academicYear || getCurrentAcademicYear(),
      departmentId: parsed.departmentId || 'All'
    };
  } catch {
    return { academicYear: getCurrentAcademicYear(), departmentId: 'All' };
  }
};

export function IqacFilterProvider({ children }) {
  const role = useSelector(selectRole);
  const user = useSelector(selectUser);
  const stored = readStoredScope();

  const [academicYear, setAcademicYear] = useState(stored.academicYear);
  const [departmentId, setDepartmentId] = useState(stored.departmentId);
  const [departmentLocked, setDepartmentLocked] = useState(false);

  useEffect(() => {
    if (role === ROLES.DEPARTMENT_HOD) {
      const hodDept = user?.departmentId || user?.department_id;
      if (hodDept) {
        setDepartmentId(hodDept);
        setDepartmentLocked(true);
      }
      return;
    }

    setDepartmentLocked(false);
  }, [role, user?.departmentId, user?.department_id]);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ academicYear, departmentId })
    );
  }, [academicYear, departmentId]);

  useEffect(() => {
    let timeoutId;

    const scheduleRefresh = () => {
      timeoutId = window.setTimeout(() => {
        const current = getCurrentAcademicYear();
        setAcademicYear((prev) => (prev && prev !== 'All' ? prev : current));
        scheduleRefresh();
      }, msUntilNextKolkataDay());
    };

    scheduleRefresh();
    return () => window.clearTimeout(timeoutId);
  }, []);

  const value = useMemo(
    () => ({
      academicYear,
      departmentId,
      departmentLocked,
      setAcademicYear,
      setDepartmentId
    }),
    [academicYear, departmentId, departmentLocked]
  );

  return (
    <IqacFilterContext.Provider value={value}>
      {children}
    </IqacFilterContext.Provider>
  );
}

export const useIqacFilter = () => {
  const context = useContext(IqacFilterContext);
  if (!context) {
    throw new Error('useIqacFilter must be used within IqacFilterProvider');
  }
  return context;
};
