import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private db: DatabaseService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.db.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            accessToken: this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET || 'access-secret',
                expiresIn: '15m',
            }),
            refreshToken: this.jwtService.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
                expiresIn: '7d',
            }),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    async register(dto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.db.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    password: hashedPassword,
                    role: dto.role as any,
                },
            });

            if (dto.role === 'AGENCY') {
                const profile = await tx.agencyProfile.create({
                    data: {
                        userId: newUser.id,
                        companyName: dto.name, // Use name as initial company name
                        ice: 'PENDING_' + newUser.id.substring(0, 7), // Temporary unique value
                        patente: 'PENDING',
                        rib: 'PENDING',
                    }
                });

                await tx.wallet.create({
                    data: {
                        agencyId: profile.id,
                    }
                });
            }

            return newUser;
        });

        return this.login(user);
    }

    async refreshToken(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            });
            const user = await this.db.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();

            return this.login(user);
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
