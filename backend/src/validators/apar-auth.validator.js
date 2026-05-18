import { z } from 'zod';

const nonEmptyString = (fieldName) => z.string().trim().min(1, `${fieldName} is required`);

export const authLoginSchema = z.object({
  body: z.object({
    email: nonEmptyString('Email'),
    password: nonEmptyString('Password'),
    role: nonEmptyString('Role')
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const aparLoginSchema = z.object({
  body: z.object({
    email: nonEmptyString('Email'),
    password: nonEmptyString('Password'),
    role: nonEmptyString('Role'),
    academic_year: z.string().trim().optional().nullable()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: nonEmptyString('Old password'),
    newPassword: nonEmptyString('New password')
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const verifyRoleSchema = z.object({
  body: z.object({
    role: nonEmptyString('Role')
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});
