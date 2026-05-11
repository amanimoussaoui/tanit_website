# Tanit Talent AI

Full-stack recruitment platform: **React (Vite) + Express + Prisma + PostgreSQL + FastAPI** (AI microservice).

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ with a database named **`tanit`**
- Python 3.12+ (for the AI service)

### Database

Create the database (name matches Prisma `DATABASE_URL`):

```sql
CREATE DATABASE tanit;
```

Default local connection (see `backend/.env`):

`postgresql://postgres:admin123@localhost:5433/tanit`

## Quick start (local)

### 1. Backend

```bash
cd backend
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API: `http://localhost:3001` — health: `GET /health`

### User space API contract

- `POST /api/auth/register` (roles accepted: `candidat`, `recruteur`, `admin`)
- `POST /api/auth/login`
- `GET /api/users/me` (JWT required)
- `PUT /api/users/me` (JWT required)
- `GET /api/users` (admin only)
- `DELETE /api/users/:id` (admin only)

### 2. AI service (FastAPI)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional: copy `ai-service/.env.example` to `ai-service/.env` and set **`OPENROUTER_API_KEY`** ([OpenRouter](https://openrouter.ai/)) so the chat widget uses a real LLM instead of the built-in rule-based replies. You can set **`OPENROUTER_MODEL`** (e.g. `openai/gpt-4o-mini`).

### 3. Frontend

```bash
cd frontend
npm ci
npm run dev
```

App: `http://localhost:5173` — API calls are proxied to the backend in dev.

Optional: `frontend/.env` with `VITE_API_URL=http://localhost:3001` (Socket.io + absolute API if needed).

## Demo accounts (after seed)

| Role     | Email                 | Password     |
|----------|----------------------|--------------|
| Employer | employer@tanit.demo  | password123  |
| Candidate| candidate@tanit.demo | password123  |

## Docker Compose (Windows / Linux)

### Prérequis

1. Installer [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows : activer WSL 2 si proposé).
2. Vérifier dans un terminal : `docker --version` et `docker compose version`.

### Variables d’environnement (optionnel)

À la racine du dépôt, copier [docker-compose.env.example](docker-compose.env.example) vers `.env` et renseigner au besoin :

- **OpenRouter** (`OPENROUTER_API_KEY`, etc.) pour le service FastAPI dans Compose.
- **SMTP** (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, …) pour les e-mails envoyés par le backend (candidatures / décisions).

Compose injecte automatiquement ces variables dans les services (voir [docker-compose.yml](docker-compose.yml)).

### Démarrage

À la racine du dépôt (`website/`) :

```bash
docker compose up --build
```

Ou en arrière-plan :

```bash
docker compose up --build -d
```

**Windows (PowerShell)** — script qui construit, démarre et vérifie le health du backend :

```powershell
.\scripts\docker-stack.ps1
```

Avec données de démo (après les conteneurs OK) :

```powershell
.\scripts\docker-stack.ps1 -Seed
```

Ou manuellement :

```bash
docker compose exec backend npx --yes tsx prisma/seed.ts
```

### URLs (ports exposés sur la machine hôte)

| Service    | URL |
|------------|-----|
| Frontend (nginx) | http://localhost:5173 |
| API          | http://localhost:3001 — `GET /health` |
| FastAPI      | http://localhost:8000/docs |
| PostgreSQL   | `localhost:5432` (utilisateur `postgres`, mot de passe `admin123`, base `tanit`) |

**Attention :** en développement sans Docker, Vite utilise souvent le port **5174** ([frontend/vite.config.ts](frontend/vite.config.ts)). Avec Docker, le frontend est servi sur **5173** ; le backend Compose définit `FRONTEND_ORIGIN=http://localhost:5173` pour le CORS.

### Arrêt

```bash
docker compose down
```

Pour supprimer aussi les volumes Postgres : `docker compose down -v`.

### Dépannage

- **Ports déjà utilisés** (3001, 5173, 5432, 8000) : libérer le port ou modifier les mappages dans `docker-compose.yml`.
- **Logs** : `docker compose logs backend`, `docker compose logs postgres`, `docker compose logs frontend`.

En production, changez `JWT_SECRET`, les secrets Postgres et la configuration CORS.

## Project layout

- `frontend/` — React 18, Tailwind v4, Radix/shadcn-style UI, Zustand, TanStack Query, Framer Motion, Socket.io client
- `backend/` — Express 5, JWT in httpOnly cookies, Prisma 5, Multer (PDF CV), Socket.io
- `ai-service/` — FastAPI: `/score`, `/match`, `/chat`, `/suggestions/:userId`
