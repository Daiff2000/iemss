# IEMS - Vercel Services

Backend service is rooted at `backend/` and contains its own database adapter under `backend/database/init.js` so the service does not depend on files outside its root.

Required Vercel Environment Variables for the backend:
- `DATABASE_URL`
- `JWT_SECRET`

After deployment, verify `GET /api/health` returns JSON.
