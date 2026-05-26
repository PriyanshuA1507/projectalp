export const ROLES = {
  IQAC_HEAD: 'IQAC Head',
  DEAN: 'Dean',
  DEPARTMENT_HOD: 'Department HOD',
  FACULTY: 'Faculty Member'
};

const ADMIN_ONLY_RESOURCES = new Set(['departments', 'programmes', 'students', 'courses']);

export const canAccessForm = (role, resourceId) => {
  if (!role || !resourceId) {
    return false;
  }

  if (role === ROLES.IQAC_HEAD) {
    return true;
  }

  if (role === ROLES.DEPARTMENT_HOD) {
    return !ADMIN_ONLY_RESOURCES.has(resourceId);
  }

  if (role === ROLES.FACULTY) {
    return false;
  }

  return false;
};

export const canAccessTable = (role, resourceId) => {
  if (!role || !resourceId) {
    return false;
  }

  if (role === ROLES.IQAC_HEAD) {
    return true;
  }

  if (role === ROLES.DEPARTMENT_HOD) {
    return !ADMIN_ONLY_RESOURCES.has(resourceId);
  }

  if (role === ROLES.FACULTY) {
    return false;
  }

  return false;
};

export const getRoleBadgeColor = (role) => {
  switch (role) {
    case ROLES.IQAC_HEAD:
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    case ROLES.DEAN:
      return 'bg-sky-100 text-sky-700 border border-sky-200';
    case ROLES.DEPARTMENT_HOD:
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case ROLES.FACULTY:
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    default:
      return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
};


export const ROLE_LABELS = {
  [ROLES.IQAC_HEAD]: 'IQAC Head',
  [ROLES.DEAN]: 'Dean',
  [ROLES.DEPARTMENT_HOD]: 'Department HOD',
  [ROLES.FACULTY]: 'Faculty Member'
};

