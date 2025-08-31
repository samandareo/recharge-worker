const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const RechargeAdmin = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    username: {
        type: String,
        required: [true, "Username is required"],
        match: [
            /^[A-Za-z]+$/,
            "Please write username with only letters",
        ],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 8,
        select: false,
    },
    hint: {
        type: String,
        required: [true, "Please, write something for hint..."]
    },
    refreshToken: {
        type: String,
    },
    role: {
        type: String,
        default: 'recharge',
        enum: ['recharge']
    },
    permissions: [{
        type: String,
        enum: ['view_recharge', 'process_recharge']
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

RechargeAdmin.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

RechargeAdmin.methods.generateAccessToken = function () {
    return jwt.sign(
        { 
            id: this._id, 
            hint: this.hint,
            role: this.role,
            permissions: this.permissions 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d"}
    );
};

RechargeAdmin.methods.generateRefreshToken = async function () {
    const refreshToken = jwt.sign(
        { 
            id: this._id,
            role: this.role 
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d"}
    );

    this.refreshToken = await bcrypt.hash(refreshToken, 10);
    await this.save();
    
    return refreshToken;
}

RechargeAdmin.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("RechargeAdmin", RechargeAdmin);
