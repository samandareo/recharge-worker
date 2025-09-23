const RechargeAdmin = require("../models/RechargeAdmin");
const ApiResponse = require("../utils/apiResponse");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

exports.registerAdmin = async (req, res, next) => {
    try {
        const {name, username, password, hint } = req.body;

        const existingAdmin = await RechargeAdmin.findOne({ username });
        if (existingAdmin) {
            return ApiResponse.invalid("Username already taken.").send(res);
        }
        if (!hint || hint.trim().length === 0) {
            return ApiResponse.invalid("Hint is required.").send(res);
        }

        if (hint !== process.env.REGISTER_HINT) {
            return ApiResponse.invalid("Hint is incorrect!").send(res);
        }
        
        const newAdmin = await RechargeAdmin.create({
            name,
            username,
            password
        });

        const accessToken = newAdmin.generateAccessToken();
        const refreshToken = await newAdmin.generateRefreshToken();

        /**
         * LIVE DEPLOYMENT NOTE (READ ME)
         * --------------------------------
         * যদি Admin Panel অন্য origin-এ চলে (যেমন: https://aspadmin.diderappstore.top)
         * এবং API আর Panel ভিন্ন origin হয়, তবে cross-site কুকির জন্য সাধারণত:
         *   - NODE_ENV=production হলে `secure: true`
         *   - SameSite: 'None' (Strict/Lax হলে ব্রাউজার cross-site কুকি পাঠাবে না)
         *   - প্রয়োজনে `domain` সেট করতে হতে পারে (যদি সাবডোমেইন শেয়ার করেন)
         * লোকালে টেস্টিংয়ের সময় HTTPS না থাকলে SameSite 'Strict' রাখা হয়েছে।
         * প্রোডাকশনে HTTPS নিশ্চিত করে SameSite 'None' করার কথা বিবেচনা করুন।
         */
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // [LIVE SWITCH - PRODUCTION]
        // In production with HTTPS and cross-site Admin Panel, uncomment the block below
        // and remove/disable the block above. This enables third-party cookie usage.
        //
        // res.cookie("refreshToken", refreshToken, {
        //     httpOnly: true,
        //     secure: true, // require HTTPS in production
        //     sameSite: "None", // allow cross-site cookie
        //     // domain: ".diderappstore.top", // optional: set if sharing across subdomains
        //     maxAge: 7 * 24 * 60 * 60 * 1000,
        // });

        return ApiResponse.created(accessToken).send(res);
    } catch (err) {
        console.error("Register error:", err);
        next(err);
    }
}

exports.loginAdmin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const admin = await RechargeAdmin.findOne({ username }).select("+password");
        if (!admin) {
            return ApiResponse.unauthorized("Invalid credentials").send(res);
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return ApiResponse.unauthorized("Invalid credentials").send(res);
        }

        const accessToken = admin.generateAccessToken();
        const refreshToken = await admin.generateRefreshToken();

        /**
         * LIVE DEPLOYMENT NOTE
         * --------------------
         * Panel যদি https://aspadmin.diderappstore.top এ চলে এবং API আলাদা origin হয়:
         *   - প্রোডাকশনে HTTPS রাখুন + `secure: true`
         *   - SameSite 'None' করুন (cross-site কুকির জন্য)
         *   - প্রয়োজনে `domain` ব্যবহার করুন (যদি সাবডোমেইন শেয়ার করেন)
         * লোকালে SameSite 'strict' আছে যাতে non-HTTPS এ ব্রাউজার এরর না দেয়।
         */
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return ApiResponse.success(accessToken).send(res);
    } catch (err) {
        next(err);
    }
}

exports.refreshTokens = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return ApiResponse.unauthorized("No refresh token").send(res);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const admin = await RechargeAdmin.findById(decoded.id);
        if (!admin) {
            return ApiResponse.unauthorized("Invalid user").send(res);
        }

        const isValid = await bcrypt.compare(token, admin.refreshToken);
        if (!isValid) {
            return ApiResponse.forbidden("Invalid token").send(res);
        }

        const newAccessToken = admin.generateAccessToken();
        const newRefreshToken = await admin.generateRefreshToken();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // [LIVE SWITCH - PRODUCTION]
        // In production with HTTPS and cross-site Admin Panel, uncomment the block below
        // and remove/disable the block above. This enables third-party cookie usage.
        //
        // res.cookie("refreshToken", newRefreshToken, {
        //     httpOnly: true,
        //     secure: true, // require HTTPS in production
        //     sameSite: "None", // allow cross-site cookie
        //     // domain: ".diderappstore.top", // optional: set if sharing across subdomains
        //     maxAge: 7 * 24 * 60 * 60 * 1000,
        // });

        return ApiResponse.success(newAccessToken).send(res);
    } catch (err) {
        return ApiResponse.forbidden("Expired or invalid refresh token").send(res);
    }
}