# Team Task Manager

Full stack app where users register, create teams, add members, and create, assign and filter tasks.

**Live demo:** _coming soon (GCP deployment in progress)_

## Tech stack
- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, Passport (local), express-session, connect-pg-simple
- Database: PostgreSQL
- Security: bcrypt, Joi validation, helmet, HTTP-only session cookies, parameterized queries

## Features
- Register, login and logout with sessions stored in PostgreSQL
- Create teams and add members by email (team creator only)
- Create, edit, assign and delete tasks inside teams
- Filter tasks by team or assignee, and search by title
- Responsive UI
- All non-auth API routes are protected

## Setup

### Requirements
Node.js 20+ and PostgreSQL 15+

### 1. Database
```
CREATE DATABASE taskmanager;
```

### 2. Backend
```
cd backend
npm install
cp .env.example .env    # fill in your values
npm run migrate         # creates tables
npm run dev             # http://localhost:5000
```

### 3. Frontend
```
cd frontend
npm install
npm run dev             # http://localhost:5173
```
The Vite dev server proxies `/api` to the backend.

### Environment variables (`backend/.env`)
| Name | Example |
|------|---------|
| PORT | 5000 |
| DATABASE_URL | postgresql://postgres:password@localhost:5432/taskmanager |
| SESSION_SECRET | a long random string |

## API
All routes are under `/api`. Everything except `/auth/register` and `/auth/login` requires login.

| Method | Route | Description |
|--------|-------|-------------|
| POST | /auth/register | Register |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| GET | /auth/me | Current user |
| POST | /teams | Create team |
| GET | /teams | My teams |
| GET | /teams/:id/members | List members |
| POST | /teams/:id/members | Add member by email (creator only) |
| GET | /tasks | List tasks (`?team_id=&assignee_id=&search=`) |
| POST | /tasks | Create task |
| PUT | /tasks/:id | Update task |
| DELETE | /tasks/:id | Delete task |

## Deployment (GCP)
The `Dockerfile` builds the frontend and serves it from Express. It deploys to Cloud Run with Cloud SQL (PostgreSQL).

## Git workflow
Feature branches merged via pull requests: `feature/backend-setup`, `feature/database`, `feature/auth`, `feature/teams`, `feature/tasks`, `feature/frontend`, `feature/deploy`.
