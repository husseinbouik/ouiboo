import { IsNotEmpty, IsString } from 'class-validator';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';

export class RequestPayoutDto {
    @IsDecimalMoney()
    amount: string | number;

    @IsString()
    @IsNotEmpty()
    bankDetails: string;
}
