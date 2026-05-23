import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { Document } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), ConfigModule],
  providers: [BlockchainService],
})
export class BlockchainModule {}
