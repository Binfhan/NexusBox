import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 42 })
  wallet_address: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'wallet_address' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  relative_path: string;

  @Column({ type: 'varchar', nullable: true })
  folder_group: string;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  file_size: number;

  @Column({ type: 'varchar', nullable: true })
  mime_type: string;

  @Column({ type: 'varchar', nullable: true })
  cid: string;

  @Column({ type: 'text', nullable: true })
  ai_summary: string;

  @Column({ type: 'text', nullable: true })
  content_text: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: false })
  is_ai_verified: boolean;

  @Column({ type: 'boolean', default: false })
  is_onchain: boolean;

  @Column({ type: 'varchar', default: 'pending' }) // pending, processed, failed
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
