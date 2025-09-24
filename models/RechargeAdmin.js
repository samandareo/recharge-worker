const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } = require("../config/config");

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
    refreshToken: {
        type: String,
    }
}, { timestamps: true });

RechargeAdmin.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

RechargeAdmin.methods.generateAccessToken = function () {
    console.log("=== TOKEN GENERATION DEBUGGING ===");
    console.log(`Generating access token with JWT_SECRET: ${JWT_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`JWT_SECRET length: ${JWT_SECRET ? JWT_SECRET.length : 0}`);
    console.log(`First 10 chars of JWT_SECRET: ${JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : 'NOT SET'}`);
    console.log(`Admin ID: ${this._id}`);
    console.log(`JWT_EXPIRES_IN: ${JWT_EXPIRES_IN || "1d"}`);
    
    const token = jwt.sign(
        { 
            id: this._id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN || "1d"}
    );
    
    console.log(`Generated token: ${token.substring(0, 20)}...`);
    
    // Test verification immediately after generation
    try {
        const testVerify = jwt.verify(token, JWT_SECRET);
        console.log("Token verification test PASSED:", testVerify);
    } catch (testErr) {
        console.error("Token verification test FAILED:", testErr.message);
    }
    
    return token;
};

RechargeAdmin.methods.generateRefreshToken = async function () {
    console.log("=== REFRESH TOKEN GENERATION ===");
    console.log(`Generating refresh token with JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET ? 'SET' : 'NOT SET'}`);
    
    const refreshToken = jwt.sign(
        { 
            id: this._id
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN || "30d"}
    );

    this.refreshToken = await bcrypt.hash(refreshToken, 10);
    await this.save();
    
    return refreshToken;
}

RechargeAdmin.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("RechargeAdmin", RechargeAdmin);
