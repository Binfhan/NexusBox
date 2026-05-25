import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentShare } from './entities/document-share.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Folder } from './entities/folder.entity';
import { GeminiService } from './gemini.service';
import { PinataService } from './pinata.service';
import { User } from '../users/entities/user.entity';
import { Plan } from '../users/entities/plan.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentShare)
    private shareRepository: Repository<DocumentShare>,
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
    @InjectRepository(Folder)
    private folderRepository: Repository<Folder>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
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
    parentFolderId?: string,
  ) {
    const addr = walletAddress.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { wallet_address: addr },
      relations: ['plan'],
    });
    if (!user) throw new BadRequestException('User not found');

    const plan = user.plan;
    const fileSize = fileBuffer.length;

    if (plan && user.storage_used + fileSize > Number(plan.max_bytes)) {
      throw new BadRequestException(
        `Storage limit exceeded. You have used ${this.formatBytes(Number(user.storage_used))} of ${this.formatBytes(Number(plan.max_bytes))}.`
      );
    }
    if (plan && plan.max_docs !== -1) {
      const docCount = await this.documentRepository.count({
        where: { wallet_address: addr, deleted_at: IsNull() },
      });
      if (docCount >= plan.max_docs) {
        throw new BadRequestException(`Document limit reached. Your plan allows a maximum of ${plan.max_docs} documents.`);
      }
    }

    if (parentFolderId) {
      const folder = await this.folderRepository.findOne({ where: { id: parentFolderId, owner_wallet: addr } });
      if (!folder) throw new BadRequestException('Parent folder not found');
    }

    const analysis = await this.geminiService.analyzeDocument(fileText, mimeType);
    const cid = await this.pinataService.uploadFile(fileBuffer, fileName, mimeType);

    const doc = this.documentRepository.create({
      wallet_address: addr,
      title: fileName,
      cid,
      parent_folder_id: parentFolderId || undefined,
      relative_path: relativePath || undefined,
      folder_group: folderGroup || undefined,
      ai_summary: analysis.summary,
      content_text: fileText,
      file_size: fileSize,
      mime_type: mimeType,
      tags: analysis.tags,
      is_ai_verified: analysis.isSafe,
      status: 'processed',
    });

    const saved = await this.documentRepository.save(doc);

    await this.versionRepository.save({
      document_id: saved.id,
      version_num: 1,
      ipfs_cid: cid,
    });

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .where('wallet_address = :addr', { addr })
      .set({ storage_used: () => `storage_used + ${fileSize}` })
      .execute();

    return saved;
  }

  async getDocumentsByWallet(walletAddress: string, folderId?: string) {
    const where: any = { wallet_address: walletAddress.toLowerCase(), deleted_at: IsNull() };
    if (folderId) where.parent_folder_id = folderId;
    else where.parent_folder_id = IsNull();
    return this.documentRepository.find({ where, order: { created_at: 'DESC' } });
  }

  async getStarred(walletAddress: string) {
    return this.documentRepository.find({
      where: { wallet_address: walletAddress.toLowerCase(), is_starred: true, deleted_at: IsNull() },
      order: { updated_at: 'DESC' },
    });
  }

  async getRecent(walletAddress: string) {
    return this.documentRepository.find({
      where: { wallet_address: walletAddress.toLowerCase(), deleted_at: IsNull() },
      order: { updated_at: 'DESC' },
      take: 20,
    });
  }

  async getTrash(walletAddress: string) {
    return this.documentRepository.find({
      where: { wallet_address: walletAddress.toLowerCase() },
      withDeleted: true,
      order: { deleted_at: 'DESC' },
    });
  }

  async search(walletAddress: string, query: string) {
    return this.documentRepository.find({
      where: [
        { wallet_address: walletAddress.toLowerCase(), title: ILike(`%${query}%`), deleted_at: IsNull() },
        { wallet_address: walletAddress.toLowerCase(), ai_summary: ILike(`%${query}%`), deleted_at: IsNull() },
      ],
      order: { created_at: 'DESC' },
    });
  }

  async toggleStar(docId: string, walletAddress: string, starred: boolean) {
    const doc = await this.documentRepository.findOne({ where: { id: docId, wallet_address: walletAddress.toLowerCase() } });
    if (!doc) throw new NotFoundException('Document not found');
    doc.is_starred = starred;
    return this.documentRepository.save(doc);
  }

  async moveDocument(docId: string, walletAddress: string, parentFolderId?: string) {
    const doc = await this.documentRepository.findOne({ where: { id: docId, wallet_address: walletAddress.toLowerCase() } });
    if (!doc) throw new NotFoundException('Document not found');
    if (parentFolderId) {
      const folder = await this.folderRepository.findOne({ where: { id: parentFolderId, owner_wallet: walletAddress.toLowerCase() } });
      if (!folder) throw new NotFoundException('Target folder not found');
    }
    doc.parent_folder_id = parentFolderId || undefined as any;
    return this.documentRepository.save(doc);
  }

  async restoreDocument(docId: string, walletAddress: string) {
    const doc = await this.documentRepository.findOne({
      where: { id: docId, wallet_address: walletAddress.toLowerCase() },
      withDeleted: true,
    });
    if (!doc) throw new NotFoundException('Document not found');
    doc.deleted_at = undefined as any;
    return this.documentRepository.save(doc);
  }

  async getDocumentVersions(docId: string) {
    return this.versionRepository.find({
      where: { document_id: docId },
      order: { version_num: 'DESC' },
    });
  }

  async getSharedWithMe(walletAddress: string) {
    const shares = await this.shareRepository.find({
      where: { shared_with_wallet: walletAddress.toLowerCase(), is_active: true },
      relations: ['document'],
      order: { created_at: 'DESC' },
    });
    return shares.map(s => ({
      ...s.document,
      shared_by: s.owner_wallet,
      share_id: s.id,
      permission: s.permission,
      shared_at: s.created_at,
      has_password: !!s.password,
    }));
  }

  async shareDocument(
    documentId: string,
    ownerWallet: string,
    targetWallet?: string,
    targetUserId?: number,
    permission?: string,
    expiresAt?: string,
    password?: string,
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
      permission: permission || 'viewer',
      expires_at: expiresAt ? new Date(expiresAt) : undefined,
      password: password || undefined,
    });
    return this.shareRepository.save(share);
  }

  async getShareByToken(token: string) {
    const share = await this.shareRepository.findOne({
      where: { token, is_active: true },
      relations: ['document'],
    });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.expires_at && new Date() > share.expires_at) {
      throw new BadRequestException('Share link has expired');
    }
    return share;
  }

  async verifyPassword(shareId: string, password: string) {
    const share = await this.shareRepository.findOne({ where: { id: shareId, is_active: true } });
    if (!share) throw new NotFoundException('Share not found');
    if (!share.password) throw new BadRequestException('No password set on this share');
    if (share.expires_at && new Date() > share.expires_at) {
      throw new BadRequestException('Share link has expired');
    }
    if (share.password !== password) throw new BadRequestException('Sai mật khẩu');
    return { verified: true };
  }

  async revokeShare(shareId: string, ownerWallet: string) {
    const share = await this.shareRepository.findOne({ where: { id: shareId } });
    if (!share) throw new Error('Share not found');
    if (share.owner_wallet !== ownerWallet.toLowerCase()) throw new Error('Not authorized');
    share.is_active = false;
    return this.shareRepository.save(share);
  }

  async getSharesByDocument(documentId: string, ownerWallet: string) {
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    if (doc.wallet_address !== ownerWallet.toLowerCase()) throw new Error('Not authorized');
    return this.shareRepository.find({
      where: { document_id: documentId, owner_wallet: ownerWallet.toLowerCase(), is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  async deleteDocument(docId: string, walletAddress: string) {
    const doc = await this.documentRepository.findOne({ where: { id: docId, wallet_address: walletAddress.toLowerCase() } });
    if (!doc) throw new Error('Document not found');
    doc.deleted_at = new Date();
    await this.documentRepository.save(doc);
    return { success: true, message: 'Document moved to trash' };
  }

  async deleteDocumentPermanently(docId: string, walletAddress: string) {
    const doc = await this.documentRepository.findOne({
      where: { id: docId, wallet_address: walletAddress.toLowerCase() },
      withDeleted: true,
    });
    if (!doc) throw new Error('Document not found');
    await this.shareRepository.delete({ document_id: docId });
    await this.versionRepository.delete({ document_id: docId });
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

  async emptyTrash(walletAddress: string) {
    const trashed = await this.documentRepository.find({
      where: { wallet_address: walletAddress.toLowerCase() },
      withDeleted: true,
    });
    for (const doc of trashed) {
      await this.deleteDocumentPermanently(doc.id, walletAddress);
    }
    return { success: true };
  }

  async getStorageInfo(walletAddress: string) {
    const user = await this.userRepository.findOne({
      where: { wallet_address: walletAddress.toLowerCase() },
      relations: ['plan'],
    });
    if (!user) throw new Error('User not found');
    const plan = user.plan;
    return {
      storage_limit: plan ? Number(plan.max_bytes) : Number(user.storage_limit),
      storage_used: Number(user.storage_used),
      storage_available: (plan ? Number(plan.max_bytes) : Number(user.storage_limit)) - Number(user.storage_used),
      plan_name: plan?.name || 'free',
      plan_max_docs: plan?.max_docs ?? 50,
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

  private formatBytes(bytes: number): string {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }
}
