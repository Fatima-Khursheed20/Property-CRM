/** Pakistani mobile: digits only for wa.me — country code + number without leading + */

export function normalizeWhatsAppHref(
  rawPhone: string,
  countryCodeDigits = "92"
): string {
  const digits = rawPhone.replace(/\D/g, "");
  const stripped =
    digits.startsWith(countryCodeDigits) &&
    digits.length > countryCodeDigits.length
      ? digits.slice(countryCodeDigits.length)
      : digits.startsWith("0")
        ? digits.slice(1)
        : digits;

  const international = `${countryCodeDigits}${stripped}`;
  return `https://wa.me/${international}`;
}
