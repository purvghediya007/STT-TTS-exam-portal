const express = require("express");
const { getStudentAnalyticsController } = require("../controllers/performanceAnalyticsController");

const router = express.Router();

router.get("/student/:studentId", getStudentAnalyticsController);

module.exports = router;
