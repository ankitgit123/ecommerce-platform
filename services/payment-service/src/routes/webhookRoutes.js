const express = require("express");
const controller = require("../controllers/webhookController");
const raw = require("../middleware/webhookRawBody");

const router = express.Router();

router.post("/payment", controller.webhookHandler);

module.exports = router;
