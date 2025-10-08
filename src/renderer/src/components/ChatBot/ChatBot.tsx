/**
 * ChatBot Component - AI-powered RAG chat interface
 * 
 * Allows users to query their documents using natural language
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stats?: {
    count: number;
    sum: number;
    average: number;
    median: number;
    currency: string | null;
  };
  provenance?: Array<{
    sectionId: string;
    documentId: string;
    filename: string;
    snippet: string;
    similarity: number;
  }>;
  modelMeta?: {
    model: string;
    latencyMs: number;
    fallback?: string;
  };
  lowConfidence?: boolean;
  suggestedFollowUp?: string;
  error?: boolean;
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [showProvenance, setShowProvenance] = useState<Record<string, boolean>>({});
  const [debugInfo, setDebugInfo] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check health and load existing data on mount
  useEffect(() => {
    checkHealth();
    loadExistingData();
  }, []);

  // Safety check: if isLoading is stuck for too long, reset it
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ isLoading stuck, resetting...');
        setIsLoading(false);
      }, 20000); // 20 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  const loadExistingData = async () => {
    try {
      // Check if we need to migrate existing data
      const migrationStatus = await window.aiAPI.getMigrationStatus();
      
      if (migrationStatus.success && migrationStatus.status?.needsMigration) {
        console.log('Migrating existing data to ChatBot system...');
        const migrationResult = await window.aiAPI.migrateExistingData();
        
        if (migrationResult.success) {
          console.log(`Successfully migrated ${migrationResult.migratedCount} documents`);
        } else {
          console.warn('Migration had some errors:', migrationResult.errors);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const addTestDocument = async () => {
    try {
      console.log('=== ADDING TEST DOCUMENT ===');
      
      const result = await window.aiAPI.addDocumentToLocalStorage({
        documentId: 'auto_test_doc_2',
        filename: 'Simple Test.docx',
        content: `This is a simple test document.
Hello world!
Testing the chatbot retrieval system.
Can you find this document?`,
        metadata: {
          type: 'test',
          timestamp: Date.now(),
        }
      });
      
      if (result.success) {
        console.log('✅ Test document added successfully');
        
        // Verify it was added
        const storedDocsResult = await window.aiAPI.getStoredDocuments();
        const storedDocs = storedDocsResult?.documents || [];
        console.log('Documents after adding test:', storedDocsResult);
        console.log('Number of documents:', storedDocs.length);
        console.log('Document details:', storedDocs.map((d: any) => ({
          id: d.id,
          filename: d.filename,
          hasContent: !!d.content,
          hasChunks: !!d.chunks,
          chunkCount: d.chunks?.length || 0
        })));
      } else {
        console.error('❌ Failed to add test document:', result.error);
      }
    } catch (error) {
      console.error('❌ Error adding test document:', error);
    }
  };

  const checkLocalStorageData = async () => {
    try {
      setDebugInfo('Checking local storage...');
      console.log('=== CHECKING LOCAL STORAGE DATA ===');
      
      // Check stored documents
      const storedDocsResult = await window.aiAPI.getStoredDocuments();
      const storedDocs = storedDocsResult?.documents || [];
      console.log('Stored documents:', storedDocs);
      console.log('Number of stored documents:', storedDocs?.length || 0);
      
      let debugMsg = `📊 Before Migration:\n`;
      debugMsg += `   Documents: ${storedDocs.length}\n\n`;
      
      // Check migration status
      const migrationStatus = await window.aiAPI.getMigrationStatus();
      console.log('Migration status:', migrationStatus);
      
      debugMsg += `📈 Migration Status:\n`;
      debugMsg += `   Total conversions: ${migrationStatus.status?.totalConversions || 0}\n`;
      debugMsg += `   Migrated docs: ${migrationStatus.status?.migratedDocuments || 0}\n`;
      debugMsg += `   Needs migration: ${migrationStatus.status?.needsMigration ? 'Yes' : 'No'}\n\n`;
      
      // Force migration
      console.log('Starting migration...');
      debugMsg += `🔄 Migrating...\n`;
      setDebugInfo(debugMsg);
      
      const migrationResult = await window.aiAPI.migrateExistingData();
      console.log('Migration result:', migrationResult);
      
      debugMsg += `   Migrated: ${migrationResult.migratedCount || 0} documents\n`;
      if (migrationResult.errors && migrationResult.errors.length > 0) {
        debugMsg += `   Errors: ${migrationResult.errors.length}\n`;
      }
      debugMsg += `\n`;
      
      // Check stored documents again
      const storedDocsAfterResult = await window.aiAPI.getStoredDocuments();
      const storedDocsAfter = storedDocsAfterResult?.documents || [];
      console.log('Stored documents after migration:', storedDocsAfter);
      console.log('Number of stored documents after migration:', storedDocsAfter?.length || 0);
      
      debugMsg += `✅ After Migration:\n`;
      debugMsg += `   Documents: ${storedDocsAfter.length}\n\n`;
      
      // Show detailed info about each document
      if (storedDocsAfter && storedDocsAfter.length > 0) {
        debugMsg += `📄 Document Details:\n`;
        storedDocsAfter.forEach((doc: any, index: number) => {
          console.log(`Document ${index + 1}:`, {
            id: doc.id,
            filename: doc.filename,
            contentLength: doc.content?.length || 0,
            chunkCount: doc.chunks?.length || 0,
            metadata: doc.metadata
          });
          debugMsg += `   ${index + 1}. ${doc.filename}\n`;
          debugMsg += `      Content: ${doc.content?.length || 0} chars\n`;
          debugMsg += `      Chunks: ${doc.chunks?.length || 0}\n`;
        });
      } else {
        debugMsg += '❌ No documents found after migration!\n';
        console.log('❌ No documents found after migration!');
      }
      
      setDebugInfo(debugMsg);
      console.log('=== END CHECK ===');
      
    } catch (error) {
      console.error('Error checking local storage data:', error);
      setDebugInfo(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkHealth = async () => {
    try {
      const result = await window.aiAPI.healthCheck();
      setHealthStatus(result.health);
      console.log('AI Health:', result);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) {
      console.log('Submit blocked:', { hasInput: !!input.trim(), isLoading });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    console.log('📤 Submitting message:', userMessage.content);

    // Safety timeout - if response takes too long, re-enable input
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Query timeout - re-enabling input');
      setIsLoading(false);
    }, 15000); // 15 second timeout

    try {
      console.log('🚀 ChatBot: Sending query to backend:', userMessage.content);
      
      const response = await window.aiAPI.chatQuery({
        userId: 'user_' + Date.now(),
        query: userMessage.content,
        options: {
          currency: 'TRY',
          topK: 50,
          locale: 'tr',
        },
      });

      console.log('📥 ChatBot: Received response:', response);

      if (response.success && response.payload) {
        console.log('✅ ChatBot: Response is successful');
        console.log('📊 ChatBot: Stats:', response.payload.stats);
        console.log('📄 ChatBot: Provenance count:', response.payload.provenance?.length || 0);
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.payload.answer,
          timestamp: new Date(),
          stats: response.payload.stats,
          provenance: response.payload.provenance,
          modelMeta: response.payload.modelMeta,
          lowConfidence: response.payload.lowConfidence,
          suggestedFollowUp: response.payload.suggestedFollowUp,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: response.error || 'Bir hata oluştu. Lütfen tekrar deneyin.',
          timestamp: new Date(),
          error: true,
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('❌ Chat query failed:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorgu işlenirken bir hata oluştu. BGE-M3 ve Mistral sunucularının çalıştığından emin olun.',
        timestamp: new Date(),
        error: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      clearTimeout(safetyTimeout);
      console.log('🔓 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const toggleProvenance = (messageId: string) => {
    setShowProvenance(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const formatCurrency = (amount: number, currency: string | null) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
            <p className="text-sm text-gray-500">Belgeleriniz hakkında sorular sorun</p>
          </div>
          
          {/* Health indicators */}
          {healthStatus && (
            <div className="flex items-center gap-2 text-xs">
              <div className={`flex items-center gap-1 ${healthStatus.embed ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus.embed ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                <span>BGE-M3</span>
              </div>
              <div className={`flex items-center gap-1 ${healthStatus.mistral ? 'text-green-600' : 'text-amber-600'}`}>
                {healthStatus.mistral ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                <span>Mistral</span>
              </div>
              <button
                onClick={addTestDocument}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Test Data
              </button>
              <button
                onClick={checkLocalStorageData}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                Check Data
              </button>
              <button
                onClick={async () => {
                  console.log('🔧 Running debug retrieval test...');
                  const result = await window.aiAPI.debugRetrieval();
                  console.log('Debug retrieval result:', result);
                  if (result.success) {
                    alert(`✅ Retrieval test passed!\n\nDocuments: ${result.documents?.length || 0}\nResults: ${result.retrievalResults?.length || 0}\n\nCheck console for details.`);
                  } else {
                    alert(`❌ Retrieval test failed:\n${result.error}\n\nCheck console for details.`);
                  }
                }}
                className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
              >
                Debug Test
              </button>
              <button
                onClick={() => {
                  setIsLoading(false);
                  console.log('🔄 Manually reset isLoading state');
                }}
                disabled={!isLoading}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Debug Info */}
        {debugInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="text-xs font-mono whitespace-pre-wrap text-gray-800">
                {debugInfo}
              </div>
              <button
                onClick={() => setDebugInfo('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {messages.length === 0 && !debugInfo ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-sm">Henüz mesaj yok</p>
              <p className="text-xs mt-1">Belgeleriniz hakkında bir soru sorun</p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500">Örnek sorular:</p>
                <div className="text-xs space-y-1">
                  <p>• "Hangi dosyalarım var?"</p>
                  <p>• "Son dönüştürme işlemlerim neler?"</p>
                  <p>• "PDF dosyalarımı göster"</p>
                </div>
              </div>
            </div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-black text-white'
                    : message.error
                    ? 'bg-red-50 border border-red-200 text-red-900'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Stats */}
                {message.stats && message.stats.count > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Adet:</span>{' '}
                      <span className="font-semibold">{message.stats.count}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Toplam:</span>{' '}
                      <span className="font-semibold">
                        {formatCurrency(message.stats.sum, message.stats.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ortalama:</span>{' '}
                      <span className="font-semibold">
                        {formatCurrency(message.stats.average, message.stats.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Medyan:</span>{' '}
                      <span className="font-semibold">
                        {formatCurrency(message.stats.median, message.stats.currency)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Provenance */}
                {message.provenance && message.provenance.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <button
                      onClick={() => toggleProvenance(message.id)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                      {showProvenance[message.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{message.provenance.length} kaynak göster</span>
                    </button>

                    {showProvenance[message.id] && (
                      <div className="mt-2 space-y-2">
                        {message.provenance.slice(0, 5).map((prov, idx) => (
                          <div key={prov.sectionId} className="text-xs bg-white p-2 rounded border border-gray-200">
                            <div className="flex items-center gap-1 text-gray-700 font-medium">
                              <FileText size={12} />
                              <span>{prov.filename}</span>
                              <span className="text-gray-400">• {(prov.similarity * 100).toFixed(1)}%</span>
                            </div>
                            <p className="mt-1 text-gray-600 truncate">{prov.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Model meta */}
                {message.modelMeta && (
                  <div className="mt-2 text-xs text-gray-400">
                    {message.modelMeta.model} • {message.modelMeta.latencyMs}ms
                    {message.modelMeta.fallback && (
                      <span className="ml-1 text-amber-600">(fallback)</span>
                    )}
                  </div>
                )}

                {/* Low confidence warning */}
                {message.lowConfidence && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>Düşük güven: Daha fazla veri gerekebilir</span>
                  </div>
                )}

                {/* Suggested follow-up */}
                {message.suggestedFollowUp && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    💡 {message.suggestedFollowUp}
                  </div>
                )}

                <div className="mt-1 text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString('tr-TR')}
                </div>
              </div>
            </div>
          ))
        ) : null}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm text-gray-600">Yanıt hazırlanıyor...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faturalarımın toplamı ne kadar?"
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            <span>Gönder</span>
          </button>
        </form>
      </div>
    </div>
  );
}

