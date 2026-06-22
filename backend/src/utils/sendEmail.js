// Commented out Nodemailer Gmail SMTP configuration to switch to Brevo API (bypassing Render port blocks)
/*
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  return await transporter.sendMail({
    from: `"VGEC Exam Portal" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}
*/

const axios = require("axios");

/**
 * Sends a transactional email via the Brevo REST API using BREVO_API_KEY
 * @param {string} to - Destination email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML formatted body
 */
async function sendEmail(to, subject, html) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("⚠ BREVO_API_KEY is not set — Forgot password email sending skipped.");
    return { success: false, message: "Brevo API Key is not set in environment variables." };
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "VGEC Exam Portal",
          email: "examecho22@gmail.com", // Verified sender email in Brevo
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("❌ Brevo Email Error details:", errorDetails);
    throw new Error(
      typeof errorDetails === "object"
        ? errorDetails.message || JSON.stringify(errorDetails)
        : errorDetails
    );
  }
}

module.exports = sendEmail;
