import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  wallet_address: string;

  @Column({ type: 'int', unique: true, nullable: true })
  user_id: number;

  @Column({ type: 'varchar' })
  nonce: string;

  @Column({ type: 'bigint', default: 1073741824 })
  storage_limit: number;

  @Column({ type: 'bigint', default: 0 })
  storage_used: number;

  @CreateDateColumn()
  created_at: Date;
}
