const MIN_PASSWORD_LENGTH = 12;

const COMMON_PASSWORDS = new Set([
  '12345',
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'admin',
  'admin123',
  'qwerty',
  'letmein',
  'welcome',
  'welcome123',
  'dtu12345'
]);

export const getMinPasswordLength = () => MIN_PASSWORD_LENGTH;

export const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }

  if (!/[A-Za-z]/.test(password)) {
    return 'Password must include at least one letter';
  }

  if (!/\d/.test(password)) {
    return 'Password must include at least one number';
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Password is too common';
  }

  return null;
};
