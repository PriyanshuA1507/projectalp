export const getKolkataDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
};

/** Current Indian academic session start year (July-June), evaluated in Asia/Kolkata. */
export const getCurrentAcademicYearStart = (date = new Date()) => {
  const now = getKolkataDateParts(date);
  return now.month >= 7 ? now.year : now.year - 1;
};

export const formatAcademicYear = (startYear) => {
  const start = Number(startYear);
  return `${start}-${String(start + 1).slice(-2)}`;
};

export const getCurrentAcademicYear = (date = new Date()) => {
  return formatAcademicYear(getCurrentAcademicYearStart(date));
};

/** Last N sessions as "YYYY-YY", newest first. */
export const getLastAcademicYears = (count = 10) => {
  const startYear = getCurrentAcademicYearStart();
  const years = [];

  for (let i = 0; i < count; i += 1) {
    years.push(formatAcademicYear(startYear - i));
  }

  return years;
};

/** Dropdown options: All + last ten sessions. */
export const getSessionFilterOptions = () => ['All', ...getLastAcademicYears(10)];

export const msUntilNextKolkataDay = (date = new Date()) => {
  const parts = getKolkataDateParts(date);
  const utcForNextKolkataMidnight = Date.UTC(parts.year, parts.month - 1, parts.day + 1, -5, -30, 0, 0);
  return Math.max(60_000, utcForNextKolkataMidnight - date.getTime());
};
