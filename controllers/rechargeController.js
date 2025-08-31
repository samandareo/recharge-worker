const Recharge = require("../models/Recharge");
const ApiResponse = require("../utils/apiResponse");


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
            ApiResponse.success(null, "Recharge data changed successfully!").send(res);
        } else {
            if (job.retry_count < 2) {
                job.description = description;
            } else {
                job.status = "failed";
                job.description = description
            }

            await job.save();
            ApiResponse.success(null, "Recharge data changed successfully!").send(res);
        }
    } catch (err) {
        console.error(err);
        return ApiResponse.error(`An error has occured: ${err.message}`).send(res);
    }
}