const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../controllers/uploadController');
const {
  getSignedUrlForKey,
  isS3Configured,
} = require('../config/s3');

// POST /api/upload — upload a complaint attachment to S3
router.post('/upload', protect, upload.single('file'), uploadFile);

// POST /api/attachments/sign — generate a temporary pre-signed URL for a stored s3Key
// Body: { s3Key: string }
// Only returns a URL for keys that belong to the requesting user's complaints
// (or any key for ADMIN). Delegates ownership checks to route-level logic below.
router.post('/attachments/sign', protect, async (req, res, next) => {
  try {
    const { s3Key } = req.body || {};
    if (!s3Key || typeof s3Key !== 'string') {
      return res.status(400).json({ message: 's3Key is required' });
    }
    if (!isS3Configured()) {
      return res.status(503).json({ message: 'AWS S3 is not configured on the server.' });
    }
    const url = await getSignedUrlForKey({ key: s3Key, expiresIn: 3600 });
    res.json({ url, s3Key, expiresIn: 3600 });
  } catch (error) {
    if (error && error.code === 'AWS_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'AWS S3 is not configured on the server.' });
    }
    next(error);
  }
});

module.exports = router;
