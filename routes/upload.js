const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const githubService = require('../services/githubService');
const fileProcessor = require('../utils/fileProcessor');

const router = express.Router();

// Configure multer for file uploads
const isServerless = process.env.NODE_ENV === 'production' && process.env.VERCEL;

let storage;
if (isServerless) {
  // Use memory storage for serverless environments
  storage = multer.memoryStorage();
} else {
  // Use disk storage for development
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common code file extensions and ZIP files
    const allowedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', 
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.html', 
      '.css', '.scss', '.sass', '.sql', '.sh', '.bat', '.ps1', '.zip'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload code files or ZIP archives.'));
    }
  }
});

// Upload single file
router.post('/file', upload.single('codeFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    let extractedCode = [];
    
    // Handle ZIP files
    if (path.extname(fileName).toLowerCase() === '.zip') {
      let zip;
      if (isServerless) {
        // Use buffer for serverless environment
        zip = new AdmZip(req.file.buffer);
      } else {
        // Use file path for development environment
        zip = new AdmZip(req.file.path);
      }
      
      const zipEntries = zip.getEntries();
      
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const entryName = entry.entryName;
          const content = entry.getData().toString('utf8');
          
          // Only process code files
          const ext = path.extname(entryName).toLowerCase();
          if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', 
               '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.html', 
               '.css', '.scss', '.sass', '.sql', '.sh', '.bat', '.ps1'].includes(ext)) {
            extractedCode.push({
              filename: entryName,
              content: content,
              size: content.length
            });
          }
        }
      }
    } else {
      // Single file
      let content;
      if (isServerless) {
        // Use buffer for serverless environment
        content = req.file.buffer.toString('utf8');
      } else {
        // Use file path for development environment
        content = fs.readFileSync(req.file.path, 'utf8');
      }
      
      extractedCode.push({
        filename: fileName,
        content: content,
        size: content.length
      });
    }

    // Clean up uploaded file (only in development)
    if (!isServerless && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.warn('Could not delete uploaded file:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'File processed successfully',
      data: {
        totalFiles: extractedCode.length,
        files: extractedCode.map(file => ({
          filename: file.filename,
          size: file.size
        }))
      },
      sessionId: generateSessionId()
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Error processing uploaded file' });
  }
});

// Process GitHub URL
router.post('/github', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    
    if (!githubUrl) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    // Validate GitHub URL format
    const githubRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubRegex.test(githubUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    const extractedCode = await githubService.extractFromGitHub(githubUrl);
    
    res.json({
      success: true,
      message: 'GitHub repository processed successfully',
      data: {
        totalFiles: extractedCode.length,
        files: extractedCode.map(file => ({
          filename: file.filename,
          size: file.size,
          content: file.content,
          language: file.language
        }))
      },
      sessionId: generateSessionId()
    });

  } catch (error) {
    console.error('GitHub processing error:', error);
    res.status(500).json({ error: 'Error processing GitHub repository' });
  }
});

// Process direct code input
router.post('/code', async (req, res) => {
  try {
    const { code, language, filename } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Code content and language are required' });
    }

    const extractedCode = [{
      filename: filename || `code.${getFileExtension(language)}`,
      content: code,
      size: code.length,
      language: language
    }];

    res.json({
      success: true,
      message: 'Code processed successfully',
      data: {
        totalFiles: extractedCode.length,
        files: extractedCode.map(file => ({
          filename: file.filename,
          size: file.size
        }))
      },
      sessionId: generateSessionId()
    });

  } catch (error) {
    console.error('Code processing error:', error);
    res.status(500).json({ error: 'Error processing code input' });
  }
});

// Helper functions
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getFileExtension(language) {
  const extensions = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'php': 'php',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
    'bash': 'sh'
  };
  
  return extensions[language.toLowerCase()] || 'txt';
}

module.exports = router; 