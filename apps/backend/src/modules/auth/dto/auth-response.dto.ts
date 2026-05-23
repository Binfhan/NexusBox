export class AuthResponseDto {
  access_token!: string;
}

export class NonceResponseDto {
  nonce!: string;
  message!: string; // message mà frontend cần ký
}