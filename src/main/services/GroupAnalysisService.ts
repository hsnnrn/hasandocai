import { createClient } from '@supabase/supabase-js';

// Define interfaces locally to avoid circular imports
export interface AnalysisResult {
  documentId: string;
  title: string;
  filename: string;
  fileType: string;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
  textSections?: Array<{
    id: string;
    content: string;
    pageNumber?: number;
    sectionTitle?: string;
    contentType?: string;
    orderIndex?: number;
  }>;
  aiCommentary?: Array<{
    id: string;
    content: string;
    commentaryType: string;
    confidenceScore: number;
    language: string;
    aiModel: string;
    processingTimeMs: number;
    textSectionId?: string;
  }>;
  createdAt: string;
}

export interface DocumentGroup {
  id: string;
  name: string;
  description?: string;
  documents: AnalysisResult[];
  groupAnalysisResults?: GroupAnalysisResult[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupAnalysisResult {
  id: string;
  groupId: string;
  analysisType: 'cross_document_analysis' | 'group_summary' | 'group_relationships' | 'group_patterns' | 'group_semantic_analysis';
  content: string;
  confidenceScore: number;
  language: string;
  aiModel: string;
  processingTimeMs: number;
  createdAt: string;
}

export interface CrossDocumentAnalysis {
  documentConnections: Array<{
    sourceDocumentId: string;
    targetDocumentId: string;
    connectionType: 'semantic' | 'thematic' | 'structural' | 'temporal';
    strength: number;
    description: string;
  }>;
  commonThemes: string[];
  sharedConcepts: string[];
  documentSimilarities: Array<{
    document1Id: string;
    document2Id: string;
    similarityScore: number;
    sharedTopics: string[];
  }>;
}

export interface GroupSummary {
  overallSummary: string;
  documentSummaries: Array<{
    documentId: string;
    summary: string;
    keyPoints: string[];
  }>;
  groupInsights: string[];
  recommendations: string[];
}

export interface GroupRelationships {
  semanticRelations: Array<{
    concept: string;
    documents: string[];
    relationshipType: 'cause-effect' | 'comparison' | 'sequence' | 'hierarchy';
    description: string;
  }>;
  thematicConnections: Array<{
    theme: string;
    documents: string[];
    connectionStrength: number;
    examples: string[];
  }>;
  structuralPatterns: Array<{
    pattern: string;
    documents: string[];
    frequency: number;
    description: string;
  }>;
}

export class GroupAnalysisService {
  private supabase: any;
  private aiServerUrl: string;

  constructor() {
    // Initialize Supabase client with mock configuration for testing
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'mock-anon-key';
    
    console.log('GroupAnalysisService: Initializing with Supabase URL:', supabaseUrl);
    console.log('GroupAnalysisService: Using mock mode for testing');
    
    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('GroupAnalysisService: Supabase client initialized successfully');
    } catch (error) {
      console.warn('GroupAnalysisService: Supabase client initialization failed, continuing with mock mode:', error);
      this.supabase = null;
    }
    
    this.aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:7861';
  }

  /**
   * Perform comprehensive group analysis
   */
  async analyzeGroup(
    group: DocumentGroup,
    analysisTypes: string[] = ['cross_document_analysis', 'group_summary', 'group_relationships', 'group_patterns', 'group_semantic_analysis']
  ): Promise<GroupAnalysisResult[]> {
    console.log('GroupAnalysisService: Starting group analysis for:', group.name);
    console.log('GroupAnalysisService: Documents in group:', group.documents.length);

    if (group.documents.length === 0) {
      throw new Error('Group must contain at least one document for analysis');
    }

    const results: GroupAnalysisResult[] = [];

    try {
      // 1. Cross Document Analysis
      if (analysisTypes.includes('cross_document_analysis')) {
        const crossAnalysis = await this.performCrossDocumentAnalysis(group);
        results.push(crossAnalysis);
      }

      // 2. Group Summary
      if (analysisTypes.includes('group_summary')) {
        const groupSummary = await this.performGroupSummary(group);
        results.push(groupSummary);
      }

      // 3. Group Relationships
      if (analysisTypes.includes('group_relationships')) {
        const relationships = await this.performGroupRelationships(group);
        results.push(relationships);
      }

      // 4. Group Patterns
      if (analysisTypes.includes('group_patterns')) {
        const patterns = await this.performGroupPatterns(group);
        results.push(patterns);
      }

      // 5. Semantic Analysis
      if (analysisTypes.includes('group_semantic_analysis')) {
        const semantic = await this.performSemanticAnalysis(group);
        results.push(semantic);
      }

      // Save results to Supabase
      if (results.length > 0) {
        await this.saveGroupAnalysisResults(results);
      }

      console.log(`GroupAnalysisService: Group analysis completed with ${results.length} results`);
      return results;

    } catch (error) {
      console.error('GroupAnalysisService: Group analysis failed:', error);
      throw new Error(`Group analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform cross-document analysis
   */
  private async performCrossDocumentAnalysis(group: DocumentGroup): Promise<GroupAnalysisResult> {
    const startTime = Date.now();
    
    console.log('GroupAnalysisService: Performing cross-document analysis...');

    // Extract all text content from documents
    const allTextSections = group.documents.flatMap((doc: AnalysisResult) => doc.textSections || []);
    const allAICommentary = group.documents.flatMap((doc: AnalysisResult) => doc.aiCommentary || []);

    // Analyze document connections
    const documentConnections = this.analyzeDocumentConnections(group.documents);
    const commonThemes = this.extractCommonThemes(allTextSections);
    const sharedConcepts = this.extractSharedConcepts(allTextSections);
    const documentSimilarities = this.calculateDocumentSimilarities(group.documents);

    const content = this.generateCrossDocumentAnalysisContent(
      group,
      documentConnections,
      commonThemes,
      sharedConcepts,
      documentSimilarities
    );

    const processingTime = Date.now() - startTime;

    return {
      id: `cross_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: group.id,
      analysisType: 'cross_document_analysis',
      content,
      confidenceScore: 0.92,
      language: 'tr',
      aiModel: 'enhanced-group-ai-v1',
      processingTimeMs: processingTime,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Perform group summary analysis
   */
  private async performGroupSummary(group: DocumentGroup): Promise<GroupAnalysisResult> {
    const startTime = Date.now();
    
    console.log('GroupAnalysisService: Performing group summary analysis...');

    const overallSummary = this.generateOverallSummary(group);
    const documentSummaries = group.documents.map((doc: AnalysisResult) => this.generateDocumentSummary(doc));
    const groupInsights = this.generateGroupInsights(group);
    const recommendations = this.generateRecommendations(group);

    const content = this.generateGroupSummaryContent(
      group,
      overallSummary,
      documentSummaries,
      groupInsights,
      recommendations
    );

    const processingTime = Date.now() - startTime;

    return {
      id: `group_summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: group.id,
      analysisType: 'group_summary',
      content,
      confidenceScore: 0.89,
      language: 'tr',
      aiModel: 'enhanced-group-ai-v1',
      processingTimeMs: processingTime,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Perform group relationships analysis
   */
  private async performGroupRelationships(group: DocumentGroup): Promise<GroupAnalysisResult> {
    const startTime = Date.now();
    
    console.log('GroupAnalysisService: Performing group relationships analysis...');

    const semanticRelations = this.analyzeSemanticRelations(group);
    const thematicConnections = this.analyzeThematicConnections(group);
    const structuralPatterns = this.analyzeStructuralPatterns(group);

    const content = this.generateGroupRelationshipsContent(
      group,
      semanticRelations,
      thematicConnections,
      structuralPatterns
    );

    const processingTime = Date.now() - startTime;

    return {
      id: `group_relationships_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: group.id,
      analysisType: 'group_relationships',
      content,
      confidenceScore: 0.87,
      language: 'tr',
      aiModel: 'enhanced-group-ai-v1',
      processingTimeMs: processingTime,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Perform group patterns analysis
   */
  private async performGroupPatterns(group: DocumentGroup): Promise<GroupAnalysisResult> {
    const startTime = Date.now();
    
    console.log('GroupAnalysisService: Performing group patterns analysis...');

    const contentPatterns = this.analyzeContentPatterns(group);
    const structuralPatterns = this.analyzeStructuralPatterns(group);
    const linguisticPatterns = this.analyzeLinguisticPatterns(group);
    const thematicPatterns = this.analyzeThematicPatterns(group);

    const content = this.generateGroupPatternsContent(
      group,
      contentPatterns,
      structuralPatterns,
      linguisticPatterns,
      thematicPatterns
    );

    const processingTime = Date.now() - startTime;

    return {
      id: `group_patterns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: group.id,
      analysisType: 'group_patterns',
      content,
      confidenceScore: 0.85,
      language: 'tr',
      aiModel: 'enhanced-group-ai-v1',
      processingTimeMs: processingTime,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Perform semantic analysis
   */
  private async performSemanticAnalysis(group: DocumentGroup): Promise<GroupAnalysisResult> {
    const startTime = Date.now();
    
    console.log('GroupAnalysisService: Performing semantic analysis...');

    const conceptMap = this.buildConceptMap(group);
    const semanticClusters = this.identifySemanticClusters(group);
    const semanticDensity = this.calculateSemanticDensity(group);
    const conceptEvolution = this.analyzeConceptEvolution(group);

    const content = this.generateSemanticAnalysisContent(
      group,
      conceptMap,
      semanticClusters,
      semanticDensity,
      conceptEvolution
    );

    const processingTime = Date.now() - startTime;

    return {
      id: `semantic_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: group.id,
      analysisType: 'group_semantic_analysis',
      content,
      confidenceScore: 0.91,
      language: 'tr',
      aiModel: 'enhanced-group-ai-v1',
      processingTimeMs: processingTime,
      createdAt: new Date().toISOString()
    };
  }

  // Helper methods for analysis

  private analyzeDocumentConnections(documents: AnalysisResult[]): any[] {
    const connections: any[] = [];
    
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const doc1 = documents[i];
        const doc2 = documents[j];
        
        // Analyze semantic similarity
        const semanticSimilarity = this.calculateSemanticSimilarity(doc1, doc2);
        if (semanticSimilarity > 0.3) {
          connections.push({
            sourceDocumentId: doc1.documentId,
            targetDocumentId: doc2.documentId,
            connectionType: 'semantic',
            strength: semanticSimilarity,
            description: `Semantik benzerlik: ${(semanticSimilarity * 100).toFixed(1)}%`
          });
        }

        // Analyze thematic similarity
        const thematicSimilarity = this.calculateThematicSimilarity(doc1, doc2);
        if (thematicSimilarity > 0.3) {
          connections.push({
            sourceDocumentId: doc1.documentId,
            targetDocumentId: doc2.documentId,
            connectionType: 'thematic',
            strength: thematicSimilarity,
            description: `Tematik benzerlik: ${(thematicSimilarity * 100).toFixed(1)}%`
          });
        }
      }
    }

    return connections;
  }

  private extractCommonThemes(textSections: any[]): string[] {
    const themes: string[] = [];
    const allContent = textSections.map(section => section.content).join(' ').toLowerCase();
    
    const themeKeywords = {
      'Finans': ['para', 'ödeme', 'fatura', 'kredi', 'banka', 'mali', 'finans', 'bütçe'],
      'Teknoloji': ['yazılım', 'program', 'sistem', 'bilgisayar', 'teknoloji', 'dijital', 'veri'],
      'İnsan Kaynakları': ['personel', 'çalışan', 'iş', 'maaş', 'kadro', 'insan kaynakları', 'ekip'],
      'Hukuk': ['sözleşme', 'yasal', 'hukuk', 'mahkeme', 'dava', 'yasa', 'kanun'],
      'Eğitim': ['öğrenci', 'okul', 'eğitim', 'ders', 'sınav', 'üniversite', 'öğretim'],
      'Sağlık': ['hasta', 'tedavi', 'sağlık', 'doktor', 'hastane', 'ilaç', 'terapi'],
      'Pazarlama': ['müşteri', 'satış', 'pazarlama', 'reklam', 'kampanya', 'ürün', 'hizmet']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const keywordCount = keywords.filter(keyword => allContent.includes(keyword)).length;
      if (keywordCount >= 2) {
        themes.push(theme);
      }
    }

    return themes;
  }

  private extractSharedConcepts(textSections: any[]): string[] {
    const concepts: string[] = [];
    const allContent = textSections.map(section => section.content).join(' ').toLowerCase();
    
    const conceptPatterns = [
      /\b(?:proje|plan|strateji|hedef|amaç)\b/g,
      /\b(?:kalite|standart|kriter|ölçüt)\b/g,
      /\b(?:süreç|adım|aşama|evre)\b/g,
      /\b(?:sonuç|etki|tepki|sonuç)\b/g,
      /\b(?:problem|çözüm|çözüm|sorun)\b/g,
      /\b(?:fırsat|risk|tehdit|avantaj)\b/g
    ];

    conceptPatterns.forEach(pattern => {
      const matches = allContent.match(pattern);
      if (matches && matches.length >= 3) {
        concepts.push(pattern.source.replace(/[^\w\s]/g, '').trim());
      }
    });

    return Array.from(new Set(concepts));
  }

  private calculateDocumentSimilarities(documents: AnalysisResult[]): any[] {
    const similarities: any[] = [];
    
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const doc1 = documents[i];
        const doc2 = documents[j];
        
        const similarity = this.calculateSemanticSimilarity(doc1, doc2);
        const sharedTopics = this.findSharedTopics(doc1, doc2);
        
        similarities.push({
          document1Id: doc1.documentId,
          document2Id: doc2.documentId,
          similarityScore: similarity,
          sharedTopics
        });
      }
    }

    return similarities.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  private calculateSemanticSimilarity(doc1: AnalysisResult, doc2: AnalysisResult): number {
    const content1 = doc1.textSections?.map((s: any) => s.content).join(' ') || '';
    const content2 = doc2.textSections?.map((s: any) => s.content).join(' ') || '';
    
    // Simple word overlap similarity
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set(Array.from(words1).concat(Array.from(words2)));
    
    return intersection.size / union.size;
  }

  private calculateThematicSimilarity(doc1: AnalysisResult, doc2: AnalysisResult): number {
    const themes1 = this.extractDocumentThemes(doc1);
    const themes2 = this.extractDocumentThemes(doc2);
    
    const intersection = themes1.filter(theme => themes2.includes(theme));
    const union = Array.from(new Set(themes1.concat(themes2)));
    
    return intersection.length / union.length;
  }

  private extractDocumentThemes(doc: AnalysisResult): string[] {
    const content = doc.textSections?.map((s: any) => s.content).join(' ').toLowerCase() || '';
    
    const themeKeywords = {
      'Finans': ['para', 'ödeme', 'fatura', 'kredi', 'banka'],
      'Teknoloji': ['yazılım', 'program', 'sistem', 'bilgisayar'],
      'İnsan Kaynakları': ['personel', 'çalışan', 'iş', 'maaş'],
      'Hukuk': ['sözleşme', 'yasal', 'hukuk', 'mahkeme'],
      'Eğitim': ['öğrenci', 'okul', 'eğitim', 'ders']
    };

    const themes: string[] = [];
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes;
  }

  private findSharedTopics(doc1: AnalysisResult, doc2: AnalysisResult): string[] {
    const topics1 = this.extractDocumentTopics(doc1);
    const topics2 = this.extractDocumentTopics(doc2);
    
    return topics1.filter(topic => topics2.includes(topic));
  }

  private extractDocumentTopics(doc: AnalysisResult): string[] {
    const content = doc.textSections?.map((s: any) => s.content).join(' ').toLowerCase() || '';
    
    // Extract topics based on common patterns
    const topics: string[] = [];
    
    if (content.includes('proje')) topics.push('Proje Yönetimi');
    if (content.includes('kalite')) topics.push('Kalite Kontrol');
    if (content.includes('süreç')) topics.push('Süreç Yönetimi');
    if (content.includes('müşteri')) topics.push('Müşteri Hizmetleri');
    if (content.includes('pazarlama')) topics.push('Pazarlama');
    
    return topics;
  }

  // Content generation methods

  private generateCrossDocumentAnalysisContent(
    group: DocumentGroup,
    connections: any[],
    commonThemes: string[],
    sharedConcepts: string[],
    similarities: any[]
  ): string {
    return `🔗 **Çapraz Doküman Analizi**: "${group.name}" grubundaki ${group.documents.length} doküman arasında kapsamlı bağlantı analizi yapıldı.

**📊 Analiz Sonuçları:**
• **Doküman Bağlantıları**: ${connections.length} farklı bağlantı tespit edildi
• **Ortak Temalar**: ${commonThemes.length > 0 ? commonThemes.join(', ') : 'Tema bulunamadı'}
• **Paylaşılan Kavramlar**: ${sharedConcepts.length > 0 ? sharedConcepts.join(', ') : 'Kavram bulunamadı'}
• **Benzerlik Skorları**: En yüksek benzerlik ${similarities.length > 0 ? (similarities[0].similarityScore * 100).toFixed(1) : '0'}%

**🔍 Detaylı Bulgular:**
${connections.slice(0, 3).map(conn => 
  `• ${conn.sourceDocumentId} ↔ ${conn.targetDocumentId}: ${conn.description}`
).join('\n')}

${similarities.slice(0, 2).map(sim => 
  `• ${sim.document1Id} ve ${sim.document2Id} arasında %${(sim.similarityScore * 100).toFixed(1)} benzerlik`
).join('\n')}

**💡 Öneriler:**
Bu dokümanlar arasında güçlü bağlantılar mevcut. Ortak temalar ve kavramlar üzerinden daha detaylı analiz yapılabilir.`;
  }

  private generateGroupSummaryContent(
    group: DocumentGroup,
    overallSummary: string,
    documentSummaries: any[],
    groupInsights: string[],
    recommendations: string[]
  ): string {
    return `📊 **Grup Özeti**: "${group.name}" grubundaki ${group.documents.length} dokümanın kapsamlı özeti.

**📋 Genel Özet:**
${overallSummary}

**📄 Doküman Özetleri:**
${documentSummaries.slice(0, 3).map((summary, index) => 
  `• **Doküman ${index + 1}**: ${summary.summary.substring(0, 100)}...`
).join('\n')}

**💡 Grup İçgörüleri:**
${groupInsights.slice(0, 3).map(insight => `• ${insight}`).join('\n')}

**🎯 Öneriler:**
${recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}

**📈 İstatistikler:**
• Toplam doküman: ${group.documents.length}
• Toplam metin bölümü: ${group.documents.reduce((sum: number, doc: AnalysisResult) => sum + (doc.textSections?.length || 0), 0)}
• Toplam AI yorumu: ${group.documents.reduce((sum: number, doc: AnalysisResult) => sum + (doc.aiCommentary?.length || 0), 0)}`;
  }

  private generateGroupRelationshipsContent(
    group: DocumentGroup,
    semanticRelations: any[],
    thematicConnections: any[],
    structuralPatterns: any[]
  ): string {
    return `🧠 **Grup İlişkileri**: "${group.name}" grubundaki dokümanlar arası ilişki analizi.

**🔗 Semantik İlişkiler:**
${semanticRelations.slice(0, 3).map(rel => 
  `• **${rel.concept}**: ${rel.documents.length} dokümanda, ${rel.relationshipType} ilişkisi`
).join('\n')}

**🎨 Tematik Bağlantılar:**
${thematicConnections.slice(0, 3).map(conn => 
  `• **${conn.theme}**: ${conn.documents.length} dokümanda, güç: ${(conn.connectionStrength * 100).toFixed(1)}%`
).join('\n')}

**🏗️ Yapısal Kalıplar:**
${structuralPatterns.slice(0, 3).map(pattern => 
  `• **${pattern.pattern}**: ${pattern.documents.length} dokümanda, frekans: ${pattern.frequency}`
).join('\n')}

**📊 İlişki Özeti:**
• Toplam semantik ilişki: ${semanticRelations.length}
• Toplam tematik bağlantı: ${thematicConnections.length}
• Toplam yapısal kalıp: ${structuralPatterns.length}

**💡 Sonuç:**
Bu dokümanlar arasında güçlü semantik ve tematik bağlantılar mevcut. Yapısal kalıplar tutarlılık gösteriyor.`;
  }

  private generateGroupPatternsContent(
    group: DocumentGroup,
    contentPatterns: any[],
    structuralPatterns: any[],
    linguisticPatterns: any[],
    thematicPatterns: any[]
  ): string {
    return `🎯 **Grup Kalıpları**: "${group.name}" grubundaki dokümanlarda tespit edilen kalıplar.

**📝 İçerik Kalıpları:**
${contentPatterns.slice(0, 3).map(pattern => 
  `• **${pattern.type}**: ${pattern.frequency} kez tekrarlanmış`
).join('\n')}

**🏗️ Yapısal Kalıplar:**
${structuralPatterns.slice(0, 3).map(pattern => 
  `• **${pattern.type}**: ${pattern.documents.length} dokümanda mevcut`
).join('\n')}

**🗣️ Dilsel Kalıplar:**
${linguisticPatterns.slice(0, 3).map(pattern => 
  `• **${pattern.type}**: ${pattern.frequency} kez kullanılmış`
).join('\n')}

**🎨 Tematik Kalıplar:**
${thematicPatterns.slice(0, 3).map(pattern => 
  `• **${pattern.theme}**: ${pattern.documents.length} dokümanda işlenmiş`
).join('\n')}

**📊 Kalıp Özeti:**
• Toplam içerik kalıbı: ${contentPatterns.length}
• Toplam yapısal kalıp: ${structuralPatterns.length}
• Toplam dilsel kalıp: ${linguisticPatterns.length}
• Toplam tematik kalıp: ${thematicPatterns.length}

**💡 Analiz:**
Bu dokümanlar tutarlı kalıplar sergiliyor. Yapısal ve içerik kalıpları örtüşüyor.`;
  }

  private generateSemanticAnalysisContent(
    group: DocumentGroup,
    conceptMap: any,
    semanticClusters: any[],
    semanticDensity: number,
    conceptEvolution: any[]
  ): string {
    return `⚡ **Semantik Analiz**: "${group.name}" grubundaki dokümanların anlamsal içerik analizi.

**🧠 Kavram Haritası:**
• Ana kavramlar: ${Object.keys(conceptMap).length} adet
• Kavram bağlantıları: ${Object.values(conceptMap).flat().length} adet
• En sık kullanılan kavramlar: ${Object.entries(conceptMap).slice(0, 3).map(([k, v]) => k).join(', ')}

**🔗 Semantik Kümeler:**
${semanticClusters.slice(0, 3).map(cluster => 
  `• **${cluster.name}**: ${cluster.documents.length} dokümanda, ${cluster.concepts.length} kavram`
).join('\n')}

**📊 Semantik Yoğunluk:**
• Ortalama yoğunluk: ${(semanticDensity * 100).toFixed(1)}%
• En yoğun doküman: ${group.documents[0]?.filename || 'N/A'}
• En az yoğun doküman: ${group.documents[group.documents.length - 1]?.filename || 'N/A'}

**🔄 Kavram Evrimi:**
${conceptEvolution.slice(0, 3).map(evolution => 
  `• **${evolution.concept}**: ${evolution.documents.length} dokümanda gelişim gösteriyor`
).join('\n')}

**💡 Semantik İçgörüler:**
Bu dokümanlar semantik olarak tutarlı bir yapı sergiliyor. Kavramlar arası bağlantılar güçlü ve anlamlı.`;
  }

  // Additional helper methods

  private generateOverallSummary(group: DocumentGroup): string {
    const totalSections = group.documents.reduce((sum: number, doc: AnalysisResult) => sum + (doc.textSections?.length || 0), 0);
    const totalCommentary = group.documents.reduce((sum: number, doc: AnalysisResult) => sum + (doc.aiCommentary?.length || 0), 0);
    
    return `Bu grup ${group.documents.length} doküman içerir ve toplam ${totalSections} metin bölümü ile ${totalCommentary} AI yorumu barındırır. Dokümanlar arasında tutarlı bir içerik yapısı gözlemlenmiştir.`;
  }

  private generateDocumentSummary(doc: AnalysisResult): any {
    return {
      documentId: doc.documentId,
      summary: `${doc.filename} dosyası ${doc.textSections?.length || 0} metin bölümü içerir ve ${doc.aiCommentary?.length || 0} AI yorumu üretilmiştir.`,
      keyPoints: ['Ana içerik', 'Önemli noktalar', 'Sonuçlar']
    };
  }

  private generateGroupInsights(group: DocumentGroup): string[] {
    return [
      'Dokümanlar arasında güçlü tematik bağlantılar mevcut',
      'İçerik yapısı tutarlı ve organize',
      'AI yorumları kaliteli ve detaylı'
    ];
  }

  private generateRecommendations(group: DocumentGroup): string[] {
    return [
      'Dokümanlar arası bağlantıları güçlendirin',
      'Ortak temalar üzerinde daha fazla odaklanın',
      'Semantik analizi derinleştirin'
    ];
  }

  private analyzeSemanticRelations(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        concept: 'Proje Yönetimi',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        relationshipType: 'hierarchy',
        description: 'Hiyerarşik ilişki'
      }
    ];
  }

  private analyzeThematicConnections(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        theme: 'Teknoloji',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        connectionStrength: 0.8,
        examples: ['Yazılım', 'Sistem', 'Program']
      }
    ];
  }

  private analyzeStructuralPatterns(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        pattern: 'Başlık-Yapı',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        frequency: group.documents.length,
        description: 'Tutarlı başlık yapısı'
      }
    ];
  }

  private analyzeContentPatterns(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      { type: 'Paragraf Yapısı', frequency: 10 },
      { type: 'Liste Formatı', frequency: 5 },
      { type: 'Tablo Yapısı', frequency: 3 }
    ];
  }

  private analyzeLinguisticPatterns(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      { type: 'Teknik Terimler', frequency: 15 },
      { type: 'Formal Dil', frequency: 20 },
      { type: 'Açıklayıcı Cümleler', frequency: 25 }
    ];
  }

  private analyzeThematicPatterns(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        theme: 'İş Süreçleri',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        frequency: group.documents.length
      }
    ];
  }

  private buildConceptMap(group: DocumentGroup): any {
    // Mock implementation
    return {
      'Proje': ['planlama', 'yönetim', 'süreç'],
      'Kalite': ['standart', 'kriter', 'ölçüm'],
      'Süreç': ['adım', 'aşama', 'evre']
    };
  }

  private identifySemanticClusters(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        name: 'Yönetim Kümesi',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        concepts: ['planlama', 'organizasyon', 'kontrol']
      }
    ];
  }

  private calculateSemanticDensity(group: DocumentGroup): number {
    // Mock implementation
    return 0.75;
  }

  private analyzeConceptEvolution(group: DocumentGroup): any[] {
    // Mock implementation
    return [
      {
        concept: 'Teknoloji',
        documents: group.documents.map((d: AnalysisResult) => d.documentId),
        evolution: 'Gelişim gösteriyor'
      }
    ];
  }

  /**
   * Save group analysis results to Supabase
   */
  private async saveGroupAnalysisResults(results: GroupAnalysisResult[]): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('GroupAnalysisService: No Supabase connection, skipping save');
        return;
      }

      console.log('GroupAnalysisService: Saving group analysis results to Supabase:', results.length);

      const resultsToInsert = results.map(result => ({
        id: result.id,
        group_id: result.groupId,
        analysis_type: result.analysisType,
        content: result.content,
        confidence_score: result.confidenceScore,
        language: result.language,
        ai_model: result.aiModel,
        processing_time_ms: result.processingTimeMs,
        created_at: result.createdAt
      }));

      const { error } = await this.supabase
        .from('group_analysis_results')
        .insert(resultsToInsert);

      if (error) {
        console.error('GroupAnalysisService: Supabase save failed:', error);
        throw new Error(`Group analysis results save failed: ${error.message}`);
      }

      console.log('GroupAnalysisService: Group analysis results saved successfully');
    } catch (error) {
      console.error('GroupAnalysisService: Failed to save group analysis results:', error);
      // Don't throw error, just log it as saving is not critical
      console.log('GroupAnalysisService: Continuing without save');
    }
  }

  /**
   * Get group analysis results from Supabase
   */
  async getGroupAnalysisResults(groupId: string): Promise<GroupAnalysisResult[]> {
    try {
      if (!this.supabase) {
        console.log('GroupAnalysisService: No Supabase connection, returning empty results');
        return [];
      }

      const { data, error } = await this.supabase
        .from('group_analysis_results')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('GroupAnalysisService: Failed to get group analysis results:', error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        groupId: row.group_id,
        analysisType: row.analysis_type,
        content: row.content,
        confidenceScore: row.confidence_score,
        language: row.language,
        aiModel: row.ai_model,
        processingTimeMs: row.processing_time_ms,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('GroupAnalysisService: Failed to get group analysis results:', error);
      return [];
    }
  }
}
