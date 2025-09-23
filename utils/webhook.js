const axios = require('axios');
const crypto = require('crypto');
const { WEBHOOK_URL, WEBHOOK_SECRET } = require('../config/config');

/**
 * Send signed webhook to Admin Panel with HMAC-SHA256 over raw body + timestamp
 * Headers: X-Timestamp, X-Signature
 * @param {object} payload
 * @returns {Promise<{ok: boolean, status?: number, data?: any, error?: string}>}
 */
async function sendRechargeWebhook(payload) {
  try {
    if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
      // Not configured; skip silently in dev
      return { ok: false, error: 'WEBHOOK not configured' };
    }

    const body = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body + ts).digest('hex');

    const res = await axios.post(WEBHOOK_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': ts,
        'X-Signature': sig,
      },
      timeout: 15000,
      // withCredentials not needed for server-to-server
    });

    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = { sendRechargeWebhook };
