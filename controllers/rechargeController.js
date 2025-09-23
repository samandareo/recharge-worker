const Recharge = require("../models/Recharge");
const ApiResponse = require("../utils/apiResponse");
const { sendRechargeWebhook } = require("../utils/webhook");

// GET /api/recharge
// Admin
exports.getRechargeRequest = async (req, res) => {
    try {

        const job = await Recharge.findOne({
            status: { $in: ["pending", "processing"] },
            retry_count: { $lt: 2 }
        }).sort({ createdAt: 1 }).exec();

        if (!job) {
            return ApiResponse.success(null, "There is not any recharge request!").send(res);
        }
        job.retry_count += 1;

        if (job.status === "pending") {
            job.status = "processing";
        }

        await job.save();

        const response = {
            rechargeId: job._id,
            phoneNumber: job.phoneNumber,
            operator: job.operator,
            amount: job.amount
        }

        ApiResponse.success(response).send(res);        
    } catch (err) {
        ApiResponse.error(err.message).send(res);
    }
}

// PUT /api/recharge
// Admin
exports.changeRechargeRequest = async (req, res) => {
    
    try {
        const { rechargeId, isSuccess, description } = req.body;

        const job = await Recharge.findOne({ _id: rechargeId});

        if (job.retry_count >= 2) {
            return ApiResponse.invalid("This recharge request was already failed").send(res);
        }
        if (isSuccess) {
            job.status = "completed"
            job.description = description

            await job.save();
            // Fire webhook to Admin Panel with final status
            try {
                const payload = {
                    recharge_id: String(job._id),
                    user_id: job.userId ? String(job.userId) : undefined,
                    phone_number: job.phoneNumber,
                    operator: job.operator,
                    amount: job.amount ? parseFloat(job.amount) : 0,
                    transaction_id: undefined,
                    updated_source: "api",
                    message: job.description || undefined,
                    status: "success",
                    is_success: 1,
                    retry_count: job.retry_count || 0,
                };
                await sendRechargeWebhook(payload);
            } catch (e) {
                console.error("Webhook send failed:", e?.message || e);
            }
            ApiResponse.success(null, "Recharge data changed successfully!").send(res);
        } else {
            if (job.retry_count < 2) {
                job.description = description;
            } else {
                job.status = "failed";
                job.description = description
            }

            await job.save();
            // Fire webhook to Admin Panel with updated/failed status
            try {
                const payload = {
                    recharge_id: String(job._id),
                    user_id: job.userId ? String(job.userId) : undefined,
                    phone_number: job.phoneNumber,
                    operator: job.operator,
                    amount: job.amount ? parseFloat(job.amount) : 0,
                    transaction_id: undefined,
                    updated_source: "api",
                    message: job.description || undefined,
                    status: job.status === "failed" ? "failed" : "pending",
                    is_success: job.status === "failed" ? 0 : 0,
                    retry_count: job.retry_count || 0,
                };
                await sendRechargeWebhook(payload);
            } catch (e) {
                console.error("Webhook send failed:", e?.message || e);
            }
            ApiResponse.success(null, "Recharge data changed successfully!").send(res);
        }
    } catch (err) {
        console.error(err);
        return ApiResponse.error(`An error has occured: ${err.message}`).send(res);
    }
}