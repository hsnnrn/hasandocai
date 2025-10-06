import React, { useState } from 'react';

interface OptimizedDocumentData {
  documentId: string;
  title: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  fileSource: 'user-upload' | 'watched-folder' | 'imported';
  createdAt: string;
  updatedAt: string;
  processed: boolean;
  processorVersion: string;
  language: string;
  ocrConfidence: number;
  structuredData: {
    documentType: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    currency?: string;
    total?: number;
    vendor?: string;
    lineItems?: Array<{
      desc: string;
      qty: number;
      unit: number;
      total: number;
    }>;
  };
  textSections: Array<{
    id: string;
    pageNumber: number;
    sectionTitle: string;
    contentType: 'header' | 'body' | 'footer' | 'table' | 'lineitem';
    orderIndex: number;
    content: string;
    charCount: number;
    tokenCount: number;
    chunkIndex: number;
    chunkOverlapWithPrev: number;
    embeddingId: string;
  }>;
  tags: string[];
  notes: string;
  ownerUserId: string;
  sensitivity: 'public' | 'private' | 'restricted';
}

const OptimizedDataExample: React.FC = () => {
  const [exampleData, setExampleData] = useState<OptimizedDocumentData | null>(null);

  const generateExampleData = () => {
    const example: OptimizedDocumentData = {
      documentId: "uuid-v4-xxxx",
      title: "temp_1759766861426_sample-invoice",
      filename: "sample-invoice.pdf",
      filePath: "C:\\Users\\Hasan\\AppData\\Local\\MyApp\\files\\sample-invoice.pdf",
      mimeType: "application/pdf",
      fileSize: 324567,
      checksum: "sha256:abcd1234...",
      fileSource: "user-upload",
      createdAt: "2025-10-05T15:12:00Z",
      updatedAt: "2025-10-05T15:12:10Z",
      processed: true,
      processorVersion: "ocr-v1.2",
      language: "de",
      ocrConfidence: 0.92,
      structuredData: {
        documentType: "invoice",
        invoiceNumber: "INV-2025-1001",
        invoiceDate: "2025-09-30",
        currency: "EUR",
        total: 324.50,
        vendor: "CPB Software (Germany) GmbH",
        lineItems: [
          { desc: "Service A", qty: 1, unit: 324.5, total: 324.5 }
        ]
      },
      textSections: [
        {
          id: "section-uuid-1",
          pageNumber: 1,
          sectionTitle: "Header - Vendor",
          contentType: "header",
          orderIndex: 0,
          content: "CPB Software (Germany) GmbH - Im Bruch 3 - 63897 ...",
          charCount: 64,
          tokenCount: 12,
          chunkIndex: 0,
          chunkOverlapWithPrev: 0,
          embeddingId: "emb-uuid-1"
        }
      ],
      tags: ["invoice", "client:Mustekunde AG"],
      notes: "",
      ownerUserId: "user-uuid",
      sensitivity: "private"
    };

    setExampleData(example);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Optimized Data Format Example</h1>
      
      <div className="mb-6">
        <button
          onClick={generateExampleData}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Generate Example Data
        </button>
      </div>

      {exampleData && (
        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Document Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Document ID:</strong> {exampleData.documentId}</div>
              <div><strong>Title:</strong> {exampleData.title}</div>
              <div><strong>Filename:</strong> {exampleData.filename}</div>
              <div><strong>File Size:</strong> {exampleData.fileSize.toLocaleString()} bytes</div>
              <div><strong>MIME Type:</strong> {exampleData.mimeType}</div>
              <div><strong>Language:</strong> {exampleData.language}</div>
              <div><strong>OCR Confidence:</strong> {(exampleData.ocrConfidence * 100).toFixed(1)}%</div>
              <div><strong>Processed:</strong> {exampleData.processed ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Structured Data */}
          <div className="bg-green-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Structured Data</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Document Type:</strong> {exampleData.structuredData.documentType}</div>
              {exampleData.structuredData.invoiceNumber && (
                <div><strong>Invoice Number:</strong> {exampleData.structuredData.invoiceNumber}</div>
              )}
              {exampleData.structuredData.invoiceDate && (
                <div><strong>Invoice Date:</strong> {exampleData.structuredData.invoiceDate}</div>
              )}
              {exampleData.structuredData.currency && (
                <div><strong>Currency:</strong> {exampleData.structuredData.currency}</div>
              )}
              {exampleData.structuredData.total && (
                <div><strong>Total:</strong> {exampleData.structuredData.total}</div>
              )}
              {exampleData.structuredData.vendor && (
                <div><strong>Vendor:</strong> {exampleData.structuredData.vendor}</div>
              )}
            </div>
            
            {exampleData.structuredData.lineItems && exampleData.structuredData.lineItems.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Line Items:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-2 py-1 text-left">Description</th>
                        <th className="px-2 py-1 text-left">Qty</th>
                        <th className="px-2 py-1 text-left">Unit Price</th>
                        <th className="px-2 py-1 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exampleData.structuredData.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1">{item.desc}</td>
                          <td className="px-2 py-1">{item.qty}</td>
                          <td className="px-2 py-1">{item.unit}</td>
                          <td className="px-2 py-1">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Text Sections */}
          <div className="bg-yellow-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Text Sections ({exampleData.textSections.length})</h2>
            {exampleData.textSections.map((section, index) => (
              <div key={section.id} className="mb-4 p-3 bg-white rounded border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{section.sectionTitle}</h3>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">{section.contentType}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{section.content}</p>
                <div className="text-xs text-gray-500">
                  Page {section.pageNumber} • {section.charCount} chars • {section.tokenCount} tokens
                </div>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="bg-purple-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Metadata</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Tags:</strong> {exampleData.tags.join(', ')}</div>
              <div><strong>Sensitivity:</strong> {exampleData.sensitivity}</div>
              <div><strong>File Source:</strong> {exampleData.fileSource}</div>
              <div><strong>Processor Version:</strong> {exampleData.processorVersion}</div>
              <div><strong>Created:</strong> {new Date(exampleData.createdAt).toLocaleString()}</div>
              <div><strong>Updated:</strong> {new Date(exampleData.updatedAt).toLocaleString()}</div>
            </div>
          </div>

          {/* Raw JSON */}
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Raw JSON Data</h2>
            <pre className="text-xs bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
              {JSON.stringify(exampleData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedDataExample;
