import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserRole } from '@ouiboo/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    const seedEnabled = process.env.ADMIN_SEED === 'true'
      || (!isProduction && process.env.ADMIN_SEED !== 'false');

    if (!seedEnabled) {
      return;
    }

    const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const password = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin1234');
    const email = process.env.ADMIN_EMAIL?.trim() || (isProduction ? '' : `${username}@ouiboo.local`);

    if (isProduction) {
      const weakPasswordPattern = /^(?:admin|password|(?:change|replace)-me)$/i;
      if (!email || !password || password.length < 15 || weakPasswordPattern.test(password)) {
        throw new Error(
          'Production admin seeding requires ADMIN_EMAIL and a strong ADMIN_PASSWORD of at least 15 characters.',
        );
      }
    }

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
