import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { GeminiService } from './gemini.service';
import { PinataService } from './pinata.service';
import { Document } from './entities/document.entity';
import { DocumentShare } from './entities/document-share.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Folder } from './entities/folder.entity';
import { User } from '../users/entities/user.entity';
import { Plan } from '../users/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentShare, DocumentVersion, Folder, User, Plan]), ConfigModule],
  controllers: [DocumentsController, FoldersController],
  providers: [DocumentsService, FoldersService, GeminiService, PinataService],
  exports: [DocumentsService, FoldersService],
})
export class DocumentsModule {}
