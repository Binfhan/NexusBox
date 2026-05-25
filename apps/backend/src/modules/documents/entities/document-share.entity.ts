import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { Folder } from './folder.entity';

export enum PermissionLevel {
  OWNER = 'owner',
  EDITOR = 'editor',
  COMMENTER = 'commenter',
  VIEWER = 'viewer',
}

@Entity('document_shares')
export class DocumentShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'uuid', nullable: true })
  folder_id: string;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @Column({ type: 'varchar', length: 42 })
  owner_wallet: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  shared_with_wallet: string;

  @Column({ type: 'varchar', nullable: true })
  target_email: string;

  @Column({ type: 'varchar', default: 'file' })
  resource_type: 'file' | 'folder';

  @Column({ type: 'varchar', default: PermissionLevel.VIEWER })
  permission: string;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'uuid', default: () => 'gen_random_uuid()' })
  token: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
