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
| Database | Firestore on Google Cloud Run, JSON file store locally |
| Images | Cloud Storage on Google Cloud Run, inline local storage locally |

## Project Structure

```text
community-hero/
|-- backend/
|   |-- controllers/
|   |-- db/
|   |-- routes/
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- utils/
|   `-- vite.config.js
|-- package.json
`-- README.md
```

## Prerequisites

- Node.js 18 or newer
- Google AI Studio API key
- Google Maps API key

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
ADMIN_KEY=community-hero-admin
FRONTEND_URL=http://localhost:5173
DB_PROVIDER=local
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
FIREBASE_STORAGE_BUCKET=your_cloud_storage_bucket_name
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

## Google Cloud Run Deployment

This repository includes a `Dockerfile` for a single Cloud Run service. The backend serves the API and the built frontend from the same deployed URL.

Enable required services:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com storage.googleapis.com secretmanager.googleapis.com
```

Create Firestore and a Cloud Storage bucket:

```bash
gcloud firestore databases create --database="(default)" --location=asia-south1
gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=asia-south1 --uniform-bucket-level-access
```

Deploy from the repository root:

```bash
gcloud run deploy community-hero \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,DB_PROVIDER=firestore,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,FIREBASE_STORAGE_BUCKET=YOUR_BUCKET_NAME,GEMINI_MODEL=gemini-2.5-flash
```

Set secrets for production:

```bash
gcloud secrets create community-hero-gemini-api-key --replication-policy=automatic
gcloud secrets create community-hero-admin-key --replication-policy=automatic
gcloud secrets versions add community-hero-gemini-api-key --data-file=gemini-key.txt
gcloud secrets versions add community-hero-admin-key --data-file=admin-key.txt
gcloud run services update community-hero \
  --set-secrets GEMINI_API_KEY=community-hero-gemini-api-key:latest,ADMIN_KEY=community-hero-admin-key:latest
```

The health endpoint is:

```text
YOUR_CLOUD_RUN_SERVICE_URL/health
```

## Notes

- Runtime data is stored in Firestore on Cloud Run when `DB_PROVIDER=firestore`.
- Uploaded report images are stored in the Cloud Storage bucket named by `FIREBASE_STORAGE_BUCKET`.
- Local development uses the JSON file store unless `DB_PROVIDER=firestore` is set.
- Environment files, runtime data, dependencies, and build output are intentionally ignored by Git.
