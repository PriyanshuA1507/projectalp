# DTU APAR / IQAC Security Audit Report

## Overview

This document explains the security vulnerabilities identified in the DTU APAR / IQAC system, the risks associated with them, and the fixes implemented to secure the application.

This report can be used for:

* Security documentation
* Viva preparation
* Project handover
* Internal audit
* Developer onboarding

---

# Table of Contents

1. System Scope
2. Critical Vulnerabilities
3. High / Medium Severity Issues
4. Security Architecture After Fixes
5. New Files Added
6. Packages Installed
7. Modified Files
8. Environment Variables
9. Secure Authentication Flow
10. Deployment Checklist
11. Future Improvements
12. OWASP Attack Mapping
13. Final Viva Summary

---

# 1. System Scope

| Area                      | File / Route                                 |
| ------------------------- | -------------------------------------------- |
| APAR Login UI             | `frontend/src/components/AparLogin.jsx`      |
| APAR Login API            | `POST /api/v1/apar/auth/login`               |
| IQAC Login UI             | `frontend/src/pages/Auth/Login.jsx`          |
| APAR Data APIs            | `/api/v1/apar/mongo/*`                       |
| Authentication Middleware | `backend/src/middlewares/auth.middleware.js` |

---

# 2. Critical Vulnerabilities

---

# 2.1 Unauthenticated Password Reset

## Issue

The system exposed public password reset endpoints:

```http
POST /api/v1/apar/auth/forgot-password
POST /api/v1/auth/forgot-password
```

Anyone could reset a password using only a Teacher ID or User ID.

No:

* OTP verification
* Email verification
* Existing password validation
* Admin approval

was required.

Frontend also encouraged resetting passwords to:

```text
12345
```

---

## Example Attack

Attacker sends:

```http
POST /api/v1/apar/auth/forgot-password
```

```json
{
  "teacherId": "FAC101",
  "newPassword": "hack123"
}
```

Result:

* Faculty account hijacked
* Unauthorized login possible

---

## Risk

### Account Takeover

Attacker could:

* Read APAR forms
* Submit fake evaluations
* Modify records
* Access confidential faculty data

---

## Fix Applied

### Removed Public Password Reset APIs

Deleted:

* `/apar/auth/forgot-password`
* `/auth/forgot-password`

---

### Removed "Forgot Password?" UI

Removed from:

* `AparLogin.jsx`
* `Login.jsx`

---

### Secure Password Change Flow

Password changes now require:

* Logged-in session
* Existing password
* Valid JWT token

Endpoint:

```http
POST /api/v1/apar/auth/change-password
```

---

### Admin-Only User Provisioning

Users can only be created using:

```http
POST /api/v1/auth/register
```

with:

```http
x-provision-token: ADMIN_PROVISION_TOKEN
```

---

# 2.2 Authentication Bypass Header

## Issue

Middleware contained:

```js
if (req.headers['x-bypass-auth-redirect']) {
   return next();
}
```

This completely bypassed authentication.

---

## Why It Was Dangerous

Frontend used:

```http
X-Bypass-Auth-Redirect: 1
```

to avoid redirect loops.

But any attacker could send the same header.

---

## Example Attack

```http
GET /api/v1/apar/mongo/forms
```

with:

```http
X-Bypass-Auth-Redirect: 1
```

Result:

* Protected APIs accessible without login

---

## Risk

### Broken Access Control

Unauthorized users could access secured APIs.

---

## Fix Applied

Removed bypass logic entirely.

Now:

* JWT verification is mandatory
* Frontend handles redirect behavior separately

---

# 2.3 Weak Default Password (12345)

## Issue

Default password:

```text
12345
```

Minimum password length:

* Only 5 characters

Auto-created accounts used weak passwords.

---

## Example Attack

Attacker tries:

```text
12345
```

on multiple faculty accounts.

If users never changed passwords:

* Accounts compromised

---

## Risk

### Mass Account Compromise

---

## Fix Applied

### Strong Password Policy

Added:

```text
backend/src/utils/password-policy.js
```

Rules:

* Minimum 12 characters
* Must contain letters
* Must contain numbers
* Common passwords blocked

---

## Weak Password Examples

```text
12345
password
admin123
```

---

## Strong Password Example

```text
DtuFaculty2026!
```

---

## Mandatory Password Change

Added field:

```js
must_change_password: true
```

Users must update passwords before dashboard access.

---

## Auto-Provisioning Disabled in Production

```env
ALLOW_AUTO_PROVISION=false
```

---

# 2.4 IDOR Vulnerability

## What is IDOR?

### Insecure Direct Object Reference

A user changes an ID in a request and accesses another user's data.

---

## Issue

Backend trusted:

```js
req.body.faculty_id
```

without validating ownership.

---

## Example Attack

Faculty A sends:

```json
{
  "faculty_id": "FACULTY_B"
}
```

Result:

* Faculty B’s APAR data exposed

---

## Risk

### Unauthorized Access to Confidential Data

---

## Fix Applied

Created:

```text
backend/src/utils/apar-access.js
```

Functions:

* `resolveFacultyIdForRequest()`
* `assertFacultyAccess()`
* `buildListFormsQuery()`

---

## Before

```js
AparForm.find({ faculty_id: req.body.faculty_id })
```

---

## After

```js
assertFacultyAccess(req.user, faculty_id)
```

---

# 2.5 Session Validation Missing

## Issue

JWT signatures were validated, but database sessions were ignored.

Logout did not invalidate stolen tokens.

---

## Example Attack

Attacker steals JWT cookie.

Victim logs out.

Attacker still accesses APIs until JWT expires.

---

## Fix Applied

Every request now validates:

* JWT signature
* Session token matches DB
* Session not expired

---

## Secure Logout

Logout clears:

* `session_token`
* `session_expires_at`

---

# 3. High / Medium Severity Issues

---

# 3.1 No Rate Limiting

## Issue

Unlimited login attempts allowed brute-force attacks.

---

## Example

Bot attempts:

```text
admin1
admin2
admin3
...
```

thousands of times.

---

## Fix Applied

Added:

```text
express-rate-limit
```

Limits:

* Global → 300 requests / 15 min
* Auth routes → 20 attempts / 15 min

---

# 3.2 Large Request Body (DoS Risk)

## Issue

Server accepted:

```js
50mb
```

JSON payloads.

Attackers could overload memory.

---

## Fix Applied

Reduced body size:

```env
JSON_BODY_LIMIT=2mb
```

---

# 3.3 Missing Security Headers

## Issue

No protection against:

* XSS
* Clickjacking
* MIME sniffing

---

## Fix Applied

Added:

```js
helmet()
```

---

# 3.4 Weak CORS Policy

## Issue

Requests without Origin headers were accepted.

Potentially allowed malicious websites.

---

## Fix Applied

Production now only allows configured origins.

Example:

```env
ORIGIN=http://localhost:5173
```

---

# 3.5 No CSRF Protection

## What is CSRF?

A malicious website tricks a logged-in user's browser into sending authenticated requests.

---

## Example Attack

Victim logged into APAR.

Malicious website silently sends:

```http
POST /api/v1/apar/mongo/submit
```

Browser automatically sends cookies.

---

## Fix Applied

Added:

```text
csrf-csrf
```

using Double Submit Cookie pattern.

---

## CSRF Flow

### Step 1

Frontend requests:

```http
GET /api/v1/csrf-token
```

---

### Step 2

Frontend sends:

```http
X-CSRF-Token: <token>
```

for all mutating requests.

---

# 3.6 listAllForms Data Exposure

## Issue

Any authenticated user could access all APAR forms.

---

## Before

```js
AparForm.find({ ay })
```

---

## After

Access restricted by role:

* Faculty → own forms only
* Reporting officer → assigned faculty only
* Reviewing officer → assigned faculty only

---

# 3.7 localStorage Authentication Misuse

## Issue

Frontend stored:

```js
localStorage.setItem('apar_auth_session', 'true')
```

This is not real security.

---

## Fix Applied

Real authentication now uses:

* httpOnly cookies
* JWT validation
* Database session validation

localStorage used only for UI state.

---

# 3.8 Role Selection in Frontend

## Issue

User selected role from UI dropdown.

Potential risk if backend trusted frontend role blindly.

---

## Fix Applied

Backend validates role using:

```js
canLoginAsRole()
```

---

# 3.9 Account Enumeration

## Issue

Password reset responses leaked valid users.

Example:

```text
Faculty not found
```

vs

```text
Password reset successful
```

---

## Fix Applied

Public reset removed.

Login now returns generic message:

```text
Invalid credentials
```

---

# 3.10 Weak Socket.IO Authentication

## Issue

Socket connections accepted even with invalid JWT.

Fallback secret:

```js
secret
```

was insecure.

---

## Fix Applied

Now:

* JWT required
* JWT_SECRET mandatory
* Invalid token rejected

---

# 4. Security Architecture After Fixes

# Login Flow

```text
1. Frontend fetches CSRF token
2. User submits login
3. Backend validates credentials
4. JWT generated
5. JWT stored in DB session
6. httpOnly cookie set
7. User accesses secured APIs
```

---

# Protected API Validation

Every request validates:

```text
✔ JWT signature valid
✔ Session token matches DB
✔ Session not expired
✔ CSRF token valid
✔ Role authorized
✔ faculty_id ownership verified
```

---

# 5. New Files Added

| File                                 | Purpose                |
| ------------------------------------ | ---------------------- |
| `password-policy.js`                 | Password validation    |
| `apar-access.js`                     | IDOR prevention        |
| `csrf.middleware.js`                 | CSRF validation        |
| `rate-limit.middleware.js`           | Brute-force protection |
| `must-change-password.middleware.js` | Force password updates |
| `validate.middleware.js`             | Zod validation         |
| `apar-auth.validator.js`             | API schemas            |
| `frontend/src/utils/csrf.js`         | Fetch CSRF token       |

---

# 6. Packages Installed

| Package            | Purpose          |
| ------------------ | ---------------- |
| helmet             | Security headers |
| express-rate-limit | Rate limiting    |
| zod                | Input validation |
| csrf-csrf          | CSRF protection  |

---

# 7. Main Files Modified

## Backend

```text
app.js
auth.middleware.js
aparAuth.controller.js
auth.controller.js
apar.auth.routes.js
auth.routes.js
apar.mongo.controller.js
user.model.js
users.data-access.js
jwt.js
socket.js
```

---

## Frontend

```text
AparLogin.jsx
Login.jsx
aparAuth.service.js
auth.service.js
Api.js
aparAuthSlice.js
main.jsx
```

---

# 8. Environment Variables

## Backend

```env
JWT_SECRET=<long-random-secret>
CSRF_SECRET=<long-random-secret>

ORIGIN=http://localhost:5173

PORT=8000
AUTH_RATE_LIMIT_MAX=20
RATE_LIMIT_MAX=300
MIN_PASSWORD_LENGTH=12
SESSION_TTL_MS=43200000
JSON_BODY_LIMIT=2mb

ADMIN_PROVISION_TOKEN=<secret>

ALLOW_AUTO_PROVISION=false
```

---

## Frontend

```env
VITE_BASEURL=http://localhost:8000/api/v1
```

---

# 9. Deployment Checklist

Before deployment:

* [ ] Set JWT_SECRET
* [ ] Set CSRF_SECRET
* [ ] Configure ORIGIN
* [ ] Set ADMIN_PROVISION_TOKEN
* [ ] Keep ALLOW_AUTO_PROVISION=false
* [ ] Restart backend after middleware changes
* [ ] Force users to login again
* [ ] Configure WAF / reverse proxy

---

# 10. Future Improvements

| Feature                   | Benefit                 |
| ------------------------- | ----------------------- |
| MFA                       | Stronger login security |
| OTP reset                 | Secure recovery         |
| Redis rate limiting       | Multi-server scaling    |
| Audit logging             | Security monitoring     |
| Password breach detection | Detect leaked passwords |

---

# 11. OWASP Attack Mapping

| Attack                | Before          | After              |
| --------------------- | --------------- | ------------------ |
| Brute Force           | Unlimited login | Rate limiting      |
| DoS                   | 50MB bodies     | 2MB limits         |
| Broken Authentication | Auth bypass     | JWT validation     |
| Broken Access Control | IDOR            | Access validation  |
| CSRF                  | None            | Double-submit CSRF |
| Weak Passwords        | 12345           | Strong policy      |

---

# 12. Final Viva Summary

The APAR / IQAC system initially contained critical security vulnerabilities:

* Public password reset without verification
* Authentication bypass using custom headers
* Weak default passwords
* IDOR vulnerabilities exposing faculty records
* JWT sessions not tied to database validation

These vulnerabilities could result in:

* Account takeover
* Unauthorized data access
* Broken authentication
* Data leakage
* Brute-force attacks

The system was secured by:

* Removing public password reset
* Removing auth bypass logic
* Enforcing strong passwords
* Binding JWT to database sessions
* Adding role-based access control
* Adding CSRF protection
* Adding rate limiting
* Hardening CORS configuration
* Adding Helmet security headers

The updated architecture now follows secure authentication and authorization practices aligned with OWASP recommendations.
