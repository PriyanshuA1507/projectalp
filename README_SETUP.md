# Local setup — Backend & Frontend (Windows)

This file shows the minimal commands to create an isolated Node environment, install dependencies, and run both backend and frontend locally.

Prerequisites
- Install nvm-windows (recommended) or nvm for Linux/macOS. Use Node LTS (>=18).
- A MongoDB instance (Atlas or local). Use a connection string in `MONGODB_URI`.
- Optional: Cloudinary account and Google Gemini API key (used by some features).

1) Use nvm / nvm-windows to pick Node version

PowerShell (nvm-windows):
```powershell
nvm install 18.20.0
nvm use 18.20.0
node -v
npm -v
```

2) Backend setup
```powershell
cd "c:\DTU Project\projectAlp\backend"
npm ci
copy .env.example .env   # PowerShell. Use `cp` on WSL/bash.
```

Edit `backend/.env` with your values. Minimal example:
```
PORT=8000
ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=supersecretvalue
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net
```
Note: the app appends `/apar` to `MONGODB_URI` (so do not include `/apar` in the URI).

Start the backend in dev mode:
```powershell
npm run dev
```

Seed a user (optional):
```powershell
node -r dotenv/config scripts/seed-user.js <teacherId> <email> <password> <role> [departmentId]
# Example:
node -r dotenv/config scripts/seed-user.js T100 admin@example.com StrongPass HOD
```

3) Frontend setup
```powershell
cd "c:\DTU Project\projectAlp\frontend"
npm ci
npm run dev
```

Frontend dev server defaults to `http://localhost:5173`.

4) Notes & troubleshooting
- To install exact versions use `npm ci` (uses package-lock.json).
- If ports conflict change `PORT` in `backend/.env`.
- If environment variables are not picked up, run node with dotenv: `node -r dotenv/config ./src/index.js`.

If you want, I can run the `npm ci` installs here for both projects now.
