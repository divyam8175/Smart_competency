# Frontend (Next.js)

Next.js 14 App Router frontend that captures candidate inputs, displays scorecards, and integrates with the FastAPI backend.

## Setup

```powershell
cd apps/frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (defaults to `http://localhost:8000`).

## TODO

- Build candidate list & scorecard visualizations.
- Add authenticated admin dashboard and skill graph explorer.
- Integrate video/audio upload components and insights timeline.
