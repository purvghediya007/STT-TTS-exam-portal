const analyticsService = require("../services/analytics.service");

exports.getStudentAnalytics = async (req, res) => {
  try {
    const data = await analyticsService.buildAnalytics(req.params.studentId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
