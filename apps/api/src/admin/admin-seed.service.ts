import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserRole } from '@ouiboo/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    if (process.env.ADMIN_SEED === 'false') {
      return;
    }

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const email = process.env.ADMIN_EMAIL || `${username}@ouiboo.local`;

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isEmailVerified || existing.role !== UserRole.Admin) {
        await this.db.user.update({
          where: { email },
          data: {
            isEmailVerified: true,
            role: UserRole.Admin,
          },
        });
        this.logger.log(`Updated admin user role/verification for ${email}.`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.db.user.create({
      data: {
        name: username,
        email,
        password: hashedPassword,
        role: UserRole.Admin,
        isEmailVerified: true,
      },
    });

    this.logger.log(`Seeded admin user ${email}.`);
  }
}
