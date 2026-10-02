import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get revenue trends for agency
   */
  @Get('revenue-trends')
  async getRevenueTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Request() req: any,
  ) {
    return this.analyticsService.getRevenueTrends(
      req.tenantId,
      new Date(startDate),
      new Date(endDate),
      period,
    );
  }

  /**
   * Get conversion funnel
   */
  @Get('conversion-funnel')
  async getConversionFunnel(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    return this.analyticsService.getConversionFunnel(
      req.tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get top trips
   */
  @Get('top-trips')
  async getTopTrips(
    @Query('limit') limit: string = '10',
    @Request() req: any,
  ) {
    return this.analyticsService.getTopTrips(req.tenantId, parseInt(limit));
  }

  /**
   * Get payment method distribution
   */
  @Get('payment-methods')
  async getPaymentMethods(@Request() req: any) {
    return this.analyticsService.getPaymentMethodDistribution(req.tenantId);
  }

  /**
   * Get customer demographics
   */
  @Get('customer-demographics')
  async getCustomerDemographics(@Request() req: any) {
    return this.analyticsService.getCustomerDemographics(req.tenantId);
  }
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminAnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get platform metrics (admin only)
   */
  @Get('metrics')
  async getPlatformMetrics() {
    return this.analyticsService.getPlatformMetrics();
  }
}
