/**
 * Formatting and parsing helpers for Money Map.
 *
 * PRD Rules:
 * - Rule 2: Money is stored as integers in minor units in amount_minor.
 *   Format only at display time with Intl.NumberFormat and the user's currency.
 * - Rule 3: Every date the user sees or types is DD-MM-YYYY.
 *   Internally stored as YYYY-MM-DD (no time zone).
 */

const LEAP_YEAR_MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const COMMON_YEAR_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const ZERO_BIG = BigInt(0);
const ONE_BIG = BigInt(1);
const TEN_BIG = BigInt(10);
const HUNDRED_BIG = BigInt(100);
const MAX_SAFE_BIG = BigInt("9007199254740991");
const MIN_SAFE_BIG = -MAX_SAFE_BIG;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates whether a day/month/year combination forms a real calendar date.
 */
export function isValidDateParts(day: number, month: number, year: number): boolean {
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  const daysInMonth = isLeapYear(year)
    ? LEAP_YEAR_MONTH_DAYS[month - 1]
    : COMMON_YEAR_MONTH_DAYS[month - 1];
  return day >= 1 && day <= daysInMonth;
}

/**
 * Checks whether a display date string is in strict "DD-MM-YYYY" format and valid.
 */
export function isValidDisplayDate(displayDate: string): boolean {
  if (typeof displayDate !== "string") return false;
  const match = displayDate.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return false;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return isValidDateParts(day, month, year);
}

/**
 * Converts internal ISO date ("YYYY-MM-DD" or ISO timestamp) to user-facing "DD-MM-YYYY".
 *
 * e.g. "2026-10-20" -> "20-10-2026"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate || typeof isoDate !== "string") return "";
  const trimmed = isoDate.trim();
  // If already DD-MM-YYYY, return normalized
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  const datePart = trimmed.slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO date format: "${isoDate}". Expected YYYY-MM-DD.`);
  }
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/**
 * Parses user input "DD-MM-YYYY" into internal storage format "YYYY-MM-DD".
 * Rejects invalid dates (invalid format, invalid month/day, non-leap year Feb 29).
 *
 * e.g. "20-10-2026" -> "2026-10-20"
 */
export function parseDisplayDate(displayDate: string): string {
  if (!displayDate || typeof displayDate !== "string") {
    throw new Error(`Invalid display date: "${displayDate}". Expected DD-MM-YYYY.`);
  }
  const trimmed = displayDate.trim();
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid display date format: "${displayDate}". Expected DD-MM-YYYY.`);
  }
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (!isValidDateParts(day, month, year)) {
    throw new Error(`Invalid calendar date: "${displayDate}".`);
  }

  const padDay = day.toString().padStart(2, "0");
  const padMonth = month.toString().padStart(2, "0");
  const padYear = year.toString().padStart(4, "0");
  return `${padYear}-${padMonth}-${padDay}`;
}

/**
 * Safely parses user input "DD-MM-YYYY", returning null if invalid.
 */
export function tryParseDisplayDate(displayDate: string): string | null {
  try {
    return parseDisplayDate(displayDate);
  } catch {
    return null;
  }
}

/**
 * Resolves appropriate locale for a 3-letter currency code.
 */
function getCurrencyLocale(currency: string): string {
  switch (currency.toUpperCase()) {
    case "NGN":
      return "en-NG";
    case "GBP":
      return "en-GB";
    case "EUR":
      return "de-DE";
    default:
      return "en-US";
  }
}

/**
 * Formats minor units (kobo, cents) into a currency string with 2 decimal places.
 * Uses Intl.NumberFormat and the user's currency.
 *
 * e.g. 15000000 kobo, "NGN" -> "₦150,000.00"
 */
export function formatMoney(
  amountMinor: bigint | number,
  currency = "NGN",
): string {
  const normCurrency = (currency || "NGN").toUpperCase();
  const locale = getCurrencyLocale(normCurrency);

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const big = typeof amountMinor === "bigint" ? amountMinor : BigInt(Math.trunc(amountMinor));

  // If within safe integer range, Number division is safe for display
  if (big >= MIN_SAFE_BIG && big <= MAX_SAFE_BIG) {
    return formatter.format(Number(big) / 100);
  }

  // Large BigInt beyond MAX_SAFE_INTEGER: format major units and append cents manually
  const isNegative = big < ZERO_BIG;
  const abs = isNegative ? -big : big;
  const major = abs / HUNDRED_BIG;
  const minor = abs % HUNDRED_BIG;
  const formattedMajor = new Intl.NumberFormat(locale, {
    useGrouping: true,
  }).format(major);
  const minorStr = minor.toString().padStart(2, "0");

  // Extract currency symbol
  const sample = formatter.format(0);
  const symbol = sample.replace(/[\d.,\s\u00A0-]/g, "") || normCurrency;

  return `${isNegative ? "-" : ""}${symbol}${formattedMajor}.${minorStr}`;
}

/**
 * Converts user input string (e.g. "1,500.50" or "1500") into minor units integer.
 * Zero float math.
 *
 * e.g. "1,500.50" -> 150050
 */
export function toMinor(value: string | number): number {
  if (typeof value === "number") {
    return Math.trunc(value);
  }
  if (!value || typeof value !== "string") {
    return 0;
  }

  // Remove currency symbols, commas, spaces, and non-numeric chars except '.' and '-'
  const cleaned = value.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return 0;
  }

  const isNegative = cleaned.startsWith("-");
  const unsigned = isNegative ? cleaned.slice(1) : cleaned;

  const parts = unsigned.split(".");
  const majorPart = parts[0] || "0";
  const rawMinor = parts[1] || "";

  const majorBig = BigInt(majorPart || "0");

  // Keep first 2 digits of decimal, pad with 0 if needed
  let minorBig = ZERO_BIG;
  if (rawMinor.length === 1) {
    minorBig = BigInt(rawMinor[0]) * TEN_BIG;
  } else if (rawMinor.length >= 2) {
    const twoDigits = rawMinor.slice(0, 2);
    minorBig = BigInt(twoDigits);
    // Optional round half-up for 3rd digit
    if (rawMinor.length >= 3 && Number.parseInt(rawMinor[2], 10) >= 5) {
      minorBig += ONE_BIG;
    }
  }

  const total = majorBig * HUNDRED_BIG + minorBig;
  const signedTotal = isNegative ? -total : total;

  return Number(signedTotal);
}

/**
 * Converts integer minor units into major units string with 2 decimal places.
 * Zero float math.
 *
 * e.g. 150050 -> "1500.50"
 */
export function fromMinor(amountMinor: bigint | number): string {
  const big = typeof amountMinor === "bigint" ? amountMinor : BigInt(Math.trunc(amountMinor || 0));
  const isNegative = big < ZERO_BIG;
  const abs = isNegative ? -big : big;
  const major = abs / HUNDRED_BIG;
  const minor = abs % HUNDRED_BIG;
  const minorStr = minor.toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${major.toString()}.${minorStr}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats YYYY-MM or ISO date string to "Month YYYY", e.g. "2026-10" -> "October 2026".
 */
export function formatMonthYear(ymOrDate: string): string {
  if (!ymOrDate || typeof ymOrDate !== "string") return "";
  const match = ymOrDate.match(/^(\d{4})-(\d{2})/);
  if (!match) return "";
  const year = match[1];
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return "";
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}

