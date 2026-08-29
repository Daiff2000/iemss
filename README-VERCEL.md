# IEMS — Vercel + PostgreSQL

## Stack
- Frontend: React + Vite
- API: Express 5 running as a Vercel Node Function
- Database: PostgreSQL via `pg`
- Auth: JWT + bcrypt

## Deployment
1. Create a PostgreSQL database and copy its `DATABASE_URL`.
2. Import this repository into GitHub.
3. Import the GitHub repository into Vercel.
4. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Deploy.

The Vercel build runs `database/setup-postgres.js` before building the React frontend. On an empty database it imports the supplied initial data once. If the database already has employees, it does not overwrite existing data.

## API
The API remains under the same paths used by the frontend:
- `/api/auth/*`
- `/api/employee/*`
- `/api/admin/*`
- `/api/attendance/*`
- `/api/health`

## Important
Do not run the old SQLite seed script. PostgreSQL is now the source of truth.
