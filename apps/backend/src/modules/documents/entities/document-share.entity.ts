import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_shares')
export class DocumentShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'varchar', length: 42 })
  owner_wallet: string;

  @Column({ type: 'varchar', length: 42 })
  shared_with_wallet: string;

  @Column({ type: 'varchar', default: 'view' })
  permission: string;

  @CreateDateColumn()
  created_at: Date;
}
