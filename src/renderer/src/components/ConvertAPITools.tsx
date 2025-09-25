import React, { useState } from 'react'
import { Search, FileText, Image, FileSpreadsheet, BarChart3, FileCode, FileArchive, FileVideo, FileAudio, File } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface ConvertAPITool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fromFormat: string;
  toFormat: string;
  category: string;
}

const convertAPITools: ConvertAPITool[] = [
  // PDF Conversions
  { id: 'pdf_to_docx', name: 'PDF to DOCX', description: 'Convert PDF to Word document', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'docx', category: 'PDF' },
  { id: 'pdf_to_jpg', name: 'PDF to JPG', description: 'Convert PDF pages to JPG images', icon: <Image className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'jpg', category: 'PDF' },
  { id: 'pdf_to_png', name: 'PDF to PNG', description: 'Convert PDF pages to PNG images', icon: <Image className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'png', category: 'PDF' },
  { id: 'pdf_to_html', name: 'PDF to HTML', description: 'Convert PDF to HTML webpage', icon: <FileCode className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'html', category: 'PDF' },
  { id: 'pdf_to_txt', name: 'PDF to TXT', description: 'Convert PDF to plain text', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'txt', category: 'PDF' },
  
  // Document Conversions
  { id: 'docx_to_pdf', name: 'DOCX to PDF', description: 'Convert Word document to PDF', icon: <FileText className="w-5 h-5" />, fromFormat: 'docx', toFormat: 'pdf', category: 'Document' },
  { id: 'docx_to_html', name: 'DOCX to HTML', description: 'Convert Word document to HTML', icon: <FileCode className="w-5 h-5" />, fromFormat: 'docx', toFormat: 'html', category: 'Document' },
  { id: 'docx_to_txt', name: 'DOCX to TXT', description: 'Convert Word document to text', icon: <FileText className="w-5 h-5" />, fromFormat: 'docx', toFormat: 'txt', category: 'Document' },
  
  // Image Conversions
  { id: 'jpg_to_pdf', name: 'JPG to PDF', description: 'Convert JPG images to PDF', icon: <Image className="w-5 h-5" />, fromFormat: 'jpg', toFormat: 'pdf', category: 'Image' },
  { id: 'png_to_pdf', name: 'PNG to PDF', description: 'Convert PNG images to PDF', icon: <Image className="w-5 h-5" />, fromFormat: 'png', toFormat: 'pdf', category: 'Image' },
  { id: 'jpg_to_png', name: 'JPG to PNG', description: 'Convert JPG to PNG format', icon: <Image className="w-5 h-5" />, fromFormat: 'jpg', toFormat: 'png', category: 'Image' },
  { id: 'png_to_jpg', name: 'PNG to JPG', description: 'Convert PNG to JPG format', icon: <Image className="w-5 h-5" />, fromFormat: 'png', toFormat: 'jpg', category: 'Image' },
  
  // Spreadsheet Conversions
  { id: 'xlsx_to_pdf', name: 'XLSX to PDF', description: 'Convert Excel to PDF', icon: <FileSpreadsheet className="w-5 h-5" />, fromFormat: 'xlsx', toFormat: 'pdf', category: 'Spreadsheet' },
  { id: 'xlsx_to_html', name: 'XLSX to HTML', description: 'Convert Excel to HTML table', icon: <FileCode className="w-5 h-5" />, fromFormat: 'xlsx', toFormat: 'html', category: 'Spreadsheet' },
  { id: 'xlsx_to_csv', name: 'XLSX to CSV', description: 'Convert Excel to CSV', icon: <FileSpreadsheet className="w-5 h-5" />, fromFormat: 'xlsx', toFormat: 'csv', category: 'Spreadsheet' },
  
  // Presentation Conversions
  { id: 'pptx_to_pdf', name: 'PPTX to PDF', description: 'Convert PowerPoint to PDF', icon: <BarChart3 className="w-5 h-5" />, fromFormat: 'pptx', toFormat: 'pdf', category: 'Presentation' },
  { id: 'pptx_to_jpg', name: 'PPTX to JPG', description: 'Convert PowerPoint slides to JPG', icon: <Image className="w-5 h-5" />, fromFormat: 'pptx', toFormat: 'jpg', category: 'Presentation' },
  
  // Archive Conversions
  { id: 'zip_to_rar', name: 'ZIP to RAR', description: 'Convert ZIP archive to RAR', icon: <FileArchive className="w-5 h-5" />, fromFormat: 'zip', toFormat: 'rar', category: 'Archive' },
  { id: 'rar_to_zip', name: 'RAR to ZIP', description: 'Convert RAR archive to ZIP', icon: <FileArchive className="w-5 h-5" />, fromFormat: 'rar', toFormat: 'zip', category: 'Archive' },
  
  // Video Conversions
  { id: 'mp4_to_avi', name: 'MP4 to AVI', description: 'Convert MP4 video to AVI', icon: <FileVideo className="w-5 h-5" />, fromFormat: 'mp4', toFormat: 'avi', category: 'Video' },
  { id: 'avi_to_mp4', name: 'AVI to MP4', description: 'Convert AVI video to MP4', icon: <FileVideo className="w-5 h-5" />, fromFormat: 'avi', toFormat: 'mp4', category: 'Video' },
  
  // Audio Conversions
  { id: 'mp3_to_wav', name: 'MP3 to WAV', description: 'Convert MP3 audio to WAV', icon: <FileAudio className="w-5 h-5" />, fromFormat: 'mp3', toFormat: 'wav', category: 'Audio' },
  { id: 'wav_to_mp3', name: 'WAV to MP3', description: 'Convert WAV audio to MP3', icon: <FileAudio className="w-5 h-5" />, fromFormat: 'wav', toFormat: 'mp3', category: 'Audio' },
  
  // PDF Tools
  { id: 'compress_pdf', name: 'Compress PDF', description: 'Reduce PDF file size', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'pdf', category: 'PDF Tools' },
  { id: 'merge_pdf', name: 'Merge PDF', description: 'Combine multiple PDFs', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'pdf', category: 'PDF Tools' },
  { id: 'split_pdf', name: 'Split PDF', description: 'Split PDF into separate pages', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'pdf', category: 'PDF Tools' },
  { id: 'watermark_pdf', name: 'Watermark PDF', description: 'Add watermark to PDF', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'pdf', category: 'PDF Tools' },
  { id: 'unlock_pdf', name: 'Unlock PDF', description: 'Remove password from PDF', icon: <FileText className="w-5 h-5" />, fromFormat: 'pdf', toFormat: 'pdf', category: 'PDF Tools' },
]

interface ConvertAPIToolsProps {
  selectedTool: string | null;
  onToolSelect: (toolId: string) => void;
}

export function ConvertAPITools({ selectedTool, onToolSelect }: ConvertAPIToolsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(convertAPITools.map(tool => tool.category)))

  const filteredTools = convertAPITools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const visibleTools = filteredTools.slice(0, 5)
  const hasMoreTools = filteredTools.length > 5

  return (
    <div className="space-y-4">
      {/* Search and Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversion tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm ${
              !selectedCategory 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === category 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tools List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {visibleTools.map((tool) => (
          <Card
            key={tool.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedTool === tool.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onToolSelect(tool.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedTool === tool.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {tool.fromFormat.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {tool.toFormat.toUpperCase()}
                    </span>
                  </div>
                </div>
                {selectedTool === tool.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Show More Indicator */}
        {hasMoreTools && (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground opacity-60">
              +{filteredTools.length - 5} more tools available
            </div>
            <div className="text-xs text-muted-foreground opacity-40 mt-1">
              Scroll to see more or use search
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
