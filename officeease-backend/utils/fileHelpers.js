// utils/fileHelpers.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './outputs';

[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// إعداد multer لاستقبال ملف واحد أو عدة ملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
const upload = multer({ storage, limits: { fileSize: maxSizeMb * 1024 * 1024 } });

function outputPath(filename) {
  return path.join(OUTPUT_DIR, filename);
}

function publicOutputUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/outputs/${filename}`;
}

module.exports = { upload, outputPath, publicOutputUrl, UPLOAD_DIR, OUTPUT_DIR };
