const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const CloudinaryStorage =
  require("multer-storage-cloudinary").CloudinaryStorage;

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine the folder and resource type based on file type
    let folder = "exam-portal/media";
    let resource_type = "auto";

    if (file.mimetype.startsWith("image/")) {
      folder = "exam-portal/images";
      resource_type = "image";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "exam-portal/videos";
      resource_type = "video";
    } else if (file.mimetype === "application/pdf") {
      folder = "exam-portal/documents";
      resource_type = "raw";
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `${Date.now()}_${file.originalname.replace(
        /[^a-z0-9]/gi,
        "_"
      )}`,
    };
  },
});

// Create multer instance with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "audio/webm",
      "audio/wav",
      "audio/mpeg",
      "audio/ogg",
      "application/pdf",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

// Helper function to upload raw file (for FormData)
// Helper function to upload raw file (for FormData)
const uploadFile = async (fileBuffer, fileName, mediaType = "image") => {
  try {
    let folder = "exam-portal/media";
    let resourceType = "auto";
    let format = undefined; // ✅ FIX: always defined

    if (mediaType === "image") {
      folder = "exam-portal/images";
      resourceType = "image";
    } else if (mediaType === "video") {
      folder = "exam-portal/videos";
      resourceType = "video";
    } else if (mediaType === "raw") {
      // 🔴 FIX: audio must be uploaded as VIDEO to be playable
      folder = "exam-portal/audio";
      resourceType = "video";
      format = "mp3"; // ✅ ONLY here
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: `${Date.now()}_${fileName.replace(/\.mp3$/i, "")}`,
          format, // ✅ now safe
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(fileBuffer);
    });

    return result;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw error;
  }
};


module.exports = {
  cloudinary,
  upload,
  deleteFromCloudinary,
  uploadFile,
};
