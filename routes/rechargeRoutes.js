const router = require("express").Router();
const rechargeController = require("../controllers/rechargeController");
const { protectAdmin } = require("../middlewares/auth");

router
    .route("/")
    .post(protectAdmin, rechargeController.createRechargeRequest)
    .get(protectAdmin, rechargeController.getRechargeRequest)
    .put(protectAdmin, rechargeController.changeRechargeRequest)

router.route("/pending-recharges").get(protectAdmin, rechargeController.getRechargeRequest);

module.exports = router;