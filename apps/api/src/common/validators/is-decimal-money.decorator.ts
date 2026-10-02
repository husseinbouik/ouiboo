import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const DECIMAL_MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

type DecimalMoneyOptions = {
  allowZero?: boolean;
  validationOptions?: ValidationOptions;
};

export const IsDecimalMoney = (options: DecimalMoneyOptions = {}) =>
  (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isDecimalMoney',
      target: object.constructor,
      propertyName,
      options: options.validationOptions,
      validator: {
        validate(value: unknown) {
          const minimum = options.allowZero ? 0 : 0.0000001;
          if (typeof value === 'number') {
            return Number.isFinite(value) && value >= minimum;
          }

          return typeof value === 'string' && DECIMAL_MONEY_PATTERN.test(value) && Number(value) >= minimum;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a ${options.allowZero ? 'non-negative' : 'positive'} decimal amount with at most 2 decimal places`;
        },
      },
    });
  };
