const express = require('express');
const reportGenerator = require('../services/reportGenerator');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Generate PDF report
router.post('/generate', async (req, res) => {
  try {
    const { analysisData, options = {} } = req.body;

    if (!analysisData) {
      return res.status(400).json({ error: 'Analysis data is required' });
    }

    console.log('Generating PDF report...');

    const reportResult = await reportGenerator.generateReport(analysisData, options);

    // Check if we're in serverless environment (buffer response)
    if (reportResult.buffer) {
      // Store buffer in memory or temporary storage for download
      // For now, we'll send it directly
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportResult.filename}"`);
      res.setHeader('Content-Length', reportResult.size);
      res.send(reportResult.buffer);
    } else {
      // File system response (development)
      res.json({
        success: true,
        message: 'Report generated successfully',
        data: {
          reportId: reportResult.reportId,
          filename: reportResult.filename,
          size: reportResult.size,
          downloadUrl: `/api/reports/download/${reportResult.filename}`
        }
      });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
});

// Download report
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const reportDir = process.env.REPORT_DIR || './reports';
    const filepath = path.join(reportDir, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fs.statSync(filepath).size);

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ error: 'Failed to download report: ' + error.message });
  }
});

// List available reports
router.get('/list', (req, res) => {
  try {
    const reportDir = process.env.REPORT_DIR || './reports';
    
    if (!fs.existsSync(reportDir)) {
      return res.json({ reports: [] });
    }

    const files = fs.readdirSync(reportDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filepath = path.join(reportDir, file);
        const stats = fs.statSync(filepath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          downloadUrl: `/api/reports/download/${file}`
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({
      success: true,
      data: {
        reports: files,
        total: files.length
      }
    });

  } catch (error) {
    console.error('Report listing error:', error);
    res.status(500).json({ error: 'Failed to list reports: ' + error.message });
  }
});

// Delete report
router.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const reportDir = process.env.REPORT_DIR || './reports';
    const filepath = path.join(reportDir, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete the file
    fs.unlinkSync(filepath);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Report deletion error:', error);
    res.status(500).json({ error: 'Failed to delete report: ' + error.message });
  }
});

// Get report info
router.get('/info/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const reportDir = process.env.REPORT_DIR || './reports';
    const filepath = path.join(reportDir, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const stats = fs.statSync(filepath);
    
    res.json({
      success: true,
      data: {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        downloadUrl: `/api/reports/download/${filename}`
      }
    });

  } catch (error) {
    console.error('Report info error:', error);
    res.status(500).json({ error: 'Failed to get report info: ' + error.message });
  }
});

// Clean up old reports (older than 30 days)
router.post('/cleanup', (req, res) => {
  try {
    const reportDir = process.env.REPORT_DIR || './reports';
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

    if (!fs.existsSync(reportDir)) {
      return res.json({ deleted: 0 });
    }

    const files = fs.readdirSync(reportDir)
      .filter(file => file.endsWith('.pdf'));

    let deletedCount = 0;

    files.forEach(file => {
      const filepath = path.join(reportDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old reports`,
      data: {
        deleted: deletedCount
      }
    });

  } catch (error) {
    console.error('Report cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup reports: ' + error.message });
  }
});

module.exports = router; 