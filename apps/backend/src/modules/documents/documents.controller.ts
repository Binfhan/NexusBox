import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException, Param, Body, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const fileText = file.buffer.toString('base64');
    const relativePath = req.body?.relative_path || '';
    const folderGroup = req.body?.folder_group || '';
    return this.documentsService.processAndUploadDocument(
      req.user.wallet_address,
      file.buffer,
      file.originalname,
      file.mimetype,
      fileText,
      relativePath,
      folderGroup
    );
  }

  @Get()
  async getMyDocuments(@Req() req: any) {
    return this.documentsService.getDocumentsByWallet(req.user.wallet_address);
  }

  @Get('shared-with-me')
  async getSharedWithMe(@Req() req: any) {
    return this.documentsService.getSharedWithMe(req.user.wallet_address);
  }

  @Post(':id/share')
  async shareDocument(
    @Param('id') id: string,
    @Body('targetWallet') targetWallet: string,
    @Body('targetUserId') targetUserId: number,
    @Body('permission') permission: string,
    @Req() req: any,
  ) {
    if (!targetWallet && !targetUserId) throw new BadRequestException('Target wallet or user ID is required');
    return this.documentsService.shareDocument(id, req.user.wallet_address, targetWallet, targetUserId, permission || 'view');
  }

  @Delete('share/:shareId')
  async revokeShare(@Param('shareId') shareId: string, @Req() req: any) {
    return this.documentsService.revokeShare(shareId, req.user.wallet_address);
  }

  @Get(':id/shares')
  async getShares(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.getSharesByDocument(id, req.user.wallet_address);
  }

  @Get('storage-info')
  async getStorageInfo(@Req() req: any) {
    return this.documentsService.getStorageInfo(req.user.wallet_address);
  }

  @Post(':id/chat')
  async chatWithDocument(
    @Param('id') id: string,
    @Body('chatHistory') chatHistory: any[],
    @Body('userMessage') userMessage: string,
  ) {
    const answer = await this.documentsService.chatWithDocument(id, chatHistory || [], userMessage);
    return { answer };
  }

  @Post('compare')
  async compareDocuments(
    @Body('id1') id1: string,
    @Body('id2') id2: string,
  ) {
    const comparison = await this.documentsService.compareDocuments(id1, id2);
    return { comparison };
  }

  @Get(':id/clauses')
  async getClauses(@Param('id') id: string) {
    const clauses = await this.documentsService.extractKeyClauses(id);
    return { clauses };
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.deleteDocument(id, req.user.wallet_address);
  }

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string) {
    return this.documentsService.getAIAnalysis(id);
  }

  @Get(':id/edit-suggestions')
  async getEditSuggestions(@Param('id') id: string) {
    return this.documentsService.getEditSuggestions(id);
  }
}
