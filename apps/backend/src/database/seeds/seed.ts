import { DataSource } from "typeorm";
import * as bcrypt from 'bcrypt'
// seed.ts — chạy một lần trước khi deploy
async function seed(dataSource: DataSource) {

  // 1. Plans — BẮT BUỘC, app không chạy được nếu thiếu
  await dataSource.query(`
    INSERT INTO plans (name, max_bytes, max_docs, price_usd)
    VALUES
      ('free',       209715200,    50,   0.00),
      ('pro',        5368709120,   500,  19.00),
      ('business',   21474836480,  2000, 79.00),
      ('enterprise', 107374182400, -1,   299.00)
    ON CONFLICT (name) DO NOTHING;
  `);

  // 2. Admin user — để quản lý hệ thống
  const adminHash = await bcrypt.hash('ChangeMe!2024', 12);
  await dataSource.query(`
    INSERT INTO users (email, password_hash, display_name, role, email_verified)
    VALUES ('admin@docvault.io', '${adminHash}', 'Admin', 'admin', true)
    ON CONFLICT (email) DO NOTHING;
  `);

  // 3. Tạo user_storage cho admin với plan enterprise
  await dataSource.query(`
    INSERT INTO user_storage (user_id, plan_id)
    SELECT u.id, p.id
    FROM   users u, plans p
    WHERE  u.email = 'admin@docvault.io'
      AND  p.name  = 'enterprise'
    ON CONFLICT (user_id) DO NOTHING;
  `);

  console.log('Seed completed.');
}