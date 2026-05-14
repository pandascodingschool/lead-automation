# IndiaMART Lead Automation — POC

Automatically receives, stores, and assigns IndiaMART leads without manual intervention.

---

## Tech Stack

- **Node.js + Express** — HTTP server and routing
- **PostgreSQL** — persistent storage
- **Prisma ORM** — schema management and DB access
- **Twilio WhatsApp API** — automated customer notifications

---

## Project Structure

```
indiamart-lead-automation/
├── prisma/
│   ├── schema.prisma        # DB schema (User, Lead models)
│   └── seed.js              # Seeds initial users
├── src/
│   ├── server.js            # Express entry point
│   ├── routes/
│   │   └── webhookRoutes.js # Route definitions
│   ├── controllers/
│   │   └── webhookController.js  # Request validation and response
│   ├── services/
│   │   └── leadService.js   # Business logic (duplicate check, assignment)
│   └── utils/
│       └── prisma.js        # Singleton Prisma client
├── .env.example
├── .env                     # Local config (not committed)
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/indiamart_leads"
PORT=3000
```

> Make sure PostgreSQL is running and the database `indiamart_leads` exists.

Create the database if it doesn't exist:

```sql
CREATE DATABASE indiamart_leads;
```

### 3. Run Prisma migration

```bash
npm run db:migrate
```

### 4. Seed users

```bash
npm run db:seed
```

This creates 4 sales users: Amit Sharma, Priya Verma, Rahul Singh, Neha Gupta.

### 5. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:3000`

---

## API Reference

### Health Check

```
GET /health
```

Response:

```json
{ "status": "ok", "timestamp": "2026-05-13T..." }
```

---

### Receive Lead (Webhook)

```
POST /webhook/indiamart
Content-Type: application/json
```

**Request Body:**

```json
{
  "lead_id": "IND123",
  "customer_name": "Pankaj",
  "mobile": "9999999999",
  "email": "pankaj@test.com",
  "product": "Industrial Pump",
  "message": "Need pricing details",
  "city": "Jaipur"
}
```

**Required fields:** `lead_id`, `customer_name`, `mobile`, `product`

**Success Response (201):**

```json
{
  "success": true,
  "leadId": "uuid-generated-id",
  "assignedTo": "Amit Sharma",
  "message": "Lead created successfully"
}
```

**Duplicate Response (200):**

```json
{
  "success": false,
  "message": "Duplicate lead ignored"
}
```

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Missing required fields: lead_id, customer_name, mobile, product"
}
```

---

## Lead Assignment Logic

Uses **round-robin** assignment across all seeded users:

- Lead 1 → Amit Sharma
- Lead 2 → Priya Verma
- Lead 3 → Rahul Singh
- Lead 4 → Neha Gupta
- Lead 5 → Amit Sharma (cycles back)

---

## Testing with Postman

1. Import the request below or create manually:
   - Method: `POST`
   - URL: `http://localhost:3000/webhook/indiamart`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):

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

2. Send the same request again to test **duplicate prevention**.

---

## Testing with ngrok (Webhook Simulation)

```bash
ngrok http 3000
```

Use the generated HTTPS URL as your IndiaMART webhook endpoint:

```
https://xxxx.ngrok.io/webhook/indiamart
```

---

## Prisma Studio (DB GUI)

```bash
npm run db:studio
```

Opens a browser-based UI to inspect Users and Leads tables.

---

## WhatsApp Integration (Twilio Sandbox)

### Setup Steps

1. **Create a Twilio account** at [twilio.com](https://www.twilio.com) (free trial available)

2. **Activate the WhatsApp Sandbox**
   - Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - You'll get a sandbox number (e.g. `+14155238886`)
   - Send the join code (e.g. `join <word>`) from your customer's WhatsApp to the sandbox number — **every test recipient must do this once**

3. **Copy credentials to `.env`**

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_ENABLED=true
```

4. **Test** — POST a lead with a valid mobile number. The customer will receive:

```
Hello Rahul Sharma! 👋

Thank you for your enquiry about *Industrial Pump*.

We have received your request and *Amit Sharma* from our sales team will get in touch with you shortly.

📋 *Enquiry Summary*
• Product: Industrial Pump
• Location: Jaipur
• Your message: _Need quotation_

For urgent queries, feel free to reply to this message.

— IndiaMART Lead Team
```

### How It Works

- WhatsApp notification is sent **after** the lead is saved to DB
- It is **fire-and-forget** — a Twilio failure will NOT fail the lead creation API response
- Set `WHATSAPP_ENABLED=false` in `.env` to disable notifications during development
- Indian mobile numbers without `+91` are automatically normalised

### Moving to Production (Post-POC)

The Twilio Sandbox requires each recipient to opt-in manually. For production:

- Apply for a **WhatsApp Business Account** via Meta or use a BSP like Interakt/WATI
- Use pre-approved **message templates** (required by Meta for outbound messages)

---

## POC Success Criteria

- [x] Webhook receives lead payload
- [x] Lead is stored in PostgreSQL
- [x] Lead auto-assigned via round-robin
- [x] Duplicate leads are ignored
- [x] Correct API responses returned
- [x] End-to-end flow works locally
