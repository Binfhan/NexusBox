import { Controller, Post, Body, Param, Get, HttpCode, HttpStatus, UseGuards, NotFoundException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GetNonceDto } from './dto/get-nonce.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  async getNonce(@Body() dto: GetNonceDto) {
    const nonce = await this.authService.generateNonce(dto.wallet_address);
    return {
      nonce,
      message: `Sign this message to login to DocVault: ${nonce}`,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto:VerifySignatureDto) {
    return this.authService.verifySignature(
      dto.wallet_address,
      dto.signature,
    )
  }

  @Get('user/:userId')
  async getUserByUserId(@Param('userId') userId: string) {
    const wallet = await this.authService.findWalletByUserId(Number(userId));
    if (!wallet) throw new NotFoundException('User not found');
    return { wallet_address: wallet, user_id: Number(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getMyProfile(req.user.wallet_address);
  }
}
