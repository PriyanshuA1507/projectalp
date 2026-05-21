/** Current Indian academic session start year (July–June). */
export const getCurrentAcademicYearStart = () => {
  const now = new Date();
  const calendarYear = now.getFullYear();
  return now.getMonth() >= 6 ? calendarYear : calendarYear - 1;
};

/** Last N sessions as "YYYY-YY", newest first. */
export const getLastAcademicYears = (count = 10) => {
  const startYear = getCurrentAcademicYearStart();
  const years = [];

  for (let i = 0; i < count; i += 1) {
    const start = startYear - i;
    const end = String(start + 1).slice(-2);
    years.push(`${start}-${end}`);
  }

  return years;
};

/** Dropdown options: All + last ten sessions. */
export const getSessionFilterOptions = () => ['All', ...getLastAcademicYears(10)];
