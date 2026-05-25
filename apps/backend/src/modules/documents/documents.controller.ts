import { Controller, Post, Get, Patch, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException, Param, Body, Delete, Query } from '@nestjs/common';
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
    if (!file) throw new BadRequestException('No file uploaded');
    const fileText = file.buffer.toString('base64');
    const relativePath = req.body?.relative_path || '';
    const folderGroup = req.body?.folder_group || '';
    const parentFolderId = req.body?.parent_folder_id || '';
    return this.documentsService.processAndUploadDocument(
      req.user.wallet_address,
      file.buffer,
      file.originalname,
      file.mimetype,
      fileText,
      relativePath,
      folderGroup,
      parentFolderId,
    );
  }

  @Get()
  async getMyDocuments(
    @Query('folder_id') folderId: string | undefined,
    @Query('deleted') deleted: string | undefined,
    @Query('starred') starred: string | undefined,
    @Query('recent') recent: string | undefined,
    @Req() req: any,
  ) {
    if (deleted === 'true') {
      return this.documentsService.getTrash(req.user.wallet_address);
    }
    if (starred === 'true') {
      return this.documentsService.getStarred(req.user.wallet_address);
    }
    if (recent === 'true') {
      return this.documentsService.getRecent(req.user.wallet_address);
    }
    return this.documentsService.getDocumentsByWallet(req.user.wallet_address, folderId);
  }

  @Get('search')
  async search(@Query('q') q: string, @Req() req: any) {
    return this.documentsService.search(req.user.wallet_address, q);
  }

  @Get('shared-with-me')
  async getSharedWithMe(@Req() req: any) {
    return this.documentsService.getSharedWithMe(req.user.wallet_address);
  }

  @Post(':id/share')
  async shareDocument(
    @Param('id') id: string,
    @Body() body: { targetWallet?: string; targetUserId?: number; permission?: string; expiresAt?: string; password?: string },
    @Req() req: any,
  ) {
    if (!body.targetWallet && !body.targetUserId) throw new BadRequestException('Target wallet or user ID is required');
    return this.documentsService.shareDocument(
      id, req.user.wallet_address, body.targetWallet, body.targetUserId,
      body.permission || 'viewer', body.expiresAt, body.password,
    );
  }

  @Get('share/:token')
  async getShareByToken(@Param('token') token: string) {
    return this.documentsService.getShareByToken(token);
  }

  @Post('share/:shareId/verify-password')
  async verifySharePassword(@Param('shareId') shareId: string, @Body('password') password: string) {
    return this.documentsService.verifyPassword(shareId, password);
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

  @Patch(':id/star')
  async toggleStar(@Param('id') id: string, @Body() body: { starred: boolean }, @Req() req: any) {
    return this.documentsService.toggleStar(id, req.user.wallet_address, body.starred);
  }

  @Patch(':id/move')
  async moveDocument(@Param('id') id: string, @Body() body: { parent_folder_id?: string }, @Req() req: any) {
    return this.documentsService.moveDocument(id, req.user.wallet_address, body.parent_folder_id);
  }

  @Post(':id/restore')
  async restoreDocument(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.restoreDocument(id, req.user.wallet_address);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.documentsService.getDocumentVersions(id);
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
  async compareDocuments(@Body('id1') id1: string, @Body('id2') id2: string) {
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
