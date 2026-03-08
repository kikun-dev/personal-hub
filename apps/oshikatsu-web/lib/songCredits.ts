export function splitCreditNames(value: string): string[] {
  return value
    .split(/[、,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
