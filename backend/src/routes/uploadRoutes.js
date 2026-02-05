const express = require("express");
const fs = require('fs');
const path = require('path');
const authMiddleware = require("../middleware/authMiddleware");
const {
  upload,
  deleteFromCloudinary,
} = require("../services/cloudinaryService");

const router = express.Router();

/**
 * POST /api/upload/media
 * Upload media (image, video, document) to Cloudinary
 * Requires: authMiddleware
 * Body: form-data with file
 * Returns: { url: 'cloudinary_url', public_id: 'cloudinary_id' }
 */
router.post("/media", authMiddleware, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    console.log("Uploaded file object:", JSON.stringify(req.file, null, 2));

    // Return Cloudinary URL and public ID
    // multer-storage-cloudinary stores URL in 'path' and public_id in 'filename'
    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/upload/media/:publicId
 * Delete media from Cloudinary
 * Requires: authMiddleware
 * Params: publicId (Cloudinary public ID)
 */
router.delete("/media/:publicId", authMiddleware, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    // Decode the public ID if it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);

    await deleteFromCloudinary(decodedPublicId);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      message: "Error deleting file",
      error: error.message,
    });
  }
});

// GET /api/upload/download?p=/uploads/answers/....
// Securely stream a file from the uploads directory with Content-Disposition to force download.
router.get('/download', async (req, res) => {
  try {
    const p = req.query.p || req.query.path
    if (!p || typeof p !== 'string') return res.status(400).json({ message: 'path (p) query param is required' })

    // Only allow downloads from the uploads/answers folder for safety
    if (!p.startsWith('/uploads/answers/')) return res.status(400).json({ message: 'invalid path' })

    const uploadsRoot = path.join(__dirname, '..', 'uploads')
    const relative = p.replace(/^\/uploads\/?/, '')
    const abs = path.join(uploadsRoot, relative)

    // Prevent path traversal
    if (!abs.startsWith(uploadsRoot)) return res.status(400).json({ message: 'invalid path' })
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'file not found' })

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`)
    return res.sendFile(abs)
  } catch (err) {
    console.error('Download endpoint error', err)
    return res.status(500).json({ message: 'internal error' })
  }
})

module.exports = router;
