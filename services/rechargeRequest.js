const { sendRechargeWebhook} = require("../utils/webhook");

exports.createRechargeRequest = async (data) => {
    try {
        const { rechargeId, userId, phoneNumber, amount, operator, retry_count } = data || {};
        const description = `Recharge via RabbitMQ: ${rechargeId}`;

        // Fire webhook with pending status
        try {
            const payload = {
                recharge_id: String(rechargeId),
                user_id: userId ? String(userId) : undefined,
                phone_number: phoneNumber,
                operator: operator,
                amount: amount ? parseInt(amount) : 0,
                transaction_id: undefined,
                updated_source: "api",
                message: description || undefined,
                status: "pending",
                is_success: 0,
                retry_count: retry_count || 0,
            };
            const whRes = await sendRechargeWebhook(payload);
            console.log("Webhook(create)", { recharge_id: String(rechargeId), ok: whRes?.ok, status: whRes?.status, error: whRes?.error });
        } catch (e) {
            console.error("Webhook send failed (create):", e?.message || e);
        }
        return { success: true };
    } catch (err) {
        console.error("Create recharge error:", err);
        return { success: false, error: err.message };
    }
}