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

module.exports = sendEmail;
