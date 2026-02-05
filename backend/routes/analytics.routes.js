const router = require("express").Router();
const analytics = require("../controllers/analytics.controller");

router.get("/student/:studentId", analytics.getStudentAnalytics);

module.exports = router;
