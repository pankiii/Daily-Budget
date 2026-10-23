import { formatINR, formatINRCompact, groupIndian, parseINR } from '../src/domain/money';

describe('Indian number formatting', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1,000'],
    [100000, '1,00,000'],
    [1234567, '12,34,567'],
    [10000000, '1,00,00,000'],
  ])('groups %d as %s', (n, s) => expect(groupIndian(n)).toBe(s));

  it('formats paise as rupees', () => {
    expect(formatINR(10000000)).toBe('₹1,00,000');
    expect(formatINR(333333)).toBe('₹3,333');
    expect(formatINR(-86700)).toBe('−₹867');
    expect(formatINR(60050, { decimals: true })).toBe('₹600.50');
    expect(formatINR(50000, { sign: true })).toBe('+₹500');
  });

  it('compacts lakhs and crores', () => {
    expect(formatINRCompact(10000000)).toBe('₹1L');
    expect(formatINRCompact(320000)).toBe('₹3.2K');
    expect(formatINRCompact(2500000000)).toBe('₹2.5Cr');
  });

  it('parses user input', () => {
    expect(parseINR('1,00,000')).toBe(10000000);
    expect(parseINR('₹ 2,500.50')).toBe(250050);
    expect(parseINR('Rs.600')).toBe(60000);
    expect(parseINR('abc')).toBeNull();
  });
});
