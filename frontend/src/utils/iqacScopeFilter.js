export const getAcademicYearVariants = (academicYear) => {
  if (!academicYear || academicYear === 'All') {
    return [];
  }

  const start = parseInt(String(academicYear).split('-')[0], 10);
  if (Number.isNaN(start)) {
    return [String(academicYear)];
  }

  const endShort = String(start + 1).slice(-2);
  const endFull = String(start + 1);

  return [...new Set([
    academicYear,
    `${start}-${endShort}`,
    `${start}-${endFull}`,
    `${start}-${start + 1}`,
    String(start),
    String(start + 1)
  ])].map(String);
};

export const matchesDepartment = (record, departmentId) => {
  if (!departmentId || departmentId === 'All') {
    return true;
  }

  const dept =
    record?.department_id ??
    record?.departmentId ??
    record?.personal?.department_id;

  if (dept == null || dept === '') {
    return false;
  }

  return String(dept) === String(departmentId);
};

export const matchesAcademicYear = (record, academicYear) => {
  if (!academicYear || academicYear === 'All') {
    return true;
  }

  const variants = new Set(getAcademicYearVariants(academicYear));
  const start = parseInt(String(academicYear).split('-')[0], 10);

  const directYearValues = [
    record?.academic_year,
    record?.ay,
    record?.year,
    record?.year_of_publication,
    record?.year_of_joining,
    record?.year_of_sanction,
    record?.year_of_qualifying,
    record?.year_of_consultancy,
    record?.year_of_training
  ].filter((value) => value != null && value !== '');

  const hasDirectYear = directYearValues.some((value) => variants.has(String(value)));

  if (hasDirectYear) {
    return true;
  }

  if (!Number.isNaN(start)) {
    if (record?.year_of_admission != null) {
      const admission = Number(record.year_of_admission);
      if (admission === start || admission === start + 1) {
        return true;
      }
    }

    if (record?.joining_date) {
      const joined = new Date(record.joining_date);
      if (!Number.isNaN(joined.getTime())) {
        const sessionStart = new Date(`${start}-07-01`);
        const sessionEnd = new Date(`${start + 1}-06-30`);
        if (joined >= sessionStart && joined <= sessionEnd) {
          return true;
        }
      }
    }

    const dateFields = [
      record?.start_date,
      record?.end_date,
      record?.date_of_filing,
      record?.date_of_event,
      record?.date_of_launching,
      record?.createdAt,
      record?.metadata?.created_at
    ];

    const hasDateMatch = dateFields.some((value) => {
      if (!value) return false;
      const year = new Date(value).getFullYear();
      return year === start || year === start + 1;
    });

    if (hasDateMatch) {
      return true;
    }
  }

  const hasYearSignal =
    directYearValues.length > 0 ||
    record?.year_of_admission != null ||
    record?.joining_date != null;

  return !hasYearSignal;
};

export const filterRecordsByScope = (records, scope = {}) => {
  if (!Array.isArray(records)) {
    return [];
  }

  const { academicYear = 'All', departmentId = 'All' } = scope;

  if ((!departmentId || departmentId === 'All') && (!academicYear || academicYear === 'All')) {
    return records;
  }

  return records.filter(
    (record) =>
      matchesDepartment(record, departmentId) &&
      matchesAcademicYear(record, academicYear)
  );
};
