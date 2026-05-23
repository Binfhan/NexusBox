import { IsString, Matches } from 'class-validator';

export class GetNonceDto {
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Wallet address không hợp lệ — phải là 0x + 40 hex chars'
  })
  wallet_address!: string;
}