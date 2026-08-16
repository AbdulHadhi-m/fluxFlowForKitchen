# Fluxiflow for Kitchen

> **Production-Quality Restaurant Operations Management System (ROMS) & Multi-Tenant SaaS Platform**

---

## 1. Project Overview

Fluxiflow for Kitchen is a reactive, event-driven restaurant operations management system designed to connect Front-of-House (FOH) and Back-of-House (BOH) operations in real-time. It unifies order management, table occupancy, kitchen display systems (KDS), split-tender billing, inventory recipe depletion, operational reporting, and immutable audit logging.

> **Status**: Prompt 4 Foundation Complete. Feature modules are not implemented yet. Development progresses iteratively via the approved roadmap.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 5, TypeScript 5, TailwindCSS 3.4, shadcn/ui, TanStack Query v5, Zustand, Axios, Lucide React.
- **Backend**: Python 3.11+, Django 5.x, Django REST Framework (DRF), SimpleJWT, Channels ASGI.
- **Real-Time**: Django Channels 4.x, Daphne ASGI Server, Redis 7 (Channel Layer).
- **Asynchronous Processing**: Celery 5.4+, Redis Message Broker, Celery Beat.
- **Database**: PostgreSQL 16+ (Row-Level Tenancy, JSONB snapshots, ACID transactions).
- **Infrastructure**: Docker, Docker Compose, Nginx.

---

## 3. Repository Structure

```
fluxFlowForKitchen/
├── .env.example                  # Environment configuration template
├── .editorconfig                 # Unified formatting rules
├── .gitignore                    # Git exclusions
├── docker/
│   ├── docker-compose.yml        # Development multi-container orchestration
│   ├── backend.Dockerfile        # Python 3.11 Django ASGI image
│   ├── frontend.Dockerfile       # Node 20 Vite SPA image
│   └── nginx.conf                # Reverse proxy configuration
├── backend/
│   ├── manage.py
│   ├── requirements.txt          # Python dependencies
│   ├── pytest.ini                # Pytest configuration
│   ├── config/                   # Django settings, ASGI, Celery, URLs, Routing
│   └── apps/
│       └── core/                 # Abstract Tenant models, managers, Health API
├── frontend/
│   ├── package.json              # NPM dependencies & scripts
│   ├── tsconfig.json             # TypeScript compiler settings
│   ├── vite.config.ts            # Vite bundler & proxy configuration
│   ├── tailwind.config.js        # TailwindCSS & shadcn design tokens
│   └── src/
│       ├── app/                  # Application root & providers
│       ├── components/           # UI primitives & layout
│       ├── lib/                  # Utilities & API client
│       ├── services/             # HTTP API services
│       ├── stores/               # Zustand stores
│       └── types/                # TypeScript interface contracts
└── README.md
```

---

## 4. Local Development Quickstart

### Prerequisites
- Python 3.11+
- Node.js 20+ & npm 10+
- Docker & Docker Compose (optional, for full containerized stack)

### Method A: Docker Compose (Recommended)
```bash
# 1. Clone & create environment file
cp .env.example .env

# 2. Start all services (Postgres, Redis, Backend, Celery, Frontend)
docker compose -f docker/docker-compose.yml up --build

# 3. Access applications:
# Frontend SPA: http://localhost:5173
# Backend Health API: http://localhost:8000/api/v1/health/
# Swagger API Docs: http://localhost:8000/api/docs/
```

### Method B: Native Local Development
```bash
# --- 1. Backend Setup ---
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# --- 2. Frontend Setup (New Terminal) ---
cd frontend
npm install
npm run dev
```

---

## 5. Running Tests & Quality Tooling

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests & Type Checking
```bash
cd frontend
npm run test
npm run build
```

---

## 6. Health & Verification Endpoints

- **Health Check**: `GET /api/v1/health/`
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "service": "Fluxiflow for Kitchen API",
      "version": "1.0.0-foundation",
      "dependencies": {
        "database": "healthy",
        "redis": "healthy"
      }
    }
  }
  ```
