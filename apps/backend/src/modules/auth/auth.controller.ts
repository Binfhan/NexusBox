import { Controller, Post, Body, Param, Get, Patch, Delete, HttpCode, HttpStatus, UseGuards, NotFoundException, Req, UnauthorizedException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { AuthService } from './auth.service';
import { GetNonceDto } from './dto/get-nonce.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { UpdateProfileDto, UploadAvatarDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const UPLOADS_DIR = join(__dirname, '..', '..', '..', 'uploads', 'avatars');

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

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.wallet_address, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        cb(null, UPLOADS_DIR);
      },
      filename: (req, file, cb) => {
        const wallet = (req as any).user?.wallet_address || 'unknown';
        const ext = extname(file.originalname);
        cb(null, `${wallet}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Only image files allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const avatarUrl = `http://localhost:3000/uploads/avatars/${file.filename}`;
    return this.authService.updateAvatar(req.user.wallet_address, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  async deleteAvatar(@Req() req: any) {
    return this.authService.deleteAvatar(req.user.wallet_address);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resolve-ens/:address')
  async resolveEns(@Param('address') address: string) {
    try {
      const ensName = await this.authService.resolveEns(address);
      return { ens_name: ensName };
    } catch {
      return { ens_name: null };
    }
  }

  @Get('users/:userId/public')
  async getPublicProfile(@Param('userId') userId: string) {
    const profile = await this.authService.getPublicProfile(Number(userId));
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }
}
