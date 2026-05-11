const express = require("express");
const controller = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-order", async (req, res, next) => {
  try {
    const result = await controller.createPayment(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-payment", async (req, res, next) => {
  try {
    const result = await controller.verifyPayment(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
