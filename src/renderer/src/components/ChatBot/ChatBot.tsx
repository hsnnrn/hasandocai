/**
 * ChatBot Component - AI Chat with Document Assistant Mode
 * Supports localStorage document analysis
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, RefreshCw, Database } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
  meta?: any; // Document assistant metadata
}

interface LocalDocument {
  documentId: string;
  title: string;
  filename: string;
  fileType: string;
  textSections: Array<{
    id: string;
    content: string;
    contentLength: number;
  }>;
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 🆕 UNIFIED MODE: No more mode switching, always intelligent
  const [localDocs, setLocalDocs] = useState<LocalDocument[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  // 🆕 SUPABASE INTEGRATION
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseDocs, setSupabaseDocs] = useState<LocalDocument[]>([]);
  const [isLoadingSupabaseDocs, setIsLoadingSupabaseDocs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🆕 UNIFIED MODE: Always load documents on startup
  useEffect(() => {
    if (!docsLoaded) {
      loadDocuments(false);
    }
  }, [docsLoaded]);

  const loadSupabaseDocuments = async () => {
    setIsLoadingSupabaseDocs(true);
    
    console.log('🔄 Loading documents from Supabase...');
    
    try {
      // Get Supabase login data from localStorage
      const storedLogin = localStorage.getItem('supabase-login');
      
      if (!storedLogin) {
        console.warn('⚠️ No Supabase login data found');
        setSupabaseDocs([]);
        setIsLoadingSupabaseDocs(false);
        return;
      }
      
      const loginData = JSON.parse(storedLogin);
      const selectedProject = loginData.selectedProject;
      const anonKey = loginData.anonKey;
      const projectUrl = selectedProject?.project_api_url || `https://${selectedProject?.id}.supabase.co`;
      
      if (!selectedProject || !anonKey) {
        console.warn('⚠️ Supabase credentials incomplete');
        setSupabaseDocs([]);
        setIsLoadingSupabaseDocs(false);
        return;
      }
      
      console.log('📡 Fetching from Supabase project:', selectedProject.name);
      
      const result = await (window as any).electronAPI.getSupabaseDocumentsForChat({
        projectUrl,
        anonKey
      });
      
      console.log('📥 Supabase documents result:', result);
      
      if (result.success && result.documents) {
        setSupabaseDocs(result.documents);
        console.log(`✅ Loaded ${result.documents.length} documents from Supabase`);
      } else {
        console.error('❌ Failed to load Supabase documents:', result.error);
        setSupabaseDocs([]);
      }
    } catch (error) {
      console.error('❌ Failed to load Supabase documents:', error);
      setSupabaseDocs([]);
    } finally {
      setIsLoadingSupabaseDocs(false);
    }
  };
  
  // Load Supabase documents when toggle is enabled
  useEffect(() => {
    if (useSupabase) {
      loadSupabaseDocuments();
    } else {
      setSupabaseDocs([]);
    }
  }, [useSupabase]);

  const loadDocuments = async (forceReload: boolean = false) => {
    setIsLoadingDocs(true);
    
    console.log('🔄 Loading documents from AI Verileri... (force:', forceReload, ')');
    
    try {
      // ✅ DOĞRUDAN BGE-M3 ANALİZ VERİLERİNDEN AL
      const aiDataResult = await (window as any).electronAPI.persistentStorage.getAllData();
      
      console.log('📦 AI Verileri result:', aiDataResult);
      console.log('📊 Total items in storage:', aiDataResult.data?.length || 0);
      
      if (aiDataResult.success && aiDataResult.data && Array.isArray(aiDataResult.data)) {
        // DEBUG: Tüm verilerin metadata yapısını kontrol et
        console.log('🔍 DEBUG: All data items with metadata:', aiDataResult.data.map((item: any) => ({
          id: item.id,
          type: item.type,
          hasMetadata: !!item.metadata,
          model: item.metadata?.model,
          source: item.metadata?.source,
          hasContent: !!item.content,
          hasTextSections: !!item.content?.textSections,
          filename: item.content?.filename
        })));
        
        // ÖNCE TÜM ANALYSIS VERİLERİNİ AL (model/source kontrolü olmadan)
        const allAnalysisData = aiDataResult.data.filter((item: any) => {
          const isAnalysis = item.type === 'analysis';
          const hasContent = !!item.content;
          const hasTextSections = !!item.content?.textSections;
          const textSectionsLength = item.content?.textSections?.length || 0;
          
          console.log(`🔍 Checking item: ${item.id}`, {
            filename: item.content?.filename,
            type: item.type,
            isAnalysis,
            hasContent,
            hasTextSections,
            textSectionsLength
          });
          
          return isAnalysis && hasContent && hasTextSections;
        });
        
        console.log(`📊 Found ${allAnalysisData.length} analysis items (without model filter)`);
        console.log('📋 Analysis items:', allAnalysisData.map((item: any) => ({
          id: item.id,
          filename: item.content?.filename,
          sections: item.content?.textSections?.length || 0
        })));
        
        // TÜM ANALYSIS VERİLERİNİ KULLAN (BGE-M3 filtresi kaldırıldı)
        // Her türlü analysis kabul edilir (PDF, DOCX, Excel, PowerPoint)
        const analysisData = allAnalysisData;
        
        console.log(`📊 Analysis Data: Using ${analysisData.length} documents from ${aiDataResult.data.length} total items`);
        
        console.log('🔬 Using items:', analysisData.map((item: any) => ({
          id: item.id,
          model: item.metadata?.model,
          source: item.metadata?.source,
          filename: item.content?.filename,
          textSectionsCount: item.content?.textSections?.length || 0
        })));
        
        // LOCAL_DOCS formatına dönüştür
        const localDocs = analysisData.map((item: any) => {
          const content = item.content;
          const textSections = content.textSections || [];
          
          console.log(`📝 Converting to LOCAL_DOCS: ${content.filename}`, {
            documentId: content.documentId || item.id,
            title: content.title || content.filename,
            textSectionsCount: textSections.length
          });
          
          return {
            documentId: content.documentId || item.id,
            title: content.title || content.filename || item.id,
            filename: content.filename || 'unknown',
            fileType: content.fileType || 'UNKNOWN',
            textSections: textSections
          };
        }).filter((doc: any) => {
          const hasTextSections = doc.textSections.length > 0;
          console.log(`✅ Filter result for ${doc.filename}: ${hasTextSections ? 'INCLUDED' : 'EXCLUDED'} (${doc.textSections.length} sections)`);
          return hasTextSections;
        });
        
        setLocalDocs(localDocs);
        setDocsLoaded(true);
        console.log(`✅ Loaded ${localDocs.length} documents from AI Verileri for chatbot`);
        console.log('📄 Documents:', localDocs.map((d: any) => ({ 
          id: d.documentId, 
          filename: d.filename, 
          sections: d.textSections.length 
        })));
      } else {
        console.warn('⚠️ No AI data found in localStorage');
        console.warn('Result:', aiDataResult);
        setLocalDocs([]);
        setDocsLoaded(true);
      }
    } catch (error) {
      console.error('❌ Failed to load AI data:', error);
      setLocalDocs([]);
      setDocsLoaded(true);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Max message length (matches backend limit)
    const maxLength = 15000;
    const trimmedInput = input.trim();
    const isTooLong = trimmedInput.length > maxLength;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: isTooLong 
        ? trimmedInput.substring(0, maxLength) + '\n\n[Not: Mesaj 15.000 karakteri aştığı için burada kesildi]'
        : trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare conversation history (last 10 messages for context)
      // NOTE: Don't include the new user message as it's already in the prompt
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      console.log('📜 Conversation History (sending to backend):', {
        historyLength: conversationHistory.length,
        messagesLength: messages.length,
        history: conversationHistory.map(h => ({ role: h.role, content: h.content.substring(0, 50) + '...' }))
      });

      // 🆕 SUPABASE MODE: If Supabase is enabled, use ONLY Supabase docs (not combined)
      const allDocs = useSupabase ? supabaseDocs : localDocs;
      
      console.log('🔍 Intelligent chat query:', {
        localDocsCount: localDocs.length,
        supabaseDocsCount: supabaseDocs.length,
        totalDocs: allDocs.length,
        useSupabase
      });
      console.log('📋 Combined docs:', allDocs.map(d => ({ filename: d.filename, sections: d.textSections.length })));
      
      if (allDocs.length === 0) {
        console.warn('⚠️ No localDocs available - will use simple chat fallback');
        // Fallback to simple chat if no docs
        const response = await (window as any).aiAPI.chatQuery({
          userId: 'user_' + Date.now(),
          query: userMessage.content,
          conversationHistory: conversationHistory
        });

        if (response.success && response.payload) {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: response.payload.answer,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: response.error || 'Bir hata oluştu.',
            timestamp: new Date(),
            error: true,
          };
          setMessages(prev => [...prev, errorMessage]);
        }
        setIsLoading(false);
        return;
      }

      console.log('✅ Sending to AI with', allDocs.length, 'documents');
      console.log('📤 Request payload:', {
        query: userMessage.content,
        docsCount: allDocs.length,
        firstDoc: allDocs[0],
        useSupabase,
        options: {
          compute: true,
          showRaw: false,
          maxRefs: 5,
          locale: 'tr-TR',
        }
      });
      
      // 🆕 UNIFIED MODE: Always use documentChatQuery (backend handles intent classification)
      const response = await (window as any).aiAPI.documentChatQuery({
        userId: 'user_' + Date.now(),
        query: userMessage.content,
        localDocs: allDocs,
        options: {
          compute: true, // Auto-compute numeric aggregates
          showRaw: false,
          maxRefs: 5,
          locale: 'tr-TR',
        },
        conversationHistory: conversationHistory
      });

      console.log('📥 AI Response:', response);

      if (response.success && response.payload) {
        let content = response.payload.answer;
        
        // ONLY add sources for DOCUMENT_QUERY (not for meta_query or casual_chat)
        const queryType = response.payload.meta?.query_type;
        const isCasualOrMeta = queryType === 'casual_chat' || queryType === 'meta_query';
        
        if (!isCasualOrMeta) {
          // Parse AI response for embedded sources (new format from LLM)
          // Format: "Answer text\n\nKaynaklar:\n- filename: excerpt (İlgililik: %95)"
          const hasEmbeddedSources = content.includes('Kaynaklar:');
          
          // If no embedded sources, add backend-provided references
          if (!hasEmbeddedSources && response.payload.meta?.foundReferences?.length > 0) {
            content += '\n\n📚 Kaynaklar:\n';
            response.payload.meta.foundReferences.slice(0, 3).forEach((ref: any) => {
              const excerpt = ref.excerpt?.substring(0, 120) || 'N/A';
              content += `- ${ref.filename}: "${excerpt}" (İlgililik: ${(ref.relevanceScore * 100).toFixed(0)}%)\n`;
            });
          }

          // Add numeric info if available (only if not already in answer)
          if (response.payload.meta?.aggregatesSuggested && 
              response.payload.meta.aggregatesSuggested.count > 0 &&
              !content.includes('toplam') && !content.includes('Toplam')) {
            const agg = response.payload.meta.aggregatesSuggested;
            content += `\n\n💡 İstatistikler: ${agg.count} değer, Toplam: ${agg.sum?.toLocaleString('tr-TR')}`;
          }
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: content,
          timestamp: new Date(),
          meta: response.payload.meta,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: response.error || 'Bir hata oluştu.',
          timestamp: new Date(),
          error: true,
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'AI sunucusuna bağlanılamadı. Lütfen Ollama\'nın çalıştığından emin olun.',
        timestamp: new Date(),
        error: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
            {messages.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {messages.length} mesaj · Hafıza aktif (son {Math.min(10, messages.length)} mesaj)
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Konuşmayı temizle"
              >
                <Trash2 size={16} />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* 🆕 UNIFIED MODE: Single status bar with document info */}
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isLoadingDocs ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Loader2 className="animate-spin" size={14} />
                  <span>Belgeler yükleniyor...</span>
                </div>
              ) : (
                <div className="text-sm text-gray-700">
                  {useSupabase ? (
                    // Supabase modu aktif - sadece Supabase belgeleri
                    supabaseDocs.length > 0 ? (
                      <div>
                        Supabase: {supabaseDocs.length} belge 
                        ({supabaseDocs.reduce((acc, doc) => acc + doc.textSections.length, 0)} bölüm)
                        <span className="ml-2 text-xs text-gray-500">· Sadece Supabase verileri</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        Supabase aktif · Henüz belge yok
                      </div>
                    )
                  ) : (
                    // Local modu aktif
                    localDocs.length > 0 ? (
                      <div>
                        Local: {localDocs.length} belge 
                        ({localDocs.reduce((acc, doc) => acc + doc.textSections.length, 0)} bölüm)
                        <span className="ml-2 text-xs text-gray-500">· Sadece yerel belgeler</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">Basit sohbet modu · Belgelerinizi yükleyin</div>
                    )
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Supabase Toggle */}
              <button
                onClick={() => setUseSupabase(!useSupabase)}
                disabled={isLoadingSupabaseDocs}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                  useSupabase
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50`}
                title={useSupabase ? 'Supabase belgelerini kullanıyor' : 'Supabase belgelerini kullanmıyor'}
              >
                {isLoadingSupabaseDocs ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Database size={14} />
                )}
                <span>Supabase</span>
              </button>
              
              <button
                onClick={() => {
                  setDocsLoaded(false);
                  loadDocuments(true);
                }}
                disabled={isLoadingDocs}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Belgeleri yeniden yükle"
              >
                <RefreshCw size={16} className={isLoadingDocs ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md">
              <p className="text-sm mb-4 text-gray-500">Merhaba! Size nasıl yardımcı olabilirim?</p>
              <div className="text-xs text-left bg-gray-50 border border-gray-200 p-3 rounded">
                <p className="font-semibold mb-2 text-gray-700">Örnek Sorular</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Genel:</strong> "Merhaba", "Nasılsın?", "Yardım"</li>
                  <li>• <strong>Dokümanlar:</strong> "Hangi belgeler var?", "photobox"</li>
                  <li>• <strong>Analiz:</strong> "Fatura tutarı nedir?", "Excel özetle"</li>
                  <li>• <strong>Hesaplama:</strong> "Toplam kaç kişi var?"</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  AI otomatik olarak sorunuzu anlayıp doğru şekilde yanıt verecek
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded p-3 ${
                  message.type === 'user'
                    ? 'bg-black text-white'
                    : message.error
                    ? 'bg-gray-50 border border-gray-300 text-gray-900'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                <div className={`mt-1 text-xs ${message.type === 'user' ? 'text-gray-300' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString('tr-TR')}
                  {message.meta && message.meta.query_type === 'document_query' && (
                    <span className="ml-2">
                      · {message.meta.foundReferences?.length || message.meta.sources?.length || 0} kaynak
                      {message.meta.confidence !== undefined && (
                        <span className="ml-1">· Güven: {(message.meta.confidence * 100).toFixed(0)}%</span>
                      )}
                    </span>
                  )}
                  {message.meta && message.meta.query_type === 'casual_chat' && (
                    <span className="ml-2">· Sohbet</span>
                  )}
                  {message.meta && message.meta.query_type === 'meta_query' && (
                    <span className="ml-2">· Bilgi</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded p-3 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm text-gray-600">
                Düşünüyorum...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Belgeleriniz veya genel konular hakkında soru sorun... (Max 15.000 karakter)"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              rows={3}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 h-fit"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              <span>Gönder</span>
            </button>
          </div>
          {input.length > 0 && (
            <div className="flex justify-between text-xs">
              <span className={input.length > 15000 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {input.length.toLocaleString('tr-TR')} / 15.000 karakter
                {input.length > 15000 && ' (Limit aşıldı! Mesaj kısaltılacak)'}
              </span>
              <span className="text-gray-400">
                Shift + Enter: Yeni satır · Enter: Gönder
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
