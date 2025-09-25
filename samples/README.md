# Sample PDFs for Testing

This directory contains sample PDF files for testing the PDF to DOCX conversion functionality.

## Sample Files

### 1. simple-text.pdf
- **Description**: Basic text document with standard fonts
- **Features**: 
  - Single column layout
  - Standard fonts (Arial, Times New Roman)
  - Basic formatting (bold, italic)
  - Simple paragraph structure
- **Expected Output**: Clean DOCX with preserved formatting

### 2. complex-layout.pdf
- **Description**: Multi-column document with images and complex formatting
- **Features**:
  - Multi-column layout
  - Images and graphics
  - Custom fonts
  - Mixed text sizes and colors
  - Headers and footers
- **Expected Output**: DOCX with layout challenges, may require font substitutions

### 3. custom-fonts.pdf
- **Description**: Document with embedded custom fonts
- **Features**:
  - Embedded fonts (Helvetica, Times-Roman, Courier)
  - Various font weights and styles
  - Special characters and symbols
- **Expected Output**: Font substitutions reported, layout preserved

## Testing Instructions

1. **Load Sample PDF**: Use the file browser to select a sample PDF
2. **Configure Options**: Set conversion options based on the PDF complexity
3. **Run Conversion**: Execute the conversion and monitor progress
4. **Review Report**: Check the conversion report for font substitutions and warnings
5. **Download Result**: Save the converted DOCX file

## Expected Results

### Simple Text Document
- ✅ Perfect layout preservation
- ✅ No font substitutions
- ✅ Fast conversion (< 5 seconds)

### Complex Layout Document
- ⚠️ Some layout challenges
- ⚠️ Font substitutions expected
- ⚠️ Images may require fallback mode

### Custom Fonts Document
- ⚠️ Multiple font substitutions
- ✅ Layout preserved with substituted fonts
- ✅ Detailed substitution report

## Troubleshooting

### Common Issues
1. **Font Substitutions**: Expected for custom fonts, check substitution report
2. **Layout Issues**: Enable high-fidelity fallback for complex layouts
3. **Image Problems**: Ensure image extraction is enabled
4. **Performance**: Large files may take longer, monitor progress

### Performance Benchmarks
- **Simple PDF**: 2-5 seconds
- **Complex PDF**: 5-15 seconds
- **Large PDF**: 15-60 seconds

## Creating Your Own Test PDFs

To create test PDFs with specific characteristics:

1. **Simple Text**: Use any word processor, save as PDF
2. **Complex Layout**: Use Adobe InDesign or similar with multiple columns
3. **Custom Fonts**: Embed fonts in the PDF document
4. **Images**: Include various image types (JPEG, PNG, vector graphics)

## Commercial Testing

For production testing, consider using commercial PDFs with:
- Professional layouts
- Complex typography
- High-resolution images
- Vector graphics
- Multi-page documents
