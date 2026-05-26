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

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'custom' })
  avatar_type: string;

  @Column({ type: 'varchar', nullable: true })
  display_name: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  ens_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  lens_handle: string | null;

  @Column({ type: 'varchar', nullable: true })
  twitter_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  github_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  website_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_profile_public: boolean;

  @CreateDateColumn()
  created_at: Date;
}
