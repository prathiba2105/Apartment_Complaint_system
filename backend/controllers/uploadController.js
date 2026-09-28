/* ========================================
   File Upload Controller (AWS S3)
   ======================================== */
const { uploadToS3, buildObjectKey, isS3Configured } = require('../config/s3');
const { MAX_FILE_SIZE } = require('../middleware/uploadMiddleware');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided. Field name must be "file".' });
    }

    if (!isS3Configured()) {
      return res.status(503).json({
        message:
          'AWS S3 is not configured on the server. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET_NAME in backend/.env',
      });
    }

    const original = req.file.originalname || 'file';
    const key = buildObjectKey('complaints', String(req.user.id), original);

    const { s3Key } = await uploadToS3({
      key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
    });

    res.status(201).json({
      message: 'Upload successful',
      attachment: {
        fileName: original,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        s3Key,
      },
    });
  } catch (error) {
    if (error && error.code === 'AWS_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'AWS S3 is not configured on the server.' });
    }
    if (error && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
      });
    }
    next(error);
  }
};

module.exports = { uploadFile };
