import { getCurrentAcademicYear, getLastAcademicYears } from './academicYears.js';

export const getLastTenAcademicYears = () => getLastAcademicYears(10);

export const ACADEMIC_YEAR_OPTIONS = getLastTenAcademicYears();

export const ACADEMIC_YEAR_SELECT_FIELD = {
  label: 'Academic Year',
  key: 'academic_year',
  type: 'select',
  options: ACADEMIC_YEAR_OPTIONS,
  required: true,
  defaultValue: getCurrentAcademicYear(),
};
