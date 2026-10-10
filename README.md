# 🛡️ Community Hero

> **AI-Powered Hyperlocal Civic Infrastructure Reporting & Resolution Platform**  
> Empowering citizens and local authorities to detect, verify, map, and resolve community infrastructure challenges using Google Gemini AI, real-time WebSockets, and geospatial intelligence.

[![Live App](https://img.shields.io/badge/Live_App-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://community-hero-oxtx.onrender.com)
[![Status](https://img.shields.io/badge/Deployment-Healthy-success?style=for-the-badge)](https://community-hero-oxtx.onrender.com/health)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemini_1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Stack](https://img.shields.io/badge/Stack-React_18_+_Node.js-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)

---

## 🌐 Live Deployments

- **Live Application (Frontend & Backend)**: [https://community-hero-oxtx.onrender.com](https://community-hero-oxtx.onrender.com)
- **Service Health Check**: [https://community-hero-oxtx.onrender.com/health](https://community-hero-oxtx.onrender.com/health)
- **GitHub Repository**: [https://github.com/Anu7276/community-hero](https://github.com/Anu7276/community-hero)

---

## 🧠 Platform Mind Map

The mind map below illustrates the end-to-end ecosystem of Community Hero across its core operational pillars:

```mermaid
mindmap
  root((Community Hero))
    Citizen Experience
      Image & Video Reporting
      GPS Auto-Geocoding
      Voice Audio Input
      Community Upvoting & Verification
      WhatsApp & Social Sharing
      Bilingual Hindi & English UI
    AI Intelligence Engine
      Google Gemini 1.5 Flash Multimodal
      Visual Issue Detection
      Fake & Duplicate Guard
      Severity Scoring: Low to Critical
      Department Routing Recommendation
      Fix Cost & Duration Estimator
    Geospatial & Real-Time
      Leaflet Interactive Map
      Haversine Proximity Clustering
      Hotspot Recurrence Detection
      Socket.IO Instant Feed Broadcast
    Authority Command Center
      Role-Based Admin Access
      Critical Issue Escalation Alerts
      Status Lifecycle: Pending to Resolved
      Before & After Photo Verification
    Cloud & System Resilience
      Docker Multi-Stage Build
      Self-Healing Auto-Recovery DB
      Dual Storage: Cloud Storage or Inline
      Zero-Downtime Container Startup
```

---

## 🏛️ System Architecture

Community Hero is packaged as a production-hardened full-stack application. A single high-performance Docker container serves the optimized React 18 client alongside the Express API and Socket.IO engine.

```mermaid
graph TD
    subgraph Client["Client Layer (Vite + React 18)"]
        UI["Citizen Web Application"]
        AdminUI["Authority Command Dashboard"]
        Map["Leaflet GIS Map Engine"]
        SockClient["Socket.IO Client"]
    end

    subgraph Server["Application Server (Node.js + Express)"]
        Router["Express Gateway & Rate Limiter"]
        Health["/health Readiness Probe"]
        Static["Static File Server (dist/)"]
        SockServer["Socket.IO Event Engine"]
        GeminiCtrl["Gemini AI Controller"]
        DBLayer["Resilient Data Access Layer"]
    end

    subgraph External["External Cloud & AI Services"]
        Gemini["Google Gemini 1.5 Flash API"]
        Firestore["Google Cloud Firestore (Optional)"]
        GCS["Google Cloud Storage Bucket (Optional)"]
        LocalDB["Local Auto-Recovery JSON DB (Fallback)"]
    end

    UI -->|"HTTP REST Requests"| Router
    AdminUI -->|"x-admin-key Auth"| Router
    UI <-->|"Real-Time Push Updates"| SockClient
    SockClient <-->|"WebSockets"| SockServer

    Router --> Static
    Router --> Health
    Router --> GeminiCtrl
    Router --> DBLayer

    GeminiCtrl -->|"Multimodal Image Analysis"| Gemini
    DBLayer -->|"Primary Cloud Storage"| Firestore
    DBLayer -->|"Image Assets"| GCS
    DBLayer -.->|"Safe Fallback on DB Miss"| LocalDB
    DBLayer -->|"Trigger Realtime Events"| SockServer
```

---

## 🔄 Issue Lifecycle & State Machine

Every report progresses through an automated pipeline from citizen capture to field verification and civic resolution:

```mermaid
stateDiagram-v2
    [*] --> Submitted: Citizen submits photo + GPS
    
    state Submitted {
        [*] --> AI_Analysis
        AI_Analysis --> Validated: Authentic Issue Confirmed
        AI_Analysis --> Rejected: Fake / Unclear / Not An Issue
    }

    Rejected --> [*]
    
    Validated --> Pending: Issue registered & broadcast via WebSocket
    
    state Pending {
        [*] --> CommunityVoting
        CommunityVoting --> AutoVerified: Upvotes >= 5
    }

    AutoVerified --> In_Progress: Authority claims task
    Pending --> In_Progress: Authority claims directly
    
    state In_Progress {
        [*] --> RepairExecution
        RepairExecution --> UploadResolutionPhoto: Field team fixes issue
    }
    
    UploadResolutionPhoto --> Resolved: Before & After Proof attached
    Resolved --> [*]
```

---

## ⚡ AI Analysis & Reporting Sequence

When a citizen snaps an infrastructure defect, the multimodal Gemini pipeline inspects the image within seconds:

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen / User
    participant App as React Frontend
    participant API as Express Backend
    participant AI as Gemini 1.5 Flash
    participant DB as Resilient DB
    participant WS as Socket.IO
    actor Authority as Municipal Authority

    Citizen->>App: Captures image & GPS coordinates
    App->>API: POST /api/analyze (multipart/form-data)
    Note over API: Memory stream, no disk write
    API->>AI: generateContent([Prompt, ImageBase64])
    Note over AI: Visual Analysis, Urgency Scoring, Department Routing
    AI-->>API: Structured JSON assessment
    API->>DB: addIssue(validatedPayload)
    DB-->>API: Saved issue with unique ID
    API->>WS: io.emit('issue:new', issue)
    WS-->>App: Broadcasts live alert to all citizens
    WS-->>Authority: Pushes critical alert if Severity == CRITICAL
    API-->>App: 200 OK + AI Insights Payload
    App-->>Citizen: Displays immediate verification card & timeline
```

---

## 🧩 Hotspot & Clustering Logic

To identify chronic systemic failures (e.g. repeated road craters or pipe bursts), Community Hero employs the **Haversine Geodetic Formula**:

```mermaid
flowchart LR
    A["New Issue Reported (lat1, lon1)"] --> B["Query Active Issues in DB"]
    B --> C{"Haversine Distance <= 150m?"}
    C -- "Yes" --> D["Cluster into Existing Hotspot"]
    D --> E["Increment Cluster Severity & Recurrence Count"]
    E --> F["Escalate Hotspot to Municipal Ward Officer"]
    C -- "No" --> G["Create New Geo-Spatial Node"]
```

$$\text{distance} = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

---

## 🧰 Technology Matrix

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive mobile-first citizen UI, glassmorphic status badges |
| **Maps & GIS** | Leaflet, React-Leaflet, Google Maps Embed API | Geospatial visualization, clustering, interactive markers |
| **Backend** | Node.js, Express.js | High-throughput REST API, rate limiting, multipart handling |
| **Real-Time** | Socket.IO | Instant feed updates, live upvoting counter, authority alerts |
| **Artificial Intelligence** | Google Gemini 1.5 Flash (`@google/generative-ai`) | Multimodal vision analysis, severity scoring, fraud detection |
| **Persistence** | Auto-Recovery Local JSON / Firestore | Resilient hybrid database with automatic fallback recovery |
| **Media Storage** | Cloud Storage / Data URI Fallback | Dual image hosting mode ensuring 100% upload success |
| **Containerization** | Docker (Alpine Node 20) | Multi-stage production build packaging client and server |
| **Hosting** | Render / Google Cloud Run | Zero-configuration cloud hosting with automated SSL |

---

## 📂 Project Directory Structure

```text
community-hero/
├── backend/
│   ├── controllers/
│   │   └── geminiController.js   # Multimodal prompt & Gemini model client
│   ├── db/
│   │   └── init.js               # Dual-mode resilient database (Firestore + JSON)
│   ├── routes/
│   │   ├── analyze.js            # Image upload, rate limiting & AI workflow
│   │   └── issues.js             # CRUD, voting, comments, hotspots & authority stats
│   ├── package.json              # Backend dependencies & scripts
│   └── server.js                 # Express server, Socket.IO, static asset host
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, BottomNav, Map, Timeline, LiveUpdates
│   │   ├── hooks/                # useGeolocation, useSocket, useVoice, useLanguage
│   │   ├── pages/                # Dashboard, ReportIssue, MapView, IssueDetail, Authority
│   │   ├── utils/                # api.js, reverseGeocode.js, formatDate.js
│   │   ├── App.jsx               # Client routes & error boundaries
│   │   └── main.jsx              # React DOM initialization
│   ├── vercel.json               # SPA routing rewrite configuration
│   ├── vite.config.js            # Vite build configuration & dev proxy
│   └── package.json              # Frontend dependencies
├── Dockerfile                    # Multi-stage production container definition
├── package.json                  # Root monorepo orchestrator
└── README.md                     # Architecture documentation
```

---

## 📡 API Reference

### Health & System
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Container liveness and readiness probe |
| `GET` | `/` | Web application root (serves React SPA) |

### AI Analysis & Reporting
| Method | Endpoint | Payload / Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/analyze` | `multipart/form-data` (`image`, `userContext`, `userLat`, `userLng`) | Executes Gemini multimodal audit, registers issue, emits WebSocket event |

### Civic Issues
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/issues` | Retrieve all issues (supports filtering by `status`, `category`) |
| `GET` | `/api/issues/:id` | Fetch single issue details, timeline, and comments |
| `POST` | `/api/issues/:id/vote` | Cast an upvote or downvote with session deduplication |
| `PATCH` | `/api/issues/:id/status` | Update issue state (`x-admin-key` header required) |
| `POST` | `/api/issues/:id/resolve-photo` | Attach resolved verification photo and mark completed |
| `GET` | `/api/issues/meta/hotspots` | Fetch Haversine proximity clusters and repeat problem zones |
| `GET` | `/api/issues/meta/stats` | Aggregate civic health metrics, resolution rate, and reporter rank |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Google AI Studio API Key**: [Get a Gemini API Key](https://aistudio.google.com/)

### 2. Clone and Install
```bash
git clone https://github.com/Anu7276/community-hero.git
cd community-hero
npm run install:all
```

### 3. Environment Setup

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
ADMIN_KEY=community-hero-admin
FRONTEND_URL=http://localhost:5173
DB_PROVIDER=local
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_KEY=your_optional_maps_key
```

### 4. Launch Development Servers
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

---

## 🐳 Production Deployment

### Option A: Render (Zero Configuration — Recommended)
1. Fork or push this repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your repository.
4. Select Environment: **Docker**.
5. Add environment variable: `GEMINI_API_KEY` = your API key.
6. Render builds the multi-stage Docker image and deploys instantly!

### Option B: Google Cloud Run
Deploy directly from source using the Google Cloud CLI:

```bash
gcloud run deploy community-hero \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,GEMINI_MODEL=gemini-1.5-flash
```

---

## 🔒 Security & Resilience Features

- **Port Fast-Binding**: Express binds to `$PORT` immediately upon boot, eliminating 503 container startup drops.
- **Fail-Safe Storage**: Automatic fallback to local in-memory/JSON storage if cloud credentials or Firestore are missing.
- **Rate Limiting**: Built-in 15-second IP cooldown preventing Gemini API quota exhaustion.
- **Role-Based Admin Protection**: Authority status changes secured via `x-admin-key` validation.
- **Sanitized Media Handling**: Strictly validated MIME types and in-memory buffer processing without disk vulnerabilities.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
