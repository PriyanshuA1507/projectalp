export const getLastTenAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 10; i++) {
    const start = currentYear - i;
    const end = String(start + 1).slice(-2);
    years.push(`${start}-${end}`);
  }
  return years;
};

export const ACADEMIC_YEAR_OPTIONS = getLastTenAcademicYears();

export const ACADEMIC_YEAR_SELECT_FIELD = {
  label: 'Academic Year',
  key: 'academic_year',
  type: 'select',
  options: ACADEMIC_YEAR_OPTIONS,
  required: true,
};
