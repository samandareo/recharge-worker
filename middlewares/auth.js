const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/apiResponse");
const Admin = require("../models/Admin");
require("dotenv").config();

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findOne({_id: decoded.id});

        if (decoded?.hint !== process.env.REGISTER_HINT) {
            return ApiResponse.invalid("Hint is invalid! This admin is not real.")
        }
        console.log(admin)

        if (!admin) {
            return ApiResponse.unauthorized("Not authorized to access this route without a valid admin").send(res);
        }

        req.admin = admin;
        next();
    } catch (err) {
        console.error(err.message);
        return ApiResponse.unauthorized("Not authorized to access this route").send(res);
    }
}