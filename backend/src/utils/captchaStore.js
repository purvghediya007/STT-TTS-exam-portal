// src/utils/captchaStore.js
const { v4: uuidv4 } = require("uuid");

// In-memory store. For production, consider Redis or another shared cache.
const captchaStore = new Map();

const createCaptcha = (text) => {
  const id = uuidv4();
  const expiresAt =
    Date.now() + Number(process.env.CAPTCHA_EXPIRES_MS || 300000);

  captchaStore.set(id, { text, expiresAt });

  return id;
};

const verifyCaptcha = (id, value) => {
  const record = captchaStore.get(id);
  if (!record) return false;

  const { text, expiresAt } = record;

  if (Date.now() > expiresAt) {
    captchaStore.delete(id);
    return false;
  }

  const ok = text.toLowerCase() === String(value || "").toLowerCase();

  // one-time use
  captchaStore.delete(id);
  return ok;
};

module.exports = {
  createCaptcha,
  verifyCaptcha,
};
