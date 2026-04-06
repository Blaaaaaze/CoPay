const SYM: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

export function currencySymbol(code: string): string {
  return SYM[code] || code;
}

export function formatMoney(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  const n = Math.round(amount * 100) / 100;
  return `${n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${sym}`;
}
