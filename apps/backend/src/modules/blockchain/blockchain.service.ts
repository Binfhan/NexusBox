import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { Document } from '../documents/entities/document.entity';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  onModuleInit() {
    this.initEthers();
  }

  private initEthers() {
    const rpcUrl = this.configService.get<string>('SEPOLIA_RPC_URL');
    const contractAddress = this.configService.get<string>('DOCVAULT_STORAGE_ADDRESS');

    if (!rpcUrl || !contractAddress) {
      this.logger.warn('SEPOLIA_RPC_URL or DOCVAULT_STORAGE_ADDRESS not set. Blockchain sync is disabled.');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Minimal ABI to listen to the DocumentStored event
    const abi = [
      "event DocumentStored(address indexed owner, string indexed cid, string offchainId, uint256 storedAt, bool aiVerified)"
    ];

    this.contract = new ethers.Contract(contractAddress, abi, this.provider);

    this.logger.log(`Listening for DocumentStored events on ${contractAddress}...`);

    this.contract.on('DocumentStored', async (owner, cid, offchainId, storedAt, aiVerified, event) => {
      this.logger.log(`Received DocumentStored event for offchainId: ${offchainId}, CID: ${cid}`);
      
      try {
        const doc = await this.documentRepository.findOne({ where: { id: offchainId } });
        if (doc) {
          doc.is_onchain = true;
          await this.documentRepository.save(doc);
          this.logger.log(`Document ${offchainId} marked as on-chain.`);
        } else {
          this.logger.warn(`Document with offchainId ${offchainId} not found in database.`);
        }
      } catch (error) {
        this.logger.error(`Error updating document ${offchainId}:`, error);
      }
    });
  }
}
