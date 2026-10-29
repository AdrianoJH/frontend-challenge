const DECIMALS = 18n;
const SCALE = 10n ** DECIMALS;

export type Eth = string;

export function toWei(value: Eth): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid ETH amount: "${value}"`);
  }
  const negative = trimmed.startsWith('-');
  const [whole, fraction = ''] = (negative ? trimmed.slice(1) : trimmed).split('.');
  if (fraction.length > Number(DECIMALS)) {
    throw new Error(`Too many decimals in ETH amount: "${value}"`);
  }
  const paddedFraction = fraction.padEnd(Number(DECIMALS), '0');
  const wei = BigInt(whole) * SCALE + BigInt(paddedFraction || '0');
  return negative ? -wei : wei;
}

export function fromWei(wei: bigint): Eth {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / SCALE;
  const fraction = abs % SCALE;
  const fractionStr = fraction.toString().padStart(Number(DECIMALS), '0').replace(/0+$/, '');
  const result = fractionStr.length > 0 ? `${whole}.${fractionStr}` : `${whole}`;
  return negative ? `-${result}` : result;
}

export function addEth(a: Eth, b: Eth): Eth {
  return fromWei(toWei(a) + toWei(b));
}

export function subEth(a: Eth, b: Eth): Eth {
  return fromWei(toWei(a) - toWei(b));
}

export function mulEth(amount: Eth, quantity: number): Eth {
  if (!Number.isInteger(quantity)) {
    throw new Error(`Quantity must be an integer, got ${quantity}`);
  }
  return fromWei(toWei(amount) * BigInt(quantity));
}

export function sumEth(amounts: Eth[]): Eth {
  return fromWei(amounts.reduce((acc, a) => acc + toWei(a), 0n));
}

export function cmpEth(a: Eth, b: Eth): -1 | 0 | 1 {
  const wa = toWei(a);
  const wb = toWei(b);
  return wa < wb ? -1 : wa > wb ? 1 : 0;
}

export function formatEth(value: Eth, maxFractionDigits = 4): string {
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  const sign = value.startsWith('-') ? '-' : '';
  const trimmedFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  const wholeFormatted = Number(whole).toLocaleString('en-US');
  return trimmedFraction.length > 0
    ? `${sign}${wholeFormatted}.${trimmedFraction}`
    : `${sign}${wholeFormatted}`;
}
