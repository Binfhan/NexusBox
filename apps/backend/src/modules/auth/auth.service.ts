import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { User } from '../users/entities/user.entity';
import { Plan } from '../users/entities/plan.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
    private jwtService: JwtService,
  ) {}

  async generateNonce(wallet_address: string): Promise<string> {
    const address = wallet_address.toLowerCase();
    let user = await this.usersRepository.findOne({ where: { wallet_address: address } });
    
    const nonce = crypto.randomBytes(16).toString('hex');
    
    if (!user) {
      let userId = this.generateUniqueId();
      while (await this.usersRepository.findOne({ where: { user_id: userId } })) {
        userId = this.generateUniqueId();
      }
      const freePlan = await this.plansRepository.findOne({ where: { name: 'free' } });
      user = this.usersRepository.create({
        wallet_address: address,
        nonce,
        user_id: userId,
        plan_id: freePlan?.id ?? undefined,
        storage_limit: Number(freePlan?.max_bytes) || 209715200,
      } as User);
    } else {
      user.nonce = nonce;
      if (!user.user_id) {
        let userId = this.generateUniqueId();
        while (await this.usersRepository.findOne({ where: { user_id: userId } })) {
          userId = this.generateUniqueId();
        }
        user.user_id = userId;
      }
    }
    
    await this.usersRepository.save(user);
    return nonce;
  }

  async verifySignature(wallet_address: string, signature: string): Promise<{ access_token: string }> {
    const address = wallet_address.toLowerCase();
    const user = await this.usersRepository.findOne({ where: { wallet_address: address } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const message = `Sign this message to login to DocVault: ${user.nonce}`;
    let recoveredAddress: string;
    
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw new UnauthorizedException('Invalid signature format');
    }

    if (recoveredAddress.toLowerCase() !== address) {
      throw new UnauthorizedException('Signature verification failed');
    }

    user.nonce = crypto.randomBytes(16).toString('hex');
    await this.usersRepository.save(user);

    const payload = { wallet_address: address };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateUniqueId(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async findByUserId(userId: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async findWalletByUserId(userId: number): Promise<string | null> {
    const user = await this.usersRepository.findOne({ where: { user_id: userId } });
    return user ? user.wallet_address : null;
  }

  async getMyProfile(walletAddress: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { wallet_address: walletAddress.toLowerCase() },
      relations: ['plan'],
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      walletAddress: user.wallet_address,
      userId: user.user_id,
      displayName: user.display_name || '',
      bio: user.bio || '',
      avatarUrl: user.avatar_url || null,
      avatarType: user.avatar_type || 'custom',
      ensName: user.ens_name || null,
      lensHandle: user.lens_handle || null,
      twitterUrl: user.twitter_url || '',
      githubUrl: user.github_url || '',
      websiteUrl: user.website_url || '',
      isProfilePublic: user.is_profile_public,
      plan: user.plan ? {
        name: user.plan.name,
        maxBytes: Number(user.plan.max_bytes),
        maxDocs: Number(user.plan.max_docs),
      } : { name: 'free', maxBytes: 209715200, maxDocs: 50 },
      storageLimit: Number(user.storage_limit),
      storageUsed: Number(user.storage_used),
      joinedAt: user.created_at,
    };
  }

  async updateProfile(walletAddress: string, dto: any): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { wallet_address: walletAddress.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.display_name !== undefined) user.display_name = dto.display_name;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.twitter_url !== undefined) user.twitter_url = dto.twitter_url;
    if (dto.github_url !== undefined) user.github_url = dto.github_url;
    if (dto.website_url !== undefined) user.website_url = dto.website_url;
    if (dto.is_profile_public !== undefined) user.is_profile_public = dto.is_profile_public;

    await this.usersRepository.save(user);
    return this.getMyProfile(walletAddress);
  }

  async updateAvatar(walletAddress: string, avatarUrl: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { wallet_address: walletAddress.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found');
    user.avatar_url = avatarUrl;
    user.avatar_type = 'custom';
    await this.usersRepository.save(user);
    return { avatar_url: avatarUrl, avatar_type: 'custom' };
  }

  async deleteAvatar(walletAddress: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { wallet_address: walletAddress.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found');
    user.avatar_url = null;
    user.avatar_type = 'blockie';
    await this.usersRepository.save(user);
    return { avatar_url: null, avatar_type: 'blockie' };
  }

  async resolveEns(address: string): Promise<string | null> {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com'
      );
      const ensName = await provider.lookupAddress(address);
      return ensName || null;
    } catch {
      return null;
    }
  }

  async getPublicProfile(userId: number): Promise<any | null> {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId, is_profile_public: true },
      relations: ['plan'],
    });
    if (!user) return null;
    return {
      walletAddress: user.wallet_address,
      displayName: user.display_name || '',
      bio: user.bio || '',
      avatarUrl: user.avatar_url || null,
      ensName: user.ens_name || null,
      twitterUrl: user.twitter_url || '',
      githubUrl: user.github_url || '',
      websiteUrl: user.website_url || '',
      joinedAt: user.created_at,
    };
  }
}
