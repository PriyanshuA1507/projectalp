export const normalizeQualifications = (source = {}) => {
  return {
    qualification_undergraduate: source.qualification_undergraduate || '',
    qualification_postgraduate: source.qualification_postgraduate || '',
    qualification_phd: source.qualification_phd || '',
  };

};

export const hasAnyQualification = (source = {}) => {
  const normalized = normalizeQualifications(source);
  return ['undergraduate', 'postgraduate', 'phd'].some(
    (level) => normalized[`qualification_${level}`]?.trim()
  );
};

export const hasRequiredGraduation = (source = {}) => {
  const normalized = normalizeQualifications(source);
  return Boolean(normalized.qualification_undergraduate?.trim());
};
