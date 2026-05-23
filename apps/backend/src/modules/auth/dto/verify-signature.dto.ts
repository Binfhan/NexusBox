import { IsString, Matches } from 'class-validator';

export class VerifySignatureDto {
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Wallet address không hợp lệ',
  })
  wallet_address!: string;

  @Matches(/^0x[a-fA-F0-9]{130}$/, {
    message: 'Signature không đúng format — phải là 65 bytes hex',
  })
  signature!: string;
}
