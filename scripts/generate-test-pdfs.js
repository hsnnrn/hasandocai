const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateTestPDFs() {
  const samplesDir = path.join(__dirname, '..', 'samples');
  
  // Ensure samples directory exists
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // Generate Simple Text PDF
  await generateSimpleTextPDF();
  
  // Generate Complex Layout PDF
  await generateComplexLayoutPDF();
  
  // Generate Custom Fonts PDF
  await generateCustomFontsPDF();
  
  console.log('✅ Test PDFs generated successfully!');
  console.log('📁 Check the samples/ directory for generated files');
}

async function generateSimpleTextPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  // Title
  page.drawText('Simple Text Document', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0),
  });
  
  // Subtitle
  page.drawText('A basic PDF for testing conversion', {
    x: 50,
    y: height - 80,
    size: 14,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // Body text
  const bodyText = `This is a simple PDF document designed to test the PDF to DOCX conversion functionality.

Key Features:
• Standard fonts (Arial, Times New Roman)
• Basic formatting (bold, italic)
• Simple paragraph structure
• Single column layout

The conversion should preserve:
- Text positioning
- Font families
- Font sizes
- Basic formatting

This document is ideal for testing basic conversion functionality without complex layout challenges.`;

  const lines = bodyText.split('\n');
  let yPosition = height - 120;
  
  for (const line of lines) {
    if (line.trim()) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
    yPosition -= 20;
  }
  
  // Footer
  page.drawText('Generated for testing PDF to DOCX conversion', {
    x: 50,
    y: 50,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '..', 'samples', 'simple-text.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('📄 Generated: simple-text.pdf');
}

async function generateComplexLayoutPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  // Title
  page.drawText('Complex Layout Document', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0),
  });
  
  // Multi-column layout simulation
  const leftColumn = `Column 1 - Left Side

This is a complex layout document designed to test advanced PDF to DOCX conversion features.

Features:
• Multi-column layout
• Mixed font sizes
• Various text colors
• Complex formatting

This column contains detailed information about the document structure and formatting requirements.`;

  const rightColumn = `Column 2 - Right Side

Additional content goes here with different formatting and styling.

This column demonstrates:
• Different text alignment
• Varied font weights
• Color variations
• Complex spacing

The conversion should handle these layout challenges appropriately.`;

  // Left column
  const leftLines = leftColumn.split('\n');
  let yPosition = height - 120;
  
  for (const line of leftLines) {
    if (line.trim()) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }
    yPosition -= 15;
  }
  
  // Right column
  const rightLines = rightColumn.split('\n');
  yPosition = height - 120;
  
  for (const line of rightLines) {
    if (line.trim()) {
      page.drawText(line, {
        x: 300,
        y: yPosition,
        size: 10,
        color: rgb(0.2, 0.2, 0.8),
      });
    }
    yPosition -= 15;
  }
  
  // Footer
  page.drawText('Complex Layout Test Document', {
    x: 50,
    y: 50,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '..', 'samples', 'complex-layout.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('📄 Generated: complex-layout.pdf');
}

async function generateCustomFontsPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  // Title
  page.drawText('Custom Fonts Document', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0),
  });
  
  // Subtitle
  page.drawText('Testing font substitution and embedding', {
    x: 50,
    y: height - 80,
    size: 14,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // Font demonstration
  const fontDemo = `Font Demonstration:

Standard Fonts:
• Arial - Regular text
• Times New Roman - Serif text
• Courier New - Monospace text

Custom Fonts (will be substituted):
• Helvetica -> Arial
• Times-Roman -> Times New Roman
• Courier -> Courier New
• Symbol -> Arial
• ZapfDingbats -> Arial

This document tests the font substitution system and ensures that:
- Original fonts are detected correctly
- Substitutions are applied appropriately
- Layout is preserved with substituted fonts
- Font characteristics are maintained`;

  const lines = fontDemo.split('\n');
  let yPosition = height - 120;
  
  for (const line of lines) {
    if (line.trim()) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
    yPosition -= 18;
  }
  
  // Footer
  page.drawText('Custom Fonts Test Document', {
    x: 50,
    y: 50,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '..', 'samples', 'custom-fonts.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('📄 Generated: custom-fonts.pdf');
}

// Run the generator
generateTestPDFs().catch(console.error);
