require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4001,
  // Webhook target (Admin Panel endpoint) and shared secret for HMAC
  // [LIVE ACTION] set in .env on server:
  //   WEBHOOK_URL=https://aspadmin.diderappstore.top/AspWebAdminPanel/server/recharge_event.php
  //   WEBHOOK_SECRET=YOUR_EVENT_SECRET
  WEBHOOK_URL: process.env.WEBHOOK_URL || "",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",
  JWT_SECRET: process.env.JWT_SECRET
};
