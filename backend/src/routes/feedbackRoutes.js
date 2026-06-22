const express = require("express");
const router = express.Router();
const sendFeedbackEmail = require("../utils/resendEmail");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * POST /api/feedback
 * Receives feedback from student/faculty and sends it to examecho22@gmail.com
 */
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { name, role, email, rating1, rating2, rating1Label, rating2Label, message, feedbackType } = req.body;

    if (!message || !rating1 || !rating2 || !feedbackType) {
      return res.status(400).json({
        message: "Feedback type, ratings, and message are required fields.",
      });
    }

    // Auto-filled username/enrollment from token auth middleware
    const username = req.user?.sub || "Unknown User";

    const ratingStars = (count) => "★".repeat(count) + "☆".repeat(5 - count);

    // Construct professional HTML email content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">ExamEcho Portal Feedback</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.85;">New submission received from ${role}</p>
        </div>
        
        <div style="padding: 20px 10px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 40%;">Sender Name:</td>
              <td style="padding: 8px 0; color: #1f2937;">${name || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Enrollment/Username:</td>
              <td style="padding: 8px 0; color: #1f2937; font-family: monospace;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Role:</td>
              <td style="padding: 8px 0; color: #1f2937;"><span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${role.toUpperCase()}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Contact Email:</td>
              <td style="padding: 8px 0; color: #1f2937;">${email || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Feedback Type:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${feedbackType}</td>
            </tr>
          </table>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <h3 style="color: #1e3a8a; margin-top: 0;">Evaluation Ratings</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;">
              <strong>${rating1Label || "Ease of Use / System Interface"}:</strong><br/>
              <span style="color: #fbbf24; font-size: 18px;">${ratingStars(rating1)}</span> (${rating1}/5)
            </p>
            <p style="margin: 0;">
              <strong>${rating2Label || "Audio Quality / AI Accuracy"}:</strong><br/>
              <span style="color: #fbbf24; font-size: 18px;">${ratingStars(rating2)}</span> (${rating2}/5)
            </p>
          </div>
          
          <h3 style="color: #1e3a8a; margin-top: 0;">Feedback Message</h3>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap; border-left: 4px solid #1e3a8a;">${message}</div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 11px; color: #9ca3af;">
          Sent automatically from the ExamEcho Examination Portal system.
        </div>
      </div>
    `;

    console.log(`✉ Sending feedback email to examecho22@gmail.com (type: ${feedbackType})`);
    const emailResult = await sendFeedbackEmail("examecho22@gmail.com", `[Feedback] ${feedbackType} from ${role} (${username})`, html);
    
    res.status(200).json({
      success: true,
      message: "Feedback submitted successfully! Thank you for your input.",
      details: emailResult,
    });
  } catch (error) {
    console.error("❌ Feedback submission failed:", error.message);
    next(error);
  }
});

module.exports = router;
