import multer from 'multer';
import path from 'path';

// Configure where and how the files are stored
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // This will save files to a folder named 'uploads' in your root directory.
    // Make sure you create an 'uploads' folder manually in your project root!
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent overwriting (e.g., 1695843029-avatar.png)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Create the upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: limit file size to 5MB
});

export default upload;