import { getCurrentAcademicYear, getLastAcademicYears } from './academicYears.js';

export const normalizeAcademicYear = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === 'undefined') return '';

  const match = normalized.match(/^(\d{4})\D+(\d{2}|\d{4})$/);
  if (!match) return normalized;

  return `${match[1]}-${match[2].slice(-2)}`;
};

export const getAcademicYearFromAparForm = (formData = {}, fallback = '') => {
  const candidates = [
    formData?.ay,
    formData?.academic_year,
    formData?.academicYear,
    formData?.personal?.academic_year,
    formData?.personal?.academicYear
  ];

  const directValue = candidates.map(normalizeAcademicYear).find(Boolean);
  if (directValue) return directValue;

  const startDate = formData?.personal?.report_start_date;
  const endDate = formData?.personal?.report_end_date;
  if (startDate && endDate) {
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
      return `${startYear}-${String(endYear).slice(-2)}`;
    }
  }

  return normalizeAcademicYear(fallback) || getCurrentAcademicYear();
};

export const getAcademicYearBounds = (academicYear) => {
  const normalized = normalizeAcademicYear(academicYear) || getCurrentAcademicYear();
  const startYear = Number(normalized.split('-')[0]);
  const endYear = startYear + 1;

  return {
    academicYear: `${startYear}-${String(endYear).slice(-2)}`,
    startMonth: `${startYear}-08`,
    endMonth: `${endYear}-07`
  };
};

export const createAcademicYearSelectField = (academicYear) => {
  const normalized = normalizeAcademicYear(academicYear) || getCurrentAcademicYear();

  return {
    label: 'Academic Year',
    key: 'academic_year',
    type: 'select',
    className: 'appearance-none',
    options: [normalized],
    defaultValue: normalized,
    required: true,
    disabled: true,
    placeholder: normalized
  };
};

export const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

export const ACADEMIC_YEAR_OPTIONS = [
  // Provide a rolling list of recent academic years (newest first)
  ...getLastAcademicYears(10)
];

export const ACADEMIC_YEAR_SELECT_FIELD = createAcademicYearSelectField(CURRENT_ACADEMIC_YEAR);
