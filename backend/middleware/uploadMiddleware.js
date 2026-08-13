const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage(); // Store in memory first for sharp processing

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
  },
});

// SECURITY: Re-encode image with sharp to strip malicious content
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = req.user.id + '-' + uniqueSuffix + '.jpg';
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .jpeg({ quality: 85 }) // Re-encode as clean JPEG
      .toFile(filepath);

    // Attach processed filename to req so controllers can use it
    req.processedFile = { filename, path: filepath };
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid image file' });
  }
};

module.exports = { upload, processImage };