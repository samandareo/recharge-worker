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
        console.error(err.message);
        return ApiResponse.unauthorized("Not authorized to access this route").send(res);
    }
}