/**
 * Personal Data Validation Utilities for APAR Form Part I
 */

/**
 * Calculate age from date of birth
 * @param {string} dateOfBirth - DOB in YYYY-MM-DD format
 * @returns {number} Age in years
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate Date of Birth
 * @param {string} dateOfBirth - DOB in YYYY-MM-DD format
 * @returns {object} { valid: boolean, error: string | null }
 */
export const validateDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) {
    return { valid: false, error: 'Date of birth is required' };
  }

  const dobDate = new Date(dateOfBirth);
  const today = new Date();

  // Check if DOB is in the future
  if (dobDate > today) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }

  // Check if faculty age is greater than 18 years
  const age = calculateAge(dateOfBirth);
  if (age < 18) {
    return { valid: false, error: 'Faculty must be at least 18 years old' };
  }

  return { valid: true, error: null };
};

/**
 * Validate Employment/Joining Date
 * @param {string} joiningDate - Joining date in YYYY-MM-DD format
 * @param {string} dateOfBirth - DOB in YYYY-MM-DD format (optional for additional validation)
 * @returns {object} { valid: boolean, error: string | null }
 */
export const validateJoiningDate = (joiningDate, dateOfBirth = null) => {
  if (!joiningDate) {
    return { valid: false, error: 'Joining date is required' };
  }

  const joiningDateObj = new Date(joiningDate);
  const today = new Date();

  // Check if joining date is in the future
  if (joiningDateObj > today) {
    return { valid: false, error: 'Joining date cannot be in the future' };
  }

  // Check if joining date is after DOB
  if (dateOfBirth) {
    const dobDate = new Date(dateOfBirth);

    if (joiningDateObj < dobDate) {
      return { valid: false, error: 'Joining date cannot be before date of birth' };
    }

    // Check if joining date is after 18 years of age (DOB + 18 years)
    const ageEligibilityDate = new Date(dobDate);
    ageEligibilityDate.setFullYear(ageEligibilityDate.getFullYear() + 18);

    if (joiningDateObj < ageEligibilityDate) {
      return { valid: false, error: 'Employee must be at least 18 years old at the time of joining' };
    }
  }

  return { valid: true, error: null };
};

/**
 * Validate all personal data fields
 * @param {object} personal - Personal data object
 * @returns {object} { valid: boolean, errors: { field: string, message: string }[] }
 */
export const validatePersonalData = (personal = {}) => {
  const errors = [];

  // Validate DOB
  if (personal.date_of_birth) {
    const dobValidation = validateDateOfBirth(personal.date_of_birth);
    if (!dobValidation.valid) {
      errors.push({ field: 'date_of_birth', message: dobValidation.error });
    }
  }

  // Validate Joining Date
  if (personal.joining_date) {
    const joiningValidation = validateJoiningDate(personal.joining_date, personal.date_of_birth);
    if (!joiningValidation.valid) {
      errors.push({ field: 'joining_date', message: joiningValidation.error });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
};

/**
 * Get validation error message for a specific field
 * @param {string} field - Field name
 * @param {object} validationErrors - Validation errors array from validatePersonalData
 * @returns {string | null} Error message or null
 */
export const getFieldError = (field, validationErrors = []) => {
  const error = validationErrors.find(err => err.field === field);
  return error ? error.message : null;
};
