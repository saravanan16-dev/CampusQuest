# CampusQuest — Learning Intelligence System

Class-based learning platform: resources, assessments, topic-level diagnosis, targeted
practice and improvement tracking. Implements the system design in the project report
(three-tier, modular Node.js backend, MySQL, rule-based analytics).

```
client/   React (Vite) — student, teacher and admin portals
server/   Node.js + Express REST API (routes → service → SQL), JWT auth
server/db schema.sql, init.js, seed.js
```

## Run it locally

Requirements: Node 18+ and MySQL 8+.

```bash
# 1. Backend
cd server
cp .env.example .env          # set DB_PASSWORD and a long random JWT_SECRET
npm install
npm run db:init               # creates the database and tables
npm run db:seed               # optional demo data (see logins below)
npm run dev                   # API on http://localhost:4000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

### Demo logins (after `npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@campusquest.test | Admin@1234 |
| Teacher | teacher@campusquest.test | Teacher@1234 |
| Student (weak in Linked Lists) | asha@campusquest.test | Student@1234 |
| Student (Linked Lists improving) | ravi@campusquest.test | Student@1234 |
| Student | meena@campusquest.test | Student@1234 |

Change or delete these accounts before any real deployment.

## What each role can do

- **Student**: dashboard (topic accuracy, score trend, before/after change), recommendations with the
  evidence behind each flag, practice sets with instant feedback, timed assessments, result review, resources.
- **Teacher** (assigned classes only): class analytics (average by assessment, topic accuracy, learning gaps,
  per-student weak topics and drill-down), question bank with topics, assessment builder and publishing,
  resource upload.
- **Admin**: users, classes, subjects, teacher assignments, enrolments.

## Rules the analytics use (server/.env)

| Setting | Default | Meaning |
| --- | --- | --- |
| WEAK_THRESHOLD | 0.5 | Accuracy below this is weak |
| STRONG_THRESHOLD | 0.75 | Accuracy at or above this is strong |
| MIN_ATTEMPTS | 5 | Fewer answered questions on a topic is "not enough data", never flagged |
| CLASS_GAP_STUDENT_SHARE | 0.4 | A topic is a class gap if this share of assessed students is weak (or class accuracy is weak) |
| MIN_IMPROVEMENT_ATTEMPTS | 3 | Attempts needed on each side to show a before/after change |

Topic accuracy is computed from submitted assessment answers only, on demand, so every number is
traceable to stored answers. Practice attempts are stored separately and only used to avoid
re-recommending questions already answered correctly.

## API

Base path `/api/v1`, bearer-token auth. Errors are `{ code, message }`.
Auth: `POST /auth/register|login|logout`, `GET /auth/me`. Admin: `/users`, `/classes`, `/subjects`,
`/teacher-assignments`, `/classes/:id/enrollments`. Content: `/resources`, `/topics`, `/questions`,
`/practice/*`. Assessments: `/assessments`, `/assessments/:id/start|submit|publish|close`,
`/submissions/me`, `/submissions/:id`. Analytics: `/analytics/me/*`, `/recommendations/me`,
`/analytics/classes/:id/*`, `/analytics/rules`.

## Security notes

- bcrypt password hashes, JWT with expiry, login rate limiting, parameterised SQL only, zod validation on all inputs.
- Role middleware plus ownership checks (enrolment / teacher assignment) on every route.
- Answer keys are never sent to students before a submission is stored; scoring happens on the server.
- A submission and all its answers are saved in one transaction; repeat submits return the stored result.
- Set a real `JWT_SECRET`; the server refuses the default in production. Restrict `CLIENT_ORIGIN`.

## Tests

`cd server && npm test` runs the unit tests for the analytics rules (no database needed).

## Deployment

Build the client with `npm run build` (set `VITE_API_URL` to the API URL) and host `client/dist` statically.
Run the API on any Node host with a managed MySQL database; move `UPLOAD_DIR` to object storage for production.
