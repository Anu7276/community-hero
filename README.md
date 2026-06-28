# Community Hero

AI-powered hyperlocal infrastructure issue reporting for citizens and local authorities.

Community Hero helps people report, verify, track, and resolve community infrastructure issues with image analysis, live updates, maps, and authority workflows.

## Features

- Image-based issue reporting with Gemini AI analysis
- AI verification, categorization, and severity scoring
- Real-time issue updates with Socket.IO
- Map-based issue discovery and clustering
- Critical issue alerts for authorities
- Hotspot detection for repeated infrastructure problems
- Reporter dashboard, gamification, and impact metrics
- Mobile-first citizen reporting flow

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Socket.IO |
| AI | Google Gemini |
| Maps | Google Maps Embed API, React Leaflet |
| Database | JSON file store |

## Project Structure

```text
community-hero/
├── backend/
│   ├── controllers/
│   ├── db/
│   ├── routes/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   └── vite.config.js
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- Google AI Studio API key
- Google Maps API key

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
PORT=5000
ADMIN_KEY=community-hero-admin
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_KEY=your_google_maps_key
```

## Install

```bash
npm run install:all
```

## Development

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Production Build

```bash
npm run build
```

## Deployment

### Backend on Render

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Add the backend environment variables in the Render dashboard.

### Frontend on Render Static Site

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add `VITE_API_URL` and `VITE_GOOGLE_MAPS_KEY` in the Render dashboard.

## Notes

- Runtime data is stored in `data/` and is intentionally ignored by Git.
- Environment files are intentionally ignored by Git.
- Build output is intentionally ignored by Git.
