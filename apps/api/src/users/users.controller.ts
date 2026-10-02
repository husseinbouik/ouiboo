import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { UpdateAgencyProfileDto } from './dto/update-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    getMe(@Request() req) {
        return this.usersService.getMe(req.user.userId);
    }

    @Patch('me')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update current user profile' })
    updateMe(@Request() req, @Body() body: UpdateUserProfileDto) {
        return this.usersService.updateUserProfile(req.user.userId, body);
    }

    @Post('agency-profile')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Agency)
    @ApiOperation({ summary: 'Update agency profile' })
    updateProfile(@Request() req, @Body() body: UpdateAgencyProfileDto) {
        return this.usersService.updateAgencyProfile(req.user.userId, body);
    }
}
