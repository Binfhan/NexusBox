import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Plan } from './plan.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  wallet_address: string;

  @Column({ type: 'int', unique: true, nullable: true })
  user_id: number;

  @Column({ type: 'varchar' })
  nonce: string;

  @Column({ type: 'int', nullable: true })
  plan_id: number;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ type: 'bigint', default: 209715200 })
  storage_limit: number;

  @Column({ type: 'bigint', default: 0 })
  storage_used: number;

  @CreateDateColumn()
  created_at: Date;
}
