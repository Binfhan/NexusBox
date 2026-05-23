import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY', 'dummy-key-for-now'),
    });
  }

  async analyzeDocument(text: string): Promise<{ summary: string; tags: string[]; isSafe: boolean }> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: "You are an AI Document Intelligence assistant. Analyze the given document text. Return a JSON object strictly following this schema: { \"summary\": \"Brief summary of the document in Vietnamese\", \"tags\": [\"array\", \"of\", \"tags\"], \"isSafe\": true/false (false if it contains spam, malware, or illegal content) }. Do not output any markdown or additional text, just the raw JSON object.",
        messages: [
          { role: 'user', content: text }
        ],
      });

      const responseText = (response.content[0] as any).text;
      const parsed = JSON.parse(responseText);
      
      return {
        summary: parsed.summary,
        tags: parsed.tags,
        isSafe: parsed.isSafe,
      };
    } catch (error) {
      console.error('Anthropic API Error:', error);
      // Fallback for demo if API key is invalid
      return {
        summary: 'Tóm tắt tự động (Fallback do lỗi AI)',
        tags: ['document'],
        isSafe: true,
      };
    }
  }

  async chatWithDocument(documentText: string, chatHistory: any[], userMessage: string): Promise<string> {
    try {
      const messages: any[] = chatHistory.map(h => ({
        role: h.role,
        content: h.content,
      }));
      messages.push({ role: 'user', content: userMessage });

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: `You are an AI Document Q&A assistant. Answer questions based on the following document content in Vietnamese: \n\n${documentText}`,
        messages,
      });

      return (response.content[0] as any).text;
    } catch (error) {
      console.error('Anthropic API Error:', error);
      return 'Xin lỗi, đã xảy ra lỗi trong quá trình xử lý câu hỏi của bạn. (AI Q&A Fallback)';
    }
  }

  async compareDocuments(doc1Text: string, doc2Text: string): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        system: "You are an AI assistant that compares two documents. Highlight the differences, modifications, and any key additions or deletions. Write the response in Vietnamese using markdown.",
        messages: [
          {
            role: 'user',
            content: `Hãy so sánh hai tài liệu sau:\nTài liệu 1:\n${doc1Text}\n\nTài liệu 2:\n${doc2Text}`,
          },
        ],
      });

      return (response.content[0] as any).text;
    } catch (error) {
      console.error('Anthropic API Error:', error);
      return 'Không thể so sánh hai tài liệu này tại thời điểm hiện tại. (AI Compare Fallback)';
    }
  }

  async extractClauses(documentText: string): Promise<string[]> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: `You are an AI assistant. Extract the most important clauses (such as penalty, duration, pricing, rights, termination) from the document text. Return a JSON array of strings in Vietnamese: ["Clause 1...", "Clause 2..."]. Do not output markdown, output raw JSON only.`,
        messages: [
          { role: 'user', content: documentText }
        ],
      });

      const responseText = (response.content[0] as any).text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Anthropic API Error:', error);
      return [
        'Điều khoản về hiệu lực hợp đồng',
        'Điều khoản về giải quyết tranh chấp',
        'Điều khoản phạt vi phạm (Fallback do lỗi AI)',
      ];
    }
  }
}
