# IEMS — Vercel Edition

This version is prepared as a single Vercel deployment:

- React + Vite frontend
- Express 5 API as a Vercel Node Function
- PostgreSQL database
- `pg` database driver
- JWT + bcrypt authentication
- Existing `/api/*` endpoints and `.html` frontend routes preserved

## Required Vercel Environment Variables

```text
DATABASE_URL=your PostgreSQL connection string
JWT_SECRET=a-long-random-secret
NODE_ENV=production
```

During the Vercel build, `database/setup-postgres.js` creates the PostgreSQL schema. If the database is empty, it imports the supplied initial dataset from `database/initial-data.json`. If employees already exist, it leaves the database untouched.

Do not commit `.env` files or replace `JWT_SECRET` with a public value.
