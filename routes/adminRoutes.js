const router = require("express").Router();
const adminController = require("../controllers/adminController");
const { protectAdmin } = require("../middlewares/auth");

router.route("/login").post(adminController.loginAdmin);
router.route("/refresh").post(protectAdmin, adminController.refreshTokens);
router.route("/register").post(adminController.registerAdmin);

module.exports = router;    