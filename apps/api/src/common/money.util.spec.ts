import { decimalEqualsMoney, multiplyMoney, toMinorUnits, toMoneyString, toRateString } from './money.util';

describe('money utilities', () => {
  it('multiplies money exactly and serializes fixed-scale decimal strings', () => {
    expect(toMoneyString(multiplyMoney('199.99', 3))).toBe('599.97');
  });

  it('compares decimal money values by value, not JS floating point representation', () => {
    expect(decimalEqualsMoney('500.00', 500)).toBe(true);
    expect(decimalEqualsMoney('500.00', '500.005')).toBe(false);
  });

  it('converts provider amounts to minor units without JS float multiplication', () => {
    expect(toMinorUnits('0.29')).toBe(29);
    expect(toMinorUnits('10.10')).toBe(1010);
  });

  it('serializes exchange rates with eight decimal places', () => {
    expect(toRateString('0.092')).toBe('0.09200000');
  });
});
