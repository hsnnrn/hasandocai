/**
 * AI Chat Page - RAG Integration Test Page
 * 
 * Bu sayfa AI chat entegrasyonunu test etmek için kullanılır.
 */

import React from 'react';
import { AIChatComponent } from '../components/AIChatComponent';

export const AIChatPage: React.FC = () => {
  return (
    <div className="h-full">
      <AIChatComponent />
    </div>
  );
};
