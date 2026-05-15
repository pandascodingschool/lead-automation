# IndiaMART CRM

A full CRM built on Node.js + Express + PostgreSQL. Receives leads from IndiaMART via webhook, auto-assigns them to sales reps, and provides a complete web interface for managing leads, notes, follow-ups, and portal automation.

---

## Tech Stack

| Layer             | Technology                 |
| ----------------- | -------------------------- |
| Server            | Node.js + Express          |
| Database          | PostgreSQL + Prisma ORM    |
| Views             | EJS templates              |
| Auth              | express-session + bcryptjs |
| WhatsApp          | Twilio API                 |
| Portal automation | Playwright (Chromium)      |

---

## Features

- **Lead intake** — IndiaMART webhook + manual lead creation from dashboard
- **Round-robin assignment** — auto-assigns leads across sales users
- **Lead detail page** — full CRM view per lead
- **Notes** — internal notes per lead with author + timestamp
- **Follow-ups** — schedule follow-ups with date/time, mark done, overdue alerts
- **Activity timeline** — append-only log of every action on a lead
- **WhatsApp notifications** — customer notified on lead assignment via Twilio
- **Portal automation** — Playwright pushes assignments to IndiaMART seller portal
- **Session auth** — login page, protected routes, 7-day sessions stored in Postgres
- **Today's follow-ups** — dashboard widget showing today's pending follow-ups

---

## Project Structure

```
indiamart-lead-automation/
├── prisma/
│   ├── schema.prisma          # DB schema — all models
│   ├── seed.js                # Seeds initial sales users
│   └── seedAdmin.js           # Creates/resets the admin login user
├── src/
│   ├── server.js              # Express entry point, session setup, route mounting
│   ├── middleware/
│   │   └── auth.js            # requireAuth / requireAdmin middleware
│   ├── routes/
│   │   ├── authRoutes.js      # GET/POST /login, GET /login/logout
│   │   ├── dashboardRoutes.js # Dashboard + user/lead CRUD
│   │   ├── leadRoutes.js      # Lead detail, notes, follow-ups
│   │   ├── portalJobsRoutes.js# Portal job list + login session control
│   │   ├── webhookRoutes.js   # POST /webhook/indiamart
│   │   └── whatsappLogsRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── leadController.js
│   │   ├── portalJobsController.js
│   │   ├── webhookController.js
│   │   └── whatsappLogsController.js
│   ├── services/
│   │   ├── leadService.js     # Assignment logic, portal job queuing
│   │   └── whatsappService.js # Twilio WhatsApp sender
│   ├── portal/
│   │   ├── config.js          # Portal URLs + Playwright selectors
│   │   ├── login.js           # CLI: manual browser login → saves session
│   │   ├── assignLead.js      # Playwright flow to assign a lead in portal
│   │   └── sessionManager.js  # Singleton: headed browser for UI-triggered login
│   ├── workers/
│   │   └── portalWorker.js    # Polls DB for pending jobs, runs Playwright
│   ├── utils/
│   │   ├── activity.js        # logActivity() helper
│   │   └── prisma.js          # Singleton Prisma client
│   └── views/
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── lead-detail.ejs
│       ├── portal-jobs.ejs
│       └── whatsapp-logs.ejs
├── sessions/                  # storageState.json (gitignored)
├── logs/                      # failure screenshots (gitignored)
├── .env.example
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/indiamart_leads"
PORT=3000
SESSION_SECRET=change-this-to-a-long-random-string

# Twilio WhatsApp (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_ENABLED=false
```

### 3. Create database

```sql
CREATE DATABASE indiamart_leads;
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

### 5. Seed data

```bash
# Create sales users
npm run db:seed

# Create admin login account (admin@crm.local / admin123)
npm run db:seed-admin
```

To use a custom admin email/password:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=yourpass ADMIN_NAME="Your Name" node prisma/seedAdmin.js
```

### 6. Start the server

```bash
npm run dev     # development (nodemon)
npm start       # production
```

Open: `http://localhost:3000` → redirects to `/login`

---

## Authentication

All UI routes require login. The webhook (`/webhook/indiamart`) is public.

| Credential | Default           |
| ---------- | ----------------- |
| Email      | `admin@crm.local` |
| Password   | `admin123`        |

> Change this immediately in production using `npm run db:seed-admin`.

**Roles:**

- `ADMIN` — full access
- `SALES` — full access (role-gating for admin-only actions coming in a future sprint)

Sessions last **7 days** and are stored in the `session` Postgres table.

---

## Pages

| URL              | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `/login`         | Sign-in page                                                  |
| `/dashboard`     | Lead table, user table, today's follow-ups, + Add Lead        |
| `/leads/:id`     | Full CRM detail: notes, follow-ups, activity timeline, status |
| `/whatsapp-logs` | All outbound WhatsApp message attempts                        |
| `/portal-jobs`   | IndiaMART portal assignment job queue                         |

---

## npm Scripts

```bash
npm run dev            # Start with nodemon (auto-reload)
npm start              # Start in production mode
npm run db:migrate     # Run Prisma migrations
npm run db:generate    # Regenerate Prisma client
npm run db:seed        # Seed initial sales users
npm run db:seed-admin  # Create/reset admin login user
npm run db:studio      # Open Prisma Studio (browser DB GUI)
npm run portal:login   # Manual IndiaMART portal login → saves session
npm run portal:worker  # Start background portal assignment worker
```

---

## Webhook API

### Receive Lead

```
POST /webhook/indiamart
Content-Type: application/json
```

**Body:**

```json
{
  "lead_id": "IND001",
  "customer_name": "Rahul Sharma",
  "mobile": "9999999999",
  "email": "rahul@gmail.com",
  "product": "Industrial Pump",
  "message": "Need quotation",
  "city": "Jaipur"
}
```

**Required:** `lead_id`, `customer_name`, `mobile`, `product`

**Responses:**

```json
{ "success": true, "leadId": "uuid", "assignedTo": "Amit Sharma", "message": "Lead created successfully" }
{ "success": false, "message": "Duplicate lead ignored" }
{ "success": false, "message": "Missing required fields: ..." }
```

### Test locally

```bash
curl -X POST http://localhost:3000/webhook/indiamart \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"TEST001","customer_name":"Rajesh Kumar","mobile":"9876543210","product":"Steel Pipes","city":"Mumbai"}'
```

### Expose via ngrok

```bash
ngrok http 3000
# Use: https://xxxx.ngrok.io/webhook/indiamart
```

---

## Lead Detail Page

Click any **customer name** (or the **View →** button) in the leads table to open `/leads/:id`.

Features on the detail page:

- **Status** — change between New / Contacted / Qualified / Closed Won / Closed Lost
- **Notes** — add internal notes; logged to activity timeline
- **Follow-ups** — schedule by date+time, mark done, overdue shown in red
- **Activity timeline** — all status changes, notes, assignments, follow-ups, WhatsApp messages
- **WhatsApp log** — delivery history for this lead
- **Assignment history** — every reassignment

---

## Portal Automation (IndiaMART)

Pushes lead assignments back to the IndiaMART seller portal using Playwright.

### First-time login

```bash
npm run portal:login
```

Opens a real browser window. Log in manually (handle OTP/captcha), then press ENTER. Session saved to `sessions/storageState.json`.

### Run the worker

```bash
npm run portal:worker
```

Polls for `PENDING` portal assignment jobs every 10 seconds and assigns leads in the portal headlessly. Failed jobs are retried up to 3 times with screenshots saved to `logs/`.

### UI login (alternative)

On the **Portal Jobs** page, use the IndiaMART Connection card to start/finish/cancel a browser login session without the CLI.

---

## WhatsApp Integration

Set `WHATSAPP_ENABLED=true` in `.env` and configure Twilio credentials. Customer receives a message when their lead is assigned.

> **Twilio Sandbox:** Every test recipient must join the sandbox by sending `join <word>` to your sandbox number once.

For production: apply for WhatsApp Business via Meta or a BSP (Interakt, WATI, etc.) and use approved message templates.

---

## Database Schema

| Model                   | Purpose                         |
| ----------------------- | ------------------------------- |
| `User`                  | Sales reps + admin accounts     |
| `Lead`                  | Customer enquiries              |
| `LeadNote`              | Internal notes on a lead        |
| `FollowUp`              | Scheduled follow-up tasks       |
| `LeadActivity`          | Append-only activity timeline   |
| `LeadAssignmentHistory` | Every reassignment record       |
| `WhatsAppLog`           | Every outbound WhatsApp attempt |
| `PortalAssignmentJob`   | Portal automation job queue     |

---

## Feature Status

- [x] Webhook lead intake + duplicate prevention
- [x] Round-robin auto-assignment
- [x] Dashboard — lead & user management
- [x] Manual lead creation from dashboard
- [x] Lead detail page
- [x] Notes per lead
- [x] Follow-ups (schedule + complete)
- [x] Activity timeline
- [x] WhatsApp customer notifications
- [x] WhatsApp logs page
- [x] IndiaMART portal automation (Playwright)
- [x] Portal job queue + retry UI
- [x] Session auth (login page, protected routes)
- [ ] Password management for sales users (sprint 2)
- [ ] Lead search + filters (sprint 2)
- [ ] Pipeline / Kanban view (sprint 2)
- [ ] Reporting & analytics (sprint 3)
