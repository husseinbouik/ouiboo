import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';

export type MoneyInput = Prisma.Decimal | string | number;

const DECIMAL_STRING_PATTERN = /^\d+(\.\d+)?$/;

export const toDecimal = (value: MoneyInput, fieldName = 'amount') => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a finite decimal value`);
    }
    return new Prisma.Decimal(value.toString());
  }

  const trimmed = value.trim();
  if (!DECIMAL_STRING_PATTERN.test(trimmed)) {
    throw new BadRequestException(`${fieldName} must be a positive decimal value`);
  }

  return new Prisma.Decimal(trimmed);
};

export const toSignedDecimal = (value: MoneyInput, fieldName = 'amount') => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a finite decimal value`);
    }
    return new Prisma.Decimal(value.toString());
  }

  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new BadRequestException(`${fieldName} must be a decimal value`);
  }

  return new Prisma.Decimal(trimmed);
};

export const toMoneyDecimal = (value: MoneyInput, fieldName = 'amount') =>
  toDecimal(value, fieldName).toDecimalPlaces(2);

export const toRateDecimal = (value: MoneyInput, fieldName = 'rate') =>
  toDecimal(value, fieldName).toDecimalPlaces(8);

export const multiplyMoney = (amount: MoneyInput, multiplier: number) => {
  if (!Number.isInteger(multiplier) || multiplier <= 0) {
    throw new BadRequestException('Money multiplier must be a positive integer');
  }

  return toMoneyDecimal(amount).mul(multiplier).toDecimalPlaces(2);
};

export const decimalEqualsMoney = (left: MoneyInput, right: MoneyInput) =>
  toMoneyDecimal(left).equals(toMoneyDecimal(right));

export const toMoneyString = (value: MoneyInput | null | undefined) =>
  value == null ? undefined : toMoneyDecimal(value).toFixed(2);

export const toRateString = (value: MoneyInput | null | undefined) =>
  value == null ? undefined : toRateDecimal(value).toFixed(8);

export const toMinorUnits = (value: MoneyInput) =>
  toMoneyDecimal(value).mul(100).toDecimalPlaces(0).toNumber();

export const decimalAbs = (value: MoneyInput) => toSignedDecimal(value).abs().toDecimalPlaces(2);

export const decimalZero = () => new Prisma.Decimal(0);
