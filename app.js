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
// 1) If the Admin Panel runs at:
//    https://aspadmin.diderappstore.top/AspWebAdminPanel/
//    DO NOT put the full path in CORS origin. Use only the ORIGIN (scheme+host+port):
//    https://aspadmin.diderappstore.top
//
// 2) What to set for production:
//    - In .env, set: ADMIN_PANEL_ORIGIN=https://aspadmin.diderappstore.top
//    - Also set: NODE_ENV=production
//
// 3) For local testing, the allowedOrigins list below already covers common localhost origins.
//    In production, ADMIN_PANEL_ORIGIN from .env will be automatically allowed.
//
// [LIVE ACTION]
// - Add this to .env on the server:
//     ADMIN_PANEL_ORIGIN=https://aspadmin.diderappstore.top
//     NODE_ENV=production
// - No code changes needed beyond this; restart the Node server after updating .env.
// ===============================
const allowedOrigins = [
  "http://localhost",
  "http://127.0.0.1",
  "http://localhost:80",
  "http://127.0.0.1:80",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
].filter(Boolean);

if (process.env.ADMIN_PANEL_ORIGIN) {
  allowedOrigins.push(process.env.ADMIN_PANEL_ORIGIN);
}

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

// Explicit preflight handler for all API routes
app.options('*', cors(corsOptions));

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