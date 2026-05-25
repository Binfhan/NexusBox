import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'bigint' })
  max_bytes: number;

  @Column({ type: 'integer' })
  max_docs: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price_usd: number;
}
