import { doubleCsrf } from 'csrf-csrf';
import { ApiError } from '../utils/api-error.js';
import { authCookieName } from '../utils/jwt.js';

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

const getSecret = () => {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, 'CSRF secret misconfigured');
  }
  return secret;
};

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret,
  getSessionIdentifier: (req) => req.cookies?.[authCookieName] || 'anonymous',
  cookieName: isProduction ? '__Host-dtu.csrf-token' : 'dtu.csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? 'None' : 'Lax',
    secure: isProduction,
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token']
});

export const csrfProtection = doubleCsrfProtection;

export const getCsrfToken = (req, res) => {
  res.status(200).json({
    statusCode: 200,
    data: {
      csrfToken: generateCsrfToken(req, res)
    },
    message: 'CSRF token generated',
    success: true
  });
};
