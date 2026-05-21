const QUALIFICATION_LEVELS = ['undergraduate', 'postgraduate', 'phd'];

export const normalizeQualifications = (source = {}) => {
  const normalized = {
    qualification_undergraduate: source.qualification_undergraduate || '',
    qualification_postgraduate: source.qualification_postgraduate || '',
    qualification_phd: source.qualification_phd || '',
  };

  const hasNewFields = QUALIFICATION_LEVELS.some(
    (level) => normalized[`qualification_${level}`]?.trim()
  );

  if (!hasNewFields && source.qualification) {
    const legacy = String(source.qualification).toLowerCase();
    if (legacy.includes('ph')) {
      normalized.qualification_phd = 'PhD';
    } else if (legacy.includes('post') || legacy.includes('m.') || legacy.includes('master')) {
      normalized.qualification_postgraduate = 'Postgraduate';
    } else {
      normalized.qualification_undergraduate = 'Undergraduate';
    }
  }

  return normalized;
};

export const hasAnyQualification = (source = {}) => {
  const normalized = normalizeQualifications(source);
  return QUALIFICATION_LEVELS.some((level) => normalized[`qualification_${level}`]?.trim());
};

export const hasRequiredGraduation = (source = {}) => {
  const normalized = normalizeQualifications(source);
  return Boolean(normalized.qualification_undergraduate?.trim());
};
