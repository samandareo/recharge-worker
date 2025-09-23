# recharge-worker Local Testing Guide (Windows + Postman + MongoDB)

This guide walks you through setting up MongoDB locally on Windows, configuring the Node.js API (`recharge-worker/`), and testing the endpoints using Postman.

---

## 1) Prerequisites

- Node.js LTS (v18+ recommended)
- Windows 10/11
- Postman (or any REST client)
- Git (optional)

Project paths referenced:
- API root: `recharge-worker/`
- Key files:
  - `recharge-worker/app.js`
  - `recharge-worker/server.js`
  - `recharge-worker/config/config.js`
  - `recharge-worker/config/db.js`
  - `recharge-worker/controllers/adminController.js`
  - `recharge-worker/controllers/rechargeController.js`

---

## 2) Install and Run MongoDB (Local)

1. Download MongoDB Community Server:
   - https://www.mongodb.com/try/download/community
   - Choose Windows MSI, install with default options.

2. Ensure MongoDB Service is running:
   - Open "Services" app in Windows.
   - Find "MongoDB" (or "MongoDB Server"). Status should be "Running".
   - If not, right click → Start.

3. Default local URI:
   - `mongodb://127.0.0.1:27017`

4. (Optional) Create database/collection upfront:
   - You can let the app create collections automatically on first write, or use MongoDB Compass to create a database (e.g., `recharge_db`).

---

## 3) Configure Environment (.env)

Create or edit `recharge-worker/.env` with the following keys:

```
MONGO_URL=mongodb://127.0.0.1:27017/recharge_db
PORT=5000
NODE_ENV=development

# Admin register hint (required only if you want to call /api/admin/register)
REGISTER_HINT=your_hint_here

# JWT secrets (required for token issuance)
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# CORS: Admin Panel origin (use only ORIGIN, not path)
# For pure API testing from Postman, this is not required, but harmless if present.
ADMIN_PANEL_ORIGIN=http://localhost

# (Optional) Webhook to Admin Panel — not required for Postman tests
# WEBHOOK_URL=https://aspadmin.diderappstore.top/AspWebAdminPanel/server/recharge_event.php
# WEBHOOK_SECRET=YOUR_EVENT_SECRET
```

Notes:
- In production, set `NODE_ENV=production` and use HTTPS for cross-site cookies.
- `ADMIN_PANEL_ORIGIN` should be the origin only (scheme + host [+ port]), not a path.

---

## 4) Install Dependencies and Run the API

From the `recharge-worker/` directory:

```bash
npm install
node server.js
```

Expected console log:
- `MongoDB Connected...`
- `Server is running on port => 5000` (or your chosen port)

Health check:
- Open `http://localhost:5000/api/` in browser → should display "API is working..."

---

## 5) Postman: Create a Collection and Environment

Create an environment in Postman with variables:
- `baseUrl` = `http://localhost:5000/api`
- `accessToken` = (will be filled after login)

Create a collection with the following requests.

### 5.1 Register Admin (Optional; first time only)

```
POST {{baseUrl}}/admin/register
Content-Type: application/json

{
  "name": "Admin",
  "username": "admin",
  "password": "pass123",
  "hint": "your_hint_here"
}
```

- Requires `REGISTER_HINT` in `.env` to match `hint`.
- Response: `201` with an access token (string). A refresh token cookie is also set by the API (browser scenario). For Postman tests, you can rely on access token only.

### 5.2 Login Admin

```
POST {{baseUrl}}/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "pass123"
}
```

- Copy the returned access token and store it in environment variable `accessToken`.

### 5.3 Get a Recharge Job (Admin protected)

```
GET {{baseUrl}}/recharge
Authorization: Bearer {{accessToken}}
```

- Returns a single job with `status` in `pending` or `processing`, and increments `retry_count`.
- Response example:

```json
{
  "success": true,
  "data": {
    "rechargeId": "66f1...",
    "phoneNumber": "01700000000",
    "operator": "Grameenphone",
    "amount": "30"
  }
}
```

### 5.4 Update Recharge Status (Admin protected)

```
PUT {{baseUrl}}/recharge
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{
  "rechargeId": "<paste from GET response>",
  "isSuccess": true,
  "description": "done via Postman"
}
```

- For failure / retry, use:

```json
{
  "rechargeId": "<id>",
  "isSuccess": false,
  "description": "failed or retry"
}
```

- On success: status becomes `completed`.
- On failure: if `retry_count` < 2, description updates; else status becomes `failed`.

---

## 6) (Optional) Webhook Testing

If you configured webhook (`WEBHOOK_URL`, `WEBHOOK_SECRET`) the API will POST to the Admin Panel endpoint after status changes.

- Admin Panel endpoint (PHP): `AspWebAdminPanel/server/recharge_event.php`
- Signature: HMAC-SHA256 of `rawBody + timestamp` using `WEBHOOK_SECRET`
- Headers: `X-Timestamp`, `X-Signature`

You can verify in the Admin Panel database (`web_recharge_records`) or logs.

---

## 7) Troubleshooting

- **MongoDB connection fails**
  - Ensure the MongoDB Windows service is running.
  - Verify `MONGO_URL` and database name.
  - Check firewall/antivirus.

- **401 Unauthorized on protected routes**
  - Ensure you used the `accessToken` from `/admin/login`.
  - Send header: `Authorization: Bearer <token>`.

- **CORS issues** (browser only; Postman is not affected)
  - Make sure `ADMIN_PANEL_ORIGIN` in `.env` matches the exact origin (e.g., `http://localhost`).
  - Restart the Node server after changing `.env`.

- **Cookies not set in Postman**
  - Postman does not automatically simulate browser cross-site cookies.
  - For API testing, use the `accessToken` from the response body.

- **Webhook not received**
  - Check `.env` `WEBHOOK_URL` and `WEBHOOK_SECRET`.
  - Check `recharge-worker` logs for `Webhook send failed:`.
  - Verify Admin Panel server time (±5 min skew allowed).

---

## 8) Useful Endpoints Recap

- `GET /api/` → Health check
- `POST /api/admin/register` → Register admin (requires `REGISTER_HINT`)
- `POST /api/admin/login` → Login admin, returns access token
- `GET /api/recharge` → Fetch one pending/processing job (protected)
- `PUT /api/recharge` → Update job status (protected)

---

## 9) Start/Dev Scripts

- Run once: `npm install`
- Start: `node server.js`
- Dev (auto-reload if configured): `npm run dev` (requires `nodemon`)

---

If you need a ready-to-import Postman collection and environment JSON, let us know — we can include them in this repository.

---

## 10) Endpoints and cURL Examples

Base URL (local):

```
http://localhost:5000/api
```

Important headers for JSON requests:

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

### 10.1 Health Check

```
curl -i http://localhost:5000/api/
```

### 10.2 Register Admin (optional, first time only)

> Requires `REGISTER_HINT` in `.env` to match the `hint` value.

```bash
curl -i -X POST \
  http://localhost:5000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "username": "admin",
    "password": "pass123",
    "hint": "your_hint_here"
  }'
```

### 10.3 Login Admin (get access token)

```bash
curl -s -X POST \
  http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "pass123"
  }'
```

Copy the returned token string from the `data` field and use it as `Authorization: Bearer <token>`.

### 10.4 Get a Recharge Job (protected)

```bash
ACCESS_TOKEN="<paste token>"
curl -s -X GET \
  http://localhost:5000/api/recharge \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### 10.5 Update Recharge Status (protected)

Success example:

```bash
ACCESS_TOKEN="<paste token>"
RECHARGE_ID="<paste from GET /recharge>"
curl -s -X PUT \
  http://localhost:5000/api/recharge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"rechargeId\":\"${RECHARGE_ID}\",\"isSuccess\":true,\"description\":\"done via curl\"}"
```

Failure / retry example:

```bash
ACCESS_TOKEN="<paste token>"
RECHARGE_ID="<paste id>"
curl -s -X PUT \
  http://localhost:5000/api/recharge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"rechargeId\":\"${RECHARGE_ID}\",\"isSuccess\":false,\"description\":\"failed or retry\"}"
```

#### Windows PowerShell note

When using PowerShell, prefer single quotes around the JSON string so you don't need to escape double quotes inside:

```powershell
$ACCESS_TOKEN = "<paste token>"
$RID = "<paste id>"
curl.exe -s -X PUT `
  http://localhost:5000/api/recharge `
  -H 'Content-Type: application/json' `
  -H "Authorization: Bearer $ACCESS_TOKEN" `
  -d '{"rechargeId":"'$RID'","isSuccess":true,"description":"done via PowerShell"}'
```

