import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  async getMyProfile(walletAddress: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { wallet_address: walletAddress.toLowerCase() } });
  }
}
