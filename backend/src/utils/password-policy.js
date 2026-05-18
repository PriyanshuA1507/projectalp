import { ApiError } from './api-error.js';

const DEFAULT_MIN_PASSWORD_LENGTH = 12;
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

export const getMinPasswordLength = () => Number(process.env.MIN_PASSWORD_LENGTH || DEFAULT_MIN_PASSWORD_LENGTH);

export const validatePasswordPolicy = (password, fieldName = 'Password') => {
  const minLength = getMinPasswordLength();

  if (!password || typeof password !== 'string') {
    throw new ApiError(400, `${fieldName} is required`);
  }

  if (password.length < minLength) {
    throw new ApiError(400, `${fieldName} must be at least ${minLength} characters long`);
  }

  if (!/[A-Za-z]/.test(password)) {
    throw new ApiError(400, `${fieldName} must include at least one letter`);
  }

  if (!/\d/.test(password)) {
    throw new ApiError(400, `${fieldName} must include at least one number`);
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new ApiError(400, `${fieldName} is too common`);
  }

  return true;
};
