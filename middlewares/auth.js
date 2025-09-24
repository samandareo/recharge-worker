const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/apiResponse");
const RechargeAdmin = require("../models/RechargeAdmin");
const { JWT_SECRET } = require("../config/config");

exports.protectAdmin = async (req, res, next) => {
    try {
        let token;

        if (req?.headers?.authorization) {
            if (req.headers.authorization.startsWith("Bearer")) {
                token = req.headers.authorization.split(" ")[1];
            } else {
                token = req.headers.authorization;
            }
        }

        if (!token) {
            return ApiResponse.unauthorized("Not authorized to access this route without a token").send(res);
        }

        console.log("Received token:", token);
        console.log("JWT_SECRET being used for verification:", JWT_SECRET ? "SET" : "NOT SET");
        console.log("JWT_SECRET length:", JWT_SECRET ? JWT_SECRET.length : 0);

        // Try to decode without verification first to see the payload
        const decodedWithoutVerification = jwt.decode(token);
        console.log("Token payload (without verification):", decodedWithoutVerification);

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Decoded JWT:", decoded);

        const admin = await RechargeAdmin.findById(decoded.id);
        console.log("Found admin:", admin);

        if (!admin) {
            return ApiResponse.unauthorized("Not authorized to access this route without a valid admin").send(res);
        }

        req.admin = admin;
        console.log("Admin attached to request:", req.admin);
        next();
    } catch (err) {
        console.error("Error in auth middleware:", err);
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        
        // Specific handling for JWT errors
        if (err.name === 'JsonWebTokenError') {
            console.error("JWT_SECRET used:", JWT_SECRET ? "SET" : "NOT SET");
            return ApiResponse.unauthorized("Invalid token signature").send(res);
        } else if (err.name === 'TokenExpiredError') {
            return ApiResponse.unauthorized("Token expired").send(res);
        }
        
        return ApiResponse.unauthorized("Not authorized to access this route").send(res);
    }
}