# Intego React Client

## Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The client opens at `http://localhost:5173` and expects the Django API at
`http://127.0.0.1:8000`. Change `VITE_API_URL` in `.env` when needed.

## Commands

- `npm run dev` starts the development server.
- `npm run lint` checks the source.
- `npm run build` creates a production build in `dist`.
