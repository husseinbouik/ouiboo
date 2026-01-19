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
    const rotateOnBoot = process.env.ADMIN_SEED_ROTATE === 'true';
    const hasPasswordOverride = typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length > 0;
    const shouldRotatePassword = rotateOnBoot && hasPasswordOverride;

    if (rotateOnBoot && !hasPasswordOverride) {
      this.logger.warn('ADMIN_SEED_ROTATE is true but ADMIN_PASSWORD is not set; skipping password rotation.');
    }

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      const updateData: Record<string, any> = {};
      if (!existing.isEmailVerified) {
        updateData.isEmailVerified = true;
      }
      if (existing.role !== UserRole.Admin) {
        updateData.role = UserRole.Admin;
      }
      if (username && existing.name !== username) {
        updateData.name = username;
      }
      if (shouldRotatePassword) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updateData).length > 0) {
        await this.db.user.update({
          where: { email },
          data: updateData,
        });
        this.logger.log(`Updated admin user for ${email}.${shouldRotatePassword ? ' Password rotated.' : ''}`);
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
