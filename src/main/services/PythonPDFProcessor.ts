import fs from 'fs/promises';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { PythonShell } from 'python-shell';

export interface PythonConversionResult {
  success: boolean;
  buffer?: Buffer;
  report: {
    success: boolean;
    processingTime: number;
    pages: number;
    textLength: number;
    fontPreservations: string[];
    colorPreservations: string[];
  };
  error?: string;
}

export class PythonPDFProcessor {
  private tempDir: string;
  private pythonScript: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.pythonScript = path.join(__dirname, 'pdf_converter.py');
    this.ensureTempDir();
    this.createPythonScript();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private async createPythonScript(): Promise<void> {
    const pythonCode = `
import fitz  # PyMuPDF
import json
import sys
import os
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.shared import OxmlElement, qn

def convert_pdf_to_docx(pdf_path, output_path):
    try:
        # Open PDF
        doc = fitz.open(pdf_path)
        word_doc = Document()
        
        font_substitutions = []
        color_preservations = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text with formatting
            text_dict = page.get_text("dict")
            
            for block in text_dict["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"]
                            if text.strip():
                                # Extract font info
                                font_name = span.get("font", "Arial")
                                font_size = span.get("size", 12)
                                color = span.get("color", 0)
                                
                                # Convert color from RGB to hex
                                if color != 0:
                                    r = (color >> 16) & 0xFF
                                    g = (color >> 8) & 0xFF
                                    b = color & 0xFF
                                    hex_color = f"#{r:02x}{g:02x}{b:02x}"
                                    color_preservations.append({
                                        "text": text[:50],
                                        "color": hex_color
                                    })
                                
                                # Font substitution
                                substituted_font = get_font_substitution(font_name)
                                if substituted_font != font_name:
                                    font_substitutions.append({
                                        "original": font_name,
                                        "substituted": substituted_font
                                    })
                                
                                # Create paragraph with formatting
                                p = word_doc.add_paragraph()
                                run = p.add_run(text)
                                
                                # Apply font
                                run.font.name = substituted_font
                                run.font.size = Pt(font_size)
                                
                                # Apply color if not black
                                if color != 0:
                                    run.font.color.rgb = get_rgb_color(color)
                                
                                # Apply bold/italic
                                if "Bold" in font_name or "bold" in font_name.lower():
                                    run.bold = True
                                if "Italic" in font_name or "italic" in font_name.lower():
                                    run.italic = True
        
        # Save document
        word_doc.save(output_path)
        
        # Return results
        result = {
            "success": True,
            "font_substitutions": font_substitutions,
            "color_preservations": color_preservations,
            "pages": len(doc),
            "text_length": len(word_doc.paragraphs)
        }
        
        doc.close()
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_font_substitution(original_font):
    font_map = {
        'Times-Roman': 'Times New Roman',
        'Times-Bold': 'Times New Roman',
        'Times-Italic': 'Times New Roman',
        'Times-BoldItalic': 'Times New Roman',
        'Helvetica': 'Arial',
        'Helvetica-Bold': 'Arial',
        'Helvetica-Oblique': 'Arial',
        'Helvetica-BoldOblique': 'Arial',
        'Courier': 'Courier New',
        'Courier-Bold': 'Courier New',
        'Courier-Oblique': 'Courier New',
        'Courier-BoldOblique': 'Courier New',
        'Arial': 'Arial',
        'Arial-Bold': 'Arial',
        'Arial-Italic': 'Arial',
        'Arial-BoldItalic': 'Arial',
        'Calibri': 'Calibri',
        'Calibri-Bold': 'Calibri',
        'Calibri-Italic': 'Calibri',
        'Calibri-BoldItalic': 'Calibri',
        'Verdana': 'Verdana',
        'Verdana-Bold': 'Verdana',
        'Verdana-Italic': 'Verdana',
        'Verdana-BoldItalic': 'Verdana',
        'Georgia': 'Georgia',
        'Georgia-Bold': 'Georgia',
        'Georgia-Italic': 'Georgia',
        'Georgia-BoldItalic': 'Georgia'
    }
    
    return font_map.get(original_font, 'Arial')

def get_rgb_color(color_int):
    from docx.shared import RGBColor
    r = (color_int >> 16) & 0xFF
    g = (color_int >> 8) & 0xFF
    b = color_int & 0xFF
    return RGBColor(r, g, b)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "Usage: python script.py input.pdf output.docx"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2]
    
    result = convert_pdf_to_docx(pdf_path, output_path)
    print(json.dumps(result))
`;

    await fs.writeFile(this.pythonScript, pythonCode);
  }

  /**
   * Convert PDF to DOCX using Python PyMuPDF
   */
  async convertPDFToDOCX(pdfBuffer: Buffer): Promise<PythonConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('PythonPDFProcessor: Starting Python-based conversion');
      
      // Create temporary files
      const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      const tempDocxPath = path.join(this.tempDir, `temp_${Date.now()}.docx`);
      
      // Write PDF buffer to file
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      console.log('PythonPDFProcessor: Calling Python script...');
      
      // Call Python script using exec
      const { exec } = require('child_process');
      const result = await new Promise<any>((resolve, reject) => {
        const command = `python "${this.pythonScript}" "${tempPdfPath}" "${tempDocxPath}"`;
        exec(command, (err: any, stdout: string, stderr: string) => {
          if (err) {
            console.log('PythonPDFProcessor: Python execution failed:', err);
            reject(err);
          } else {
            try {
              const result = JSON.parse(stdout.trim());
              resolve(result);
            } catch (parseErr) {
              console.log('PythonPDFProcessor: Failed to parse Python result:', parseErr);
              console.log('Python stdout:', stdout);
              console.log('Python stderr:', stderr);
              reject(parseErr);
            }
          }
        });
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Python conversion failed');
      }
      
      // Read the converted DOCX file
      const docxBuffer = await fs.readFile(tempDocxPath);
      
      // Clean up temporary files
      await this.cleanupFile(tempPdfPath);
      await this.cleanupFile(tempDocxPath);
      
      const processingTime = Date.now() - startTime;
      
      console.log('PythonPDFProcessor: Python conversion successful');
      
      return {
        success: true,
        buffer: docxBuffer,
        report: {
          success: true,
          processingTime,
          pages: result.pages || 1,
          textLength: result.text_length || docxBuffer.length,
          fontPreservations: result.font_substitutions?.map((f: any) => `${f.original} -> ${f.substituted}`) || [],
          colorPreservations: result.color_preservations?.map((c: any) => `${c.text}: ${c.color}`) || [],
        }
      };
      
    } catch (error) {
      console.error('PythonPDFProcessor: Python conversion failed:', error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Python conversion failed',
        report: {
          success: false,
          processingTime,
          pages: 0,
          textLength: 0,
          fontPreservations: [],
          colorPreservations: [],
        }
      };
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('PythonPDFProcessor: Could not delete temporary file:', filePath);
    }
  }

  /**
   * Clean up all temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const tempFiles = files.filter(file => file.startsWith('temp_'));
      
      await Promise.all(
        tempFiles.map(file => 
          fs.unlink(path.join(this.tempDir, file)).catch(() => {})
        )
      );
    } catch (error) {
      console.error('PythonPDFProcessor: Cleanup error:', error);
    }
  }
}
