// src/middleware/uploadJson.js
const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB limit, adjust if you want
  },
  fileFilter: (req, file, cb) => {
    // Accept .json or application/json
    if (
      file.mimetype === "application/json" ||
      file.originalname.toLowerCase().endsWith(".json")
    ) {
      return cb(null, true);
    }
    cb(new Error("Only JSON files are allowed"));
  },
});

module.exports = upload;
