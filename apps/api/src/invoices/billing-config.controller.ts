import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { getBillingConfig } from '../common/billing-config';

/**
 * #698 (Council S6): the public billing configuration — the witness
 * surface for the pricing restructure. Configuration only: it changes
 * no live billing behaviour by being read.
 */
@ApiTags('Billing')
@Controller('billing')
export class BillingConfigController {
    @Get('config')
    @ApiOperation({ summary: 'Public billing configuration (#698)' })
    getConfig() {
        const config = getBillingConfig();
        return {
            freeTier: {
                publishable: config.freeTierPublishable,
                // A Free agency can publish trips; publishing is never paywalled.
                publishingPaywalled: !config.freeTierPublishable,
            },
            serviceFee: {
                // Charged TO THE AGENCY and invoiced monthly — never
                // deducted from traveller payments.
                chargedTo: 'AGENCY',
                invoiced: true,
                onCompletedBookingsOnly: config.serviceFeeOnCompletedOnly,
                billableBookingStatuses: config.serviceFeeOnCompletedOnly
                    ? config.serviceFeeBookingStatuses
                    : 'ANY_PAID',
            },
            betaCohort: {
                grandfatherMonths: config.betaCohortGrandfatherMonths,
                grandfatherTier: 'PRO',
            },
        };
    }
}
