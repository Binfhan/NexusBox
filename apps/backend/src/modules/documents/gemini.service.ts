import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private consecutive429s = 0;
  private circuitOpenUntil = 0;
  private readonly circuitBreakerThreshold = 3;
  private readonly circuitBreakerCooldown = 5 * 60 * 1000;

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY', 'dummy-key'),
    );
  }

  private isCircuitOpen(): boolean {
    if (this.consecutive429s >= this.circuitBreakerThreshold) {
      if (Date.now() > this.circuitOpenUntil) {
        this.consecutive429s = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private async callWithRetry<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.isCircuitOpen()) {
      return fallback;
    }

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        this.consecutive429s = 0;
        return result;
      } catch (error: any) {
        if (error?.status === 429) {
          this.consecutive429s++;
          if (this.consecutive429s >= this.circuitBreakerThreshold) {
            this.circuitOpenUntil = Date.now() + this.circuitBreakerCooldown;
          }
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        console.error('Gemini API Error:', error?.message || error);
        return fallback;
      }
    }
    return fallback;
  }

  isImage(mimeType: string): boolean {
    return ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].includes(mimeType);
  }

  async analyzeDocument(text: string, mimeType?: string): Promise<{ summary: string; tags: string[]; isSafe: boolean }> {
    if (mimeType && this.isImage(mimeType)) {
      return { summary: 'Tệp hình ảnh — không hỗ trợ phân tích văn bản tự động', tags: ['image'], isSafe: true };
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.analyzeDocument();
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const result = await model.generateContent(`Analyze the following document text. Return a JSON object strictly following this schema:
{
  "summary": "Brief summary of the document in Vietnamese",
  "tags": ["array", "of", "tags"],
  "isSafe": true
}
isSafe should be false if it contains spam, malware, or illegal content.
Do not output any markdown or additional text, just the raw JSON object.

Document text:
${text.substring(0, 10000)}`);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());
      return {
        summary: parsed.summary || 'Không có tóm tắt',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['document'],
        isSafe: parsed.isSafe !== undefined ? parsed.isSafe : true,
      };
    }, this.quotaFallback.analyzeDocument());
  }

  async chatWithDocument(documentText: string, chatHistory: any[], userMessage: string): Promise<string> {
    if (!documentText || documentText.length < 50) {
      return 'Tài liệu này không có nội dung văn bản để trò chuyện (có thể là file ảnh).';
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.chatWithDocument(userMessage);
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const history = chatHistory.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));
      const chat = model.startChat({
        history,
        systemInstruction: {
          role: 'user',
          parts: [{ text: `You are an AI Document Q&A assistant. Answer questions based on the following document content in Vietnamese:\n\n${documentText.substring(0, 20000)}` }],
        },
      });
      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    }, this.quotaFallback.chatWithDocument(userMessage));
  }

  async compareDocuments(doc1Text: string, doc2Text: string): Promise<string> {
    if (!doc1Text || !doc2Text || doc1Text.length < 50 || doc2Text.length < 50) {
      return 'Một hoặc cả hai tài liệu không có nội dung văn bản để so sánh.';
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.compareDocuments();
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const result = await model.generateContent(`You are an AI assistant that compares two documents. Highlight the differences, modifications, and any key additions or deletions. Write the response in Vietnamese using markdown.

Tài liệu 1:
${doc1Text.substring(0, 10000)}

Tài liệu 2:
${doc2Text.substring(0, 10000)}`);
      return result.response.text();
    }, this.quotaFallback.compareDocuments());
  }

  async deepAnalysis(text: string, mimeType?: string): Promise<any> {
    if (mimeType && this.isImage(mimeType)) {
      return { summary: 'Tệp hình ảnh — không hỗ trợ phân tích chi tiết', keyPoints: [], riskAssessment: 'Không áp dụng', recommendations: [], documentType: 'Hình ảnh', sentiment: 'neutral' };
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.deepAnalysis();
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const result = await model.generateContent(`Phân tích tài liệu sau một cách chi tiết. Trả về JSON theo schema:
{
  "summary": "Tóm tắt ngắn gọn bằng tiếng Việt",
  "keyPoints": ["Danh sách các điểm chính"],
  "riskAssessment": "Đánh giá rủi ro nếu có",
  "recommendations": ["Khuyến nghị"],
  "documentType": "Loại tài liệu (hợp đồng, báo cáo, ...)",
  "sentiment": "positive/negative/neutral"
}
Chỉ trả về JSON, không markdown.

Tài liệu:
${text.substring(0, 10000)}`);
      const responseText = result.response.text();
      return JSON.parse(responseText.replace(/```json|```/g, '').trim());
    }, this.quotaFallback.deepAnalysis());
  }

  async suggestEdits(text: string, mimeType?: string): Promise<any> {
    if (mimeType && this.isImage(mimeType)) {
      return { suggestions: [], overallStrategy: 'Không áp dụng cho tệp hình ảnh.', estimatedComplexity: 'easy' };
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.suggestEdits();
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const result = await model.generateContent(`Bạn là chuyên gia phân tích và chỉnh sửa tài liệu. Hãy phân tích tài liệu sau và đề xuất các chiến lược sửa đổi. Trả về JSON theo schema:
{
  "suggestions": [
    {
      "section": "Tên phần/vị trí cần sửa",
      "issue": "Vấn đề hiện tại",
      "suggestion": "Đề xuất sửa đổi cụ thể",
      "priority": "high/medium/low",
      "reason": "Lý do cho đề xuất này"
    }
  ],
  "overallStrategy": "Chiến lược tổng thể cho việc sửa đổi tài liệu",
  "estimatedComplexity": "easy/medium/hard"
}
Chỉ trả về JSON, không markdown.

Tài liệu:
${text.substring(0, 10000)}`);
      const responseText = result.response.text();
      return JSON.parse(responseText.replace(/```json|```/g, '').trim());
    }, this.quotaFallback.suggestEdits());
  }

  async extractClauses(documentText: string, mimeType?: string): Promise<string[]> {
    if (mimeType && this.isImage(mimeType)) {
      return ['Không thể trích xuất điều khoản từ tệp hình ảnh'];
    }
    if (!documentText || documentText.length < 50) {
      return ['Tài liệu không có nội dung văn bản để trích xuất'];
    }
    if (this.isCircuitOpen()) {
      return this.quotaFallback.extractClauses();
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return this.callWithRetry(async () => {
      const result = await model.generateContent(`Extract the most important clauses (such as penalty, duration, pricing, rights, termination) from the document text. Return a JSON array of strings in Vietnamese: ["Clause 1...", "Clause 2..."]. Do not output markdown, output raw JSON only.

Document text:
${documentText.substring(0, 10000)}`);
      const responseText = result.response.text();
      return JSON.parse(responseText.replace(/```json|```/g, '').trim());
    }, this.quotaFallback.extractClauses());
  }

  private quotaFallback = {
    analyzeDocument: (): { summary: string; tags: string[]; isSafe: boolean } => ({
      summary: 'AI tạm thời không khả dụng (quota exceeded). Vui lòng thử lại sau hoặc nâng cấp API key.',
      tags: ['document'],
      isSafe: true,
    }),

    chatWithDocument: (userMessage?: string): string => {
      const responses = [
        'Xin lỗi, AI hiện đang quá tải. Vui lòng thử lại sau vài phút.',
        'Dịch vụ AI tạm thời gián đoạn do giới hạn API. Bạn có thể kiểm tra lại sau.',
        'AI không thể phản hồi ngay lúc này do quota exceeded. Hãy thử lại sau ít phút.',
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    },

    compareDocuments: (): string => `**So sánh tài liệu (Local Fallback)**

⚠️ AI đang tạm thời không khả dụng do vượt quá giới hạn API.

Vui lòng thử lại sau vài phút khi quota được reset.`,

    deepAnalysis: (): any => ({
      summary: 'Không thể phân tích chi tiết — AI tạm thời không khả dụng (quota exceeded).',
      keyPoints: ['Dịch vụ AI hiện đang quá tải, vui lòng thử lại sau'],
      riskAssessment: 'Không thể đánh giá do AI không khả dụng',
      recommendations: ['Thử lại sau vài phút hoặc nâng cấp API key'],
      documentType: 'Không xác định',
      sentiment: 'neutral',
    }),

    suggestEdits: (): any => ({
      suggestions: [],
      overallStrategy: 'AI tạm thời không khả dụng (quota exceeded). Vui lòng thử lại sau.',
      estimatedComplexity: 'medium',
    }),

    extractClauses: (): string[] => [
      'AI tạm thời không thể trích xuất điều khoản do vượt quá giới hạn API',
      'Vui lòng thử lại sau vài phút',
    ],
  };
}
