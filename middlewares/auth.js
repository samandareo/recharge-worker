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

        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await RechargeAdmin.findById(decoded.id);

        if (!admin) {
            return ApiResponse.unauthorized("Not authorized to access this route without a valid admin").send(res);
        }

        req.admin = admin;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return ApiResponse.unauthorized("Invalid token signature").send(res);
        } else if (err.name === 'TokenExpiredError') {
            return ApiResponse.unauthorized("Token expired").send(res);
        }
        
        return ApiResponse.unauthorized("Not authorized to access this route").send(res);
    }
}