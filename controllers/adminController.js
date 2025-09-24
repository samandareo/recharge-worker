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
         * Set the Admin Panel origin (e.g. https://diderappstore.top)
         * to enable cross-site cookies in production:
         *   - Set NODE_ENV=production to enable secure cookies
         *   - Set SameSite to 'None' to enable cross-site cookies
         *   - Set domain if sharing across subdomains
         * In development, SameSite is set to 'Strict' to prevent cross-site cookies
         *
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
         * If the Admin Panel runs at https://aspadmin.diderappstore.top and the API is on a different origin:
         *   - Enable HTTPS in production and keep `secure: true`
         *   - Use SameSite 'None' to allow cross-site cookies
         *   - Configure `domain` if you are sharing cookies across subdomains
         * In development, SameSite 'strict' avoids browser errors when HTTPS is absent.
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
        // In production with HTTPS and a cross-site Admin Panel, uncomment the block below
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