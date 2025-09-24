const Recharge = require("../models/Recharge");
const ApiResponse = require("../utils/apiResponse");
const { sendRechargeWebhook } = require("../utils/webhook");
const mongoose = require("mongoose");
const { sendRechargeRequestQueue } = require("../utils/producer");

// POST /api/recharge
// Admin: create a new pending recharge and notify Admin Panel via webhook
exports.createRechargeRequest = async (req, res) => {
    try {
        const { userId, phoneNumber, operator, amount, description } = req.body || {};
        if (!phoneNumber || !operator || amount === undefined || amount === null) {
            return ApiResponse.invalid("phoneNumber, operator and amount are required").send(res);
        }
        // Validate optional userId; ignore if invalid
        let safeUserId = undefined;
        if (userId) {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                safeUserId = userId;
            } else {
                return ApiResponse.invalid("userId must be a valid ObjectId").send(res);
            }
        }

        const job = await Recharge.create({
            userId: safeUserId,
            phoneNumber,
            operator,
            amount: String(amount),
            status: "pending",
            description: description || "",
        });

        // Fire webhook with pending status
        try {
            const payload = {
                recharge_id: String(job._id),
                user_id: job.userId ? String(job.userId) : undefined,
                phone_number: job.phoneNumber,
                operator: job.operator,
                amount: job.amount ? parseInt(job.amount) : 0,
                transaction_id: undefined,
                updated_source: "api",
                message: job.description || undefined,
                status: "pending",
                is_success: 0,
                retry_count: job.retry_count || 0,
            };
            const whRes = await sendRechargeWebhook(payload);
            console.log("Webhook(create)", { recharge_id: String(job._id), ok: whRes?.ok, status: whRes?.status, error: whRes?.error });
        } catch (e) {
            console.error("Webhook send failed (create):", e?.message || e);
        }

        return ApiResponse.created({ rechargeId: job._id }).send(res);
    } catch (err) {
        console.error("Create recharge error:", err);
        return ApiResponse.error(err.message).send(res);
    }
}

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
                    amount: job.amount ? parseInt(job.amount) : 0,
                    transaction_id: undefined,
                    updated_source: "api",
                    message: job.description || undefined,
                    status: "success",
                    is_success: 1,
                    retry_count: job.retry_count || 0,
                };
                const whRes = await sendRechargeWebhook(payload);
                console.log("Webhook(update-success)", { recharge_id: String(job._id), ok: whRes?.ok, status: whRes?.status, error: whRes?.error });
            } catch (e) {
                console.error("Webhook send failed:", e?.message || e);
            }

            const queueData = {
                rechargeId: String(job._id),
                userId: job.userId ? String(job.userId) : undefined,
                phoneNumber: job.phoneNumber,
                operator: job.operator,
                amount: job.amount ? parseInt(job.amount) : 0,
            };
            await sendRechargeRequestQueue(queueData);
            
            ApiResponse.success(null, "Recharge data changed successfully!").send(res);
        } else {
            const currentRetry = job.retry_count || 0;
            job.retry_count = currentRetry + 1;
            const reachedFailThreshold = job.retry_count >= 2;
            job.status = reachedFailThreshold ? "failed" : "pending";
            job.description = description || "";

            await job.save();
            // Fire webhook to Admin Panel with updated/failed status
            try {
                const payload = {
                    recharge_id: String(job._id),
                    user_id: job.userId ? String(job.userId) : undefined,
                    phone_number: job.phoneNumber,
                    operator: job.operator,
                    amount: job.amount ? parseInt(job.amount) : 0,
                    transaction_id: undefined,
                    updated_source: "api",
                    message: job.description || undefined,
                    status: reachedFailThreshold ? "failed" : "pending",
                    is_success: 0,
                    retry_count: job.retry_count || 0,
                };
                const whRes = await sendRechargeWebhook(payload);
                console.log("Webhook(update)", { recharge_id: String(job._id), ok: whRes?.ok, status: whRes?.status, error: whRes?.error });
            } catch (e) {
                console.error("Webhook send failed:", e?.message || e);
            }
            const respMsg = reachedFailThreshold ? "Recharge marked as failed." : "Failure noted. Try fail again to mark permanently.";
            ApiResponse.success(null, respMsg).send(res);
        }
    } catch (err) {
        console.error(err);
        return ApiResponse.error(`An error has occured: ${err.message}`).send(res);
    }
}