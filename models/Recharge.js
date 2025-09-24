const mongoose = require("mongoose");

const rechargeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    phoneNumber: { type: String, required: true },
    amount: {type: String, required: true },
    operator: { type: String, required: true },
    status: {type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending"},
    retry_count: { type: Number, default: 0 },
    description: { type: String, default: "" },
}, {timestamps: true});

rechargeSchema.index({ userId: 1 });
rechargeSchema.index({ phoneNumber: 1 });
rechargeSchema.index({ status: 1 });
rechargeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Recharge", rechargeSchema);