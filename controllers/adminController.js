const Admin = require("../models/Admin");
const ApiResponse = require("../utils/apiResponse");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

exports.registerAdmin = async (req, res, next) => {
    try {
        const {name, username, password, hint } = req.body;

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return ApiResponse.invalid("Username already taken.").send(res);
        }

        const newAdmin = await Admin.create({
            name,
            username,
            password,
            hint
        });

        const accessToken = newAdmin.generateAccessToken();
        const refreshToken = await newAdmin.generateRefreshToken();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return ApiResponse.created(accessToken).send(res);
    } catch (err) {
        console.error("Register error:", err);
        next(err);
    }
}

exports.loginAdmin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username }).select("+password");
        if (!admin) {
            return ApiResponse.unauthorized("Invalid credentials").send(res);
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return ApiResponse.unauthorized("Invalid credentials").send(res);
        }

        const accessToken = admin.generateAccessToken();
        const refreshToken = await admin.generateRefreshToken();

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
        const admin = await Admin.findById(decoded.id);
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

        return ApiResponse.success(newAccessToken).send(res);
    } catch (err) {
        return ApiResponse.forbidden("Expired or invalid refresh token").send(res);
    }
}