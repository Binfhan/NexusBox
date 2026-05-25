import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string;

  @ManyToOne(() => Folder, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Folder;

  @Column({ type: 'varchar', length: 42 })
  owner_wallet: string;

  @CreateDateColumn()
  created_at: Date;
}
