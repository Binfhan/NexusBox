import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { GeminiService } from './gemini.service';
import { PinataService } from './pinata.service';
import { Document } from './entities/document.entity';
import { DocumentShare } from './entities/document-share.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentShare, User]), ConfigModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, GeminiService, PinataService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
