/**
 * AI Chat Component - RAG Integration Test
 * 
 * Bu component AI chat entegrasyonunu test etmek için kullanılır.
 * Minimal UI ile RAG chat yeteneklerini gösterir.
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Array<{
    content: string;
    score: number;
    metadata: any;
  }>;
}

interface AIStatus {
  initialized: boolean;
  modelPath: string;
  vectorDbUrl: string;
  embeddingDimension: number;
}

export const AIChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize AI service on component mount
  useEffect(() => {
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      console.log('🤖 Initializing AI service...');
      const result = await window.electronAPI.initializeAI();
      
      if (result.success) {
        console.log('✅ AI service initialized');
        setIsInitialized(true);
        
        // Get AI status
        const statusResult = await window.electronAPI.getAIStatus();
        if (statusResult.success) {
          setAiStatus(statusResult.status);
        }
      } else {
        console.error('❌ AI initialization failed:', result.error);
        addMessage('system', `AI initialization failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ AI initialization error:', error);
      addMessage('system', `AI initialization error: ${error}`);
    }
  };

  const addMessage = (type: 'user' | 'ai' | 'system', content: string, sources?: any[]) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: type as 'user' | 'ai',
      content,
      timestamp: new Date(),
      sources
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addMessage('user', userMessage);

    try {
      console.log('🤔 Sending query to AI:', userMessage);
      
      const result = await window.electronAPI.queryAI({
        question: userMessage,
        maxTokens: 512,
        temperature: 0.7,
        topK: 4
      });

      if (result.success) {
        console.log('✅ AI response received:', result.answer);
        addMessage('ai', result.answer || 'No response', result.sources);
      } else {
        console.error('❌ AI query failed:', result.error);
        addMessage('ai', `Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ AI query error:', error);
      addMessage('ai', `Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const testIndexing = async () => {
    try {
      console.log('📚 Testing text indexing...');
      
      const testSections = [
        {
          id: 'test_1',
          content: 'Bu bir test belgesidir. AI chat entegrasyonu test ediliyor.',
          metadata: { source: 'test', type: 'sample' }
        },
        {
          id: 'test_2', 
          content: 'RAG (Retrieval-Augmented Generation) sistemi çalışıyor.',
          metadata: { source: 'test', type: 'sample' }
        }
      ];

      const result = await window.electronAPI.indexTextSections({
        textSections: testSections,
        documentId: 'test_document'
      });

      if (result.success) {
        console.log(`✅ Indexed ${result.indexedCount} test sections`);
        addMessage('system', `✅ Indexed ${result.indexedCount} test sections`);
      } else {
        console.error('❌ Indexing failed:', result.error);
        addMessage('system', `❌ Indexing failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Indexing error:', error);
      addMessage('system', `❌ Indexing error: ${error}`);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">AI Chat - RAG Integration</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded ${isInitialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            AI Status: {isInitialized ? 'Ready' : 'Not Ready'}
          </span>
          {aiStatus && (
            <span className="text-xs">
              Model: {aiStatus.modelPath.split('/').pop()}
            </span>
          )}
        </div>
      </div>

      {/* Test Button */}
      <div className="mb-4">
        <Button 
          onClick={testIndexing}
          variant="outline"
          size="sm"
          disabled={!isInitialized}
        >
          Test Indexing
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 p-4 mb-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'ai'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 text-xs opacity-75">
                    <div className="font-semibold">Sources:</div>
                    {message.sources.slice(0, 2).map((source, idx) => (
                      <div key={idx} className="truncate">
                        {source.content.substring(0, 100)}...
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask AI a question..."
          disabled={!isInitialized || isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!isInitialized || isLoading || !inputValue.trim()}
        >
          Send
        </Button>
      </div>

      {/* Status Info */}
      {aiStatus && (
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <div>Model Path: {aiStatus.modelPath}</div>
          <div>Vector DB: {aiStatus.vectorDbUrl}</div>
          <div>Embedding Dim: {aiStatus.embeddingDimension}</div>
        </div>
      )}
    </div>
  );
};
