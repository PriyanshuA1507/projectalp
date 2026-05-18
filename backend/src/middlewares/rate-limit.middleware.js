import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const globalRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: toPositiveInt(process.env.RATE_LIMIT_MAX, 300),
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again later.'
  }
});
