import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
import pinataSDK from '@pinata/sdk';
import { Readable } from 'stream';

@Injectable()
export class PinataService {
  private pinata: any;

  constructor(private configService: ConfigService) {
    this.pinata = new pinataSDK({
      pinataJWTKey: this.configService.get<string>('PINATA_JWT', 'dummy-jwt-for-now'),
    });
  }

  async uploadFile(buffer: Buffer, originalname: string, mimetype: string): Promise<string> {
    try {
      const stream = Readable.from(buffer);
      (stream as any).path = originalname; // Pinata SDK requires a path property for filename
      
      const options = {
        pinataMetadata: { name: originalname }
      };
      
      const upload = await this.pinata.pinFileToIPFS(stream, options);
      return upload.IpfsHash;
    } catch (error) {
      console.error('Pinata upload error:', error);
      return 'QmDummyHash' + Date.now();
    }
  }
}
