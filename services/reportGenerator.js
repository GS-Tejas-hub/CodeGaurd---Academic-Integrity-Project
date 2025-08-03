const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reportDir = process.env.REPORT_DIR || './reports';
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async generateReport(analysisData, options = {}) {
    try {
      const {
        includeCodeSnippets = true,
        includeAIAnalysis = true,
        includeSourceDetails = true,
        customTitle = 'CodeGuard Analysis Report'
      } = options;

      const reportId = generateReportId();
      const filename = `report_${reportId}.pdf`;
      const filepath = path.join(this.reportDir, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Generate report content
      this.generateHeader(doc, customTitle, analysisData);
      this.generateSummary(doc, analysisData);
      
      if (includeAIAnalysis) {
        this.generateAIAnalysis(doc, analysisData);
      }
      
      this.generateFileAnalysis(doc, analysisData, includeCodeSnippets);
      
      if (includeSourceDetails) {
        this.generateSourceDetails(doc, analysisData);
      }
      
      this.generateFooter(doc, analysisData);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          resolve({
            filename,
            filepath,
            reportId,
            size: fs.statSync(filepath).size
          });
        });
        
        stream.on('error', reject);
      });

    } catch (error) {
      console.error('Report generation error:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  generateHeader(doc, title, data) {
    // Title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text(title, { align: 'center' });

    doc.moveDown(0.5);

    // Subtitle
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Academic Plagiarism Detection Report', { align: 'center' });

    doc.moveDown(1);

    // Report metadata
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#34495e');

    const metadata = [
      `Analysis ID: ${data.analysisId}`,
      `Generated: ${new Date(data.timestamp).toLocaleString()}`,
      `Total Files: ${data.totalFiles}`,
      `Analysis Duration: ${this.calculateDuration(data.timestamp)}`
    ];

    metadata.forEach(item => {
      doc.text(item);
    });

    doc.moveDown(1);
    this.addSeparator(doc);
  }

  generateSummary(doc, data) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Executive Summary');

    doc.moveDown(0.5);

    const summary = data.summary;
    
    // Risk assessment
    const overallRisk = this.calculateOverallRisk(summary);
    const riskColor = this.getRiskColor(overallRisk);

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(riskColor)
       .text(`Overall Risk Level: ${overallRisk.toUpperCase()}`);

    doc.moveDown(0.5);

    // Scores
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#34495e');

    const scores = [
      `Plagiarism Score: ${(summary.plagiarismScore * 100).toFixed(1)}%`,
      `AI-Generated Score: ${(summary.aiGeneratedScore * 100).toFixed(1)}%`,
      `Total Matches Found: ${summary.totalMatches}`,
      `High Risk Files: ${summary.highRiskFiles.length}`
    ];

    scores.forEach(score => {
      doc.text(`• ${score}`);
    });

    doc.moveDown(1);

    // High risk files
    if (summary.highRiskFiles.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#e74c3c')
         .text('⚠️ High Risk Files:');

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#34495e');

      summary.highRiskFiles.forEach(file => {
        doc.text(`• ${file.filename} (Score: ${(file.score * 100).toFixed(1)}%)`);
      });
    }

    doc.moveDown(1);
    this.addSeparator(doc);
  }

  generateAIAnalysis(doc, data) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('AI-Generated Code Analysis');

    doc.moveDown(0.5);

    const aiFiles = data.files.filter(file => file.aiGeneratedScore > 0.5);
    
    if (aiFiles.length === 0) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#27ae60')
         .text('✅ No significant AI-generated code patterns detected.');
    } else {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#e67e22')
         .text(`⚠️ ${aiFiles.length} files show potential AI-generated patterns:`);

      aiFiles.forEach(file => {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#34495e')
           .text(`• ${file.filename} (AI Score: ${(file.aiGeneratedScore * 100).toFixed(1)}%)`);

        if (file.aiAnalysis && file.aiAnalysis.patterns) {
          file.aiAnalysis.patterns.slice(0, 3).forEach(pattern => {
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .fillColor('#7f8c8d')
               .text(`  - ${pattern.description}`);
          });
        }
      });
    }

    doc.moveDown(1);
    this.addSeparator(doc);
  }

  generateFileAnalysis(doc, data, includeCodeSnippets) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Detailed File Analysis');

    doc.moveDown(0.5);

    data.files.forEach((file, index) => {
      // File header
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#34495e')
         .text(`${index + 1}. ${file.filename}`);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#7f8c8d')
         .text(`Language: ${file.language} | Size: ${this.formatFileSize(file.size)}`);

      // Scores
      const plagiarismColor = this.getScoreColor(file.plagiarismScore);
      const aiColor = this.getScoreColor(file.aiGeneratedScore);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(plagiarismColor)
         .text(`Plagiarism Score: ${(file.plagiarismScore * 100).toFixed(1)}%`);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(aiColor)
         .text(`AI Score: ${(file.aiGeneratedScore * 100).toFixed(1)}%`);

      // Matches
      if (file.matches.length > 0) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#e74c3c')
           .text(`Found ${file.matches.length} potential matches:`);

        file.matches.slice(0, 5).forEach((match, matchIndex) => {
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#34495e')
             .text(`${matchIndex + 1}. ${match.title || match.source}`);

          doc.fontSize(8)
             .font('Helvetica-Oblique')
             .fillColor('#7f8c8d')
             .text(`   Source: ${match.source} | Similarity: ${(match.similarity * 100).toFixed(1)}% | Risk: ${match.risk}`);

          if (match.link) {
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#3498db')
               .text(`   Link: ${match.link}`);
          }
        });

        if (file.matches.length > 5) {
          doc.fontSize(9)
             .font('Helvetica-Oblique')
             .fillColor('#7f8c8d')
             .text(`... and ${file.matches.length - 5} more matches`);
        }
      } else {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#27ae60')
           .text('✅ No plagiarism matches found.');
      }

      // Code snippets (if requested and matches exist)
      if (includeCodeSnippets && file.matches.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#34495e')
           .text('Code Snippets:');

        file.matches.slice(0, 2).forEach((match, matchIndex) => {
          if (match.snippet && match.snippet.length > 0) {
            doc.fontSize(8)
               .font('Courier')
               .fillColor('#2c3e50')
               .text(`Match ${matchIndex + 1} (${(match.similarity * 100).toFixed(1)}% similar):`);

            const snippet = match.snippet.substring(0, 200) + (match.snippet.length > 200 ? '...' : '');
            doc.fontSize(7)
               .font('Courier')
               .fillColor('#7f8c8d')
               .text(snippet, { indent: 10 });
          }
        });
      }

      doc.moveDown(1);
    });
  }

  generateSourceDetails(doc, data) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Source Analysis');

    doc.moveDown(0.5);

    const sources = data.sources;
    const sourceTypes = ['github', 'stackoverflow', 'web'];

    sourceTypes.forEach(sourceType => {
      if (sources[sourceType] && sources[sourceType].length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#34495e')
           .text(`${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Sources (${sources[sourceType].length}):`);

        sources[sourceType].slice(0, 3).forEach((source, index) => {
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#34495e')
             .text(`${index + 1}. ${source.title}`);

          doc.fontSize(9)
             .font('Helvetica-Oblique')
             .fillColor('#7f8c8d')
             .text(`   Max Similarity: ${(source.maxSimilarity * 100).toFixed(1)}% | Files: ${source.files.join(', ')}`);

          if (source.link) {
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#3498db')
               .text(`   Link: ${source.link}`);
          }
        });

        if (sources[sourceType].length > 3) {
          doc.fontSize(9)
             .font('Helvetica-Oblique')
             .fillColor('#7f8c8d')
             .text(`... and ${sources[sourceType].length - 3} more sources`);
        }

        doc.moveDown(0.5);
      }
    });
  }

  generateFooter(doc, data) {
    this.addSeparator(doc);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Report generated by CodeGuard - Academic Plagiarism Detection System', { align: 'center' });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#95a5a6')
       .text('This report is for educational purposes only. Please review all findings manually before taking any action. Because as a developer I can understand there are few things that can be common in codes so take action on large piece of code that matches and can ignore variables or function names. Powered by DemonAI built by DemonKing', { align: 'center' });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#95a5a6')
       .text('Every detail of the code is searched in the internet so kindly avoid similar words found but not to ignore where entire function or large lines of code is detected', { align: 'center' });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#95a5a6')
       .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
  }

  addSeparator(doc) {
    doc.moveDown(0.5);
    doc.strokeColor('#bdc3c7')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
    doc.moveDown(0.5);
  }

  calculateOverallRisk(summary) {
    const plagiarismRisk = summary.plagiarismScore;
    const aiRisk = summary.aiGeneratedScore;
    
    const overallScore = (plagiarismRisk * 0.7 + aiRisk * 0.3);
    
    if (overallScore >= 0.8) return 'critical';
    if (overallScore >= 0.6) return 'high';
    if (overallScore >= 0.4) return 'medium';
    if (overallScore >= 0.2) return 'low';
    return 'minimal';
  }

  getRiskColor(risk) {
    const colors = {
      critical: '#e74c3c',
      high: '#e67e22',
      medium: '#f39c12',
      low: '#f1c40f',
      minimal: '#27ae60'
    };
    return colors[risk] || '#7f8c8d';
  }

  getScoreColor(score) {
    if (score >= 0.8) return '#e74c3c';
    if (score >= 0.6) return '#e67e22';
    if (score >= 0.4) return '#f39c12';
    if (score >= 0.2) return '#f1c40f';
    return '#27ae60';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  calculateDuration(timestamp) {
    const start = new Date(timestamp);
    const end = new Date();
    const diff = end - start;
    return `${Math.round(diff / 1000)} seconds`;
  }
}

function generateReportId() {
  return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = new ReportGenerator(); 