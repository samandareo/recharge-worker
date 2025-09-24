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

        console.log("=== JWT DEBUGGING ===");
        console.log("Received token:", token);
        console.log("JWT_SECRET being used for verification:", JWT_SECRET ? "SET" : "NOT SET");
        console.log("JWT_SECRET length:", JWT_SECRET ? JWT_SECRET.length : 0);
        console.log("First 10 chars of JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "NOT SET");

        // Try to decode without verification first to see the payload
        const decodedWithoutVerification = jwt.decode(token);
        console.log("Token payload (without verification):", decodedWithoutVerification);
        console.log("Token header:", jwt.decode(token, { complete: true })?.header);

        // Check if this might be a refresh token being used as access token
        if (decodedWithoutVerification) {
            const now = Math.floor(Date.now() / 1000);
            console.log("Token issued at:", new Date(decodedWithoutVerification.iat * 1000));
            console.log("Token expires at:", new Date(decodedWithoutVerification.exp * 1000));
            console.log("Current time:", new Date());
            console.log("Token expired:", decodedWithoutVerification.exp < now);
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Decoded JWT:", decoded);

        const admin = await RechargeAdmin.findById(decoded.id);
        console.log("Found admin:", admin ? `ID: ${admin._id}` : "NOT FOUND");

        if (!admin) {
            return ApiResponse.unauthorized("Not authorized to access this route without a valid admin").send(res);
        }

        req.admin = admin;
        next();
    } catch (err) {
        console.error("=== JWT ERROR DEBUGGING ===");
        console.error("Error in auth middleware:", err);
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        console.error("JWT_SECRET used for verification:", JWT_SECRET ? "SET" : "NOT SET");
        console.error("JWT_SECRET length:", JWT_SECRET ? JWT_SECRET.length : 0);
        
        // Try to decode the token without verification to see its contents
        try {
            const decodedToken = jwt.decode(req.headers?.authorization?.split(" ")[1] || req.headers?.authorization);
            console.error("Token content (decoded without verification):", decodedToken);
        } catch (decodeErr) {
            console.error("Could not decode token:", decodeErr.message);
        }
        
        if (err.name === 'JsonWebTokenError') {
            return ApiResponse.unauthorized("Invalid token signature").send(res);
        } else if (err.name === 'TokenExpiredError') {
            return ApiResponse.unauthorized("Token expired").send(res);
        }
        
        return ApiResponse.unauthorized("Not authorized to access this route").send(res);
    }
}