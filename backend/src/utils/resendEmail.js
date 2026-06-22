const axios = require("axios");

/**
 * Sends a feedback email via Resend REST API
 * @param {string} to - Destination email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML formatted body
 */
async function sendFeedbackEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠ RESEND_API_KEY is not set — Feedback email sending skipped.");
    return { success: false, message: "Resend API Key is not set in environment variables." };
  }

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      // {
      //   from: "ExamEcho Feedback <onboarding@resend.dev>",
      //   to: [to],
      //   subject: subject,
      //   html: html,
      // },
      // Commented out verified domain sender to use Resend Sandbox mode (onboarding@resend.dev)
      /*
      {
        // 1. Sent FROM your verified domain email
        from: "ExamEcho Feedback <feedback@examecho.com>", 
        
        // 2. Sent TO your Gmail address where you want to read it
        to: ["examecho22@gmail.com"], 
        
        subject: subject,
        html: html,
      },
      */
      {
        from: "ExamEcho Feedback <onboarding@resend.dev>",
        to: ["examecho22@gmail.com"],
        subject: subject,
        html: html,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("❌ Resend Email Error details:", errorDetails);
    throw new Error(
      typeof errorDetails === "object"
        ? errorDetails.message || JSON.stringify(errorDetails)
        : errorDetails
    );
  }
}

module.exports = sendFeedbackEmail;
