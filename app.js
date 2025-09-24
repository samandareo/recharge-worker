const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error");
require("dotenv").config();

const app = express();

// CORS configuration
// ===============================
// LIVE DEPLOYMENT NOTE (READ ME)
// -------------------------------
// 1) If the Admin Panel runs at https://aspadmin.diderappstore.top/AspWebAdminPanel/
//    DO NOT put the full path in the CORS origin. Use only the ORIGIN (scheme+host+port):
//    https://aspadmin.diderappstore.top
//
// 2) Production configuration (.env on the server):
//    - ADMIN_PANEL_ORIGIN=https://aspadmin.diderappstore.top
//    - ADMIN_PANEL_EXTRA_ORIGINS=https://another-admin.example.com,https://yet-another.example.org (optional, comma-separated)
//    - NODE_ENV=production
//
// 3) Local testing already allows common localhost origins. We intentionally keep both
//    local and production origins so QA can switch between them without touching code.
//
// [LIVE ACTION]
// - Update .env with the values above and restart the Node server after each change.
// ===============================
const localOrigins = [
  "http://localhost",
  "http://127.0.0.1",
  "http://localhost:80",
  "http://127.0.0.1:80",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const envOrigins = [
  process.env.ADMIN_PANEL_ORIGIN,
  ...(process.env.ADMIN_PANEL_EXTRA_ORIGINS
    ? process.env.ADMIN_PANEL_EXTRA_ORIGINS.split(",").map((value) => value.trim())
    : []),
].filter(Boolean);

const allowedOrigins = Array.from(new Set([...localOrigins, ...envOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser clients (no origin) and allowed origins list
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS: Origin not allowed: " + origin));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Explicit preflight handler for all API routes (Express v5: use a regex, not '*')
app.options(/.*/, cors(corsOptions));

app.get("/api/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>API VERIFICATION</title>
      </head>
      <body>
        <h1 style="text-align: center">API is working...</h1>
      </body>
    </html>
  `)
})

// Routes
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/recharge", require("./routes/rechargeRoutes"));

// Error handler
app.use(errorHandler);

module.exports = app;