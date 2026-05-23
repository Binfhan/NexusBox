import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentShare } from './entities/document-share.entity';
import { GeminiService } from './gemini.service';
import { PinataService } from './pinata.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentShare)
    private shareRepository: Repository<DocumentShare>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private geminiService: GeminiService,
    private pinataService: PinataService,
  ) {}

  async processAndUploadDocument(
    walletAddress: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    fileText: string,
    relativePath?: string,
    folderGroup?: string,
  ) {
    const analysis = await this.geminiService.analyzeDocument(fileText, mimeType);
    const cid = await this.pinataService.uploadFile(fileBuffer, fileName, mimeType);

    const doc = this.documentRepository.create({
      wallet_address: walletAddress.toLowerCase(),
      title: fileName,
      cid: cid,
      relative_path: relativePath || undefined,
      folder_group: folderGroup || undefined,
      ai_summary: analysis.summary,
      content_text: fileText,
      file_size: fileBuffer.length,
      mime_type: mimeType,
      tags: analysis.tags,
      is_ai_verified: analysis.isSafe,
      status: 'processed',
    });

    const saved = await this.documentRepository.save(doc);

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .where('wallet_address = :addr', { addr: walletAddress.toLowerCase() })
      .set({ storage_used: () => `storage_used + ${fileBuffer.length}` })
      .execute();

    return saved;
  }

  async getDocumentsByWallet(walletAddress: string) {
    return this.documentRepository.find({
      where: { wallet_address: walletAddress.toLowerCase() },
      order: { created_at: 'DESC' },
    });
  }

  async getSharedWithMe(walletAddress: string) {
    const shares = await this.shareRepository.find({
      where: { shared_with_wallet: walletAddress.toLowerCase() },
      relations: ['document'],
      order: { created_at: 'DESC' },
    });
    return shares.map(s => ({
      ...s.document,
      shared_by: s.owner_wallet,
      share_id: s.id,
      permission: s.permission,
      shared_at: s.created_at,
    }));
  }

  async shareDocument(
    documentId: string,
    ownerWallet: string,
    targetWallet?: string,
    targetUserId?: number,
    permission?: string,
  ) {
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    if (doc.wallet_address !== ownerWallet.toLowerCase()) throw new Error('Not authorized');

    if (!targetWallet && targetUserId) {
      const user = await this.userRepository.findOne({ where: { user_id: targetUserId } });
      if (!user) throw new Error('User ID not found');
      targetWallet = user.wallet_address;
    }

    if (!targetWallet) throw new Error('Target wallet is required');

    const existing = await this.shareRepository.findOne({
      where: {
        document_id: documentId,
        owner_wallet: ownerWallet.toLowerCase(),
        shared_with_wallet: targetWallet.toLowerCase(),
      },
    });
    if (existing) throw new Error('Already shared with this user');

    const share = this.shareRepository.create({
      document_id: documentId,
      owner_wallet: ownerWallet.toLowerCase(),
      shared_with_wallet: targetWallet.toLowerCase(),
      permission: permission || 'view',
    });

    return this.shareRepository.save(share);
  }

  async revokeShare(shareId: string, ownerWallet: string) {
    const share = await this.shareRepository.findOne({ where: { id: shareId } });
    if (!share) throw new Error('Share not found');
    if (share.owner_wallet !== ownerWallet.toLowerCase()) throw new Error('Not authorized');
    await this.shareRepository.remove(share);
    return { success: true };
  }

  async getSharesByDocument(documentId: string, ownerWallet: string) {
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    if (doc.wallet_address !== ownerWallet.toLowerCase()) throw new Error('Not authorized');
    return this.shareRepository.find({
      where: { document_id: documentId, owner_wallet: ownerWallet.toLowerCase() },
      order: { created_at: 'DESC' },
    });
  }

  async deleteDocument(docId: string, walletAddress: string) {
    const doc = await this.documentRepository.findOne({ where: { id: docId } });
    if (!doc) throw new Error('Document not found');
    if (doc.wallet_address !== walletAddress.toLowerCase()) throw new Error('Not authorized');

    await this.shareRepository.delete({ document_id: docId });
    await this.documentRepository.remove(doc);

    if (doc.file_size) {
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .where('wallet_address = :addr', { addr: walletAddress.toLowerCase() })
        .set({ storage_used: () => `GREATEST(0, storage_used - ${doc.file_size})` })
        .execute();
    }

    return { success: true };
  }

  async getStorageInfo(walletAddress: string) {
    const user = await this.userRepository.findOne({ where: { wallet_address: walletAddress.toLowerCase() } });
    if (!user) throw new Error('User not found');
    return {
      storage_limit: user.storage_limit,
      storage_used: user.storage_used,
      storage_available: user.storage_limit - user.storage_used,
    };
  }

  async chatWithDocument(id: string, chatHistory: any[], userMessage: string): Promise<string> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new Error('Document not found');
    
    const textToAnalyze = doc.content_text || doc.ai_summary || '';
    return this.geminiService.chatWithDocument(textToAnalyze, chatHistory, userMessage);
  }

  async compareDocuments(id1: string, id2: string): Promise<string> {
    const doc1 = await this.documentRepository.findOne({ where: { id: id1 } });
    const doc2 = await this.documentRepository.findOne({ where: { id: id2 } });
    if (!doc1 || !doc2) throw new Error('One or both documents not found');

    const text1 = doc1.content_text || doc1.ai_summary || '';
    const text2 = doc2.content_text || doc2.ai_summary || '';
    
    return this.geminiService.compareDocuments(text1, text2);
  }

  async extractKeyClauses(id: string): Promise<string[]> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new Error('Document not found');

    const textToAnalyze = doc.content_text || doc.ai_summary || '';
    return this.geminiService.extractClauses(textToAnalyze, doc.mime_type);
  }

  async getAIAnalysis(id: string) {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new Error('Document not found');
    const textToAnalyze = doc.content_text || doc.ai_summary || '';
    return this.geminiService.deepAnalysis(textToAnalyze, doc.mime_type);
  }

  async getEditSuggestions(id: string) {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new Error('Document not found');
    const textToAnalyze = doc.content_text || doc.ai_summary || '';
    return this.geminiService.suggestEdits(textToAnalyze, doc.mime_type);
  }
}
