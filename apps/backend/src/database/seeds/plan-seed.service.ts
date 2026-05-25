import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../modules/users/entities/plan.entity';

@Injectable()
export class PlanSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
  ) {}

  async onModuleInit() {
    const count = await this.plansRepository.count();
    if (count > 0) return;

    await this.plansRepository.save([
      { name: 'free', max_bytes: 209715200, max_docs: 50, price_usd: 0 },
      { name: 'pro', max_bytes: 5368709120, max_docs: 500, price_usd: 19.00 },
      { name: 'business', max_bytes: 21474836480, max_docs: 2000, price_usd: 79.00 },
      { name: 'enterprise', max_bytes: 107374182400, max_docs: -1, price_usd: 299.00 },
    ]);

    console.log('✅ Plans seeded successfully');
  }
}
