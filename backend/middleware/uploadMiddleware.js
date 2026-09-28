/* ========================================
   Multer middleware for S3-compatible uploads
   ========================================
   Accepts images (JPG/JPEG/PNG) and PDF documents.
   Stores in memory so the controller can upload to S3.
*/
const multer = require('multer');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

const ALLOWED_EXT = /\.(jpe?g|png|pdf)$/i;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const okMime = ALLOWED_MIME.has(file.mimetype);
  const okExt = ALLOWED_EXT.test(file.originalname);
  if (okMime && okExt) {
    cb(null, true);
  } else {
    const err = new Error(
      'Unsupported file type. Allowed: JPG, JPEG, PNG, PDF.'
    );
    err.code = 'UNSUPPORTED_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = { upload, MAX_FILE_SIZE };
