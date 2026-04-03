export const DEFAULT_COUNTRY_CODE = "HK";
export const DEFAULT_DELIVERY_TIME_ZONE = "Asia/Hong_Kong";
export const DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME = "09:00";

export type DeliveryCountryOption = {
  code: string;
  label: string;
  defaultTimeZone: string;
};

const DELIVERY_COUNTRY_OPTIONS: DeliveryCountryOption[] = [
  { code: "AE", label: "United Arab Emirates", defaultTimeZone: "Asia/Dubai" },
  { code: "AR", label: "Argentina", defaultTimeZone: "America/Argentina/Buenos_Aires" },
  { code: "AU", label: "Australia", defaultTimeZone: "Australia/Sydney" },
  { code: "BR", label: "Brazil", defaultTimeZone: "America/Sao_Paulo" },
  { code: "CA", label: "Canada", defaultTimeZone: "America/Toronto" },
  { code: "CH", label: "Switzerland", defaultTimeZone: "Europe/Zurich" },
  { code: "CN", label: "China", defaultTimeZone: "Asia/Shanghai" },
  { code: "DE", label: "Germany", defaultTimeZone: "Europe/Berlin" },
  { code: "ES", label: "Spain", defaultTimeZone: "Europe/Madrid" },
  { code: "FR", label: "France", defaultTimeZone: "Europe/Paris" },
  { code: "GB", label: "United Kingdom", defaultTimeZone: "Europe/London" },
  { code: "HK", label: "Hong Kong", defaultTimeZone: "Asia/Hong_Kong" },
  { code: "IE", label: "Ireland", defaultTimeZone: "Europe/Dublin" },
  { code: "IN", label: "India", defaultTimeZone: "Asia/Kolkata" },
  { code: "IT", label: "Italy", defaultTimeZone: "Europe/Rome" },
  { code: "JP", label: "Japan", defaultTimeZone: "Asia/Tokyo" },
  { code: "KR", label: "South Korea", defaultTimeZone: "Asia/Seoul" },
  { code: "MO", label: "Macao", defaultTimeZone: "Asia/Macau" },
  { code: "MX", label: "Mexico", defaultTimeZone: "America/Mexico_City" },
  { code: "MY", label: "Malaysia", defaultTimeZone: "Asia/Kuala_Lumpur" },
  { code: "NL", label: "Netherlands", defaultTimeZone: "Europe/Amsterdam" },
  { code: "NO", label: "Norway", defaultTimeZone: "Europe/Oslo" },
  { code: "NZ", label: "New Zealand", defaultTimeZone: "Pacific/Auckland" },
  { code: "PH", label: "Philippines", defaultTimeZone: "Asia/Manila" },
  { code: "SE", label: "Sweden", defaultTimeZone: "Europe/Stockholm" },
  { code: "SG", label: "Singapore", defaultTimeZone: "Asia/Singapore" },
  { code: "TH", label: "Thailand", defaultTimeZone: "Asia/Bangkok" },
  { code: "TW", label: "Taiwan", defaultTimeZone: "Asia/Taipei" },
  { code: "US", label: "United States", defaultTimeZone: "America/New_York" },
  { code: "ZA", label: "South Africa", defaultTimeZone: "Africa/Johannesburg" },
];

export type DeliveryTimeOption = {
  value: string;
  label: string;
};

export function getDeliveryCountryOptions() {
  return DELIVERY_COUNTRY_OPTIONS;
}

export function getCountryLabel(countryCode: string) {
  return COUNTRY_BY_CODE.get(normalizeCountryCode(countryCode))?.label ??
    COUNTRY_BY_CODE.get(DEFAULT_COUNTRY_CODE)?.label ??
    DEFAULT_COUNTRY_CODE;
}

function buildTimeZoneOptions() {
  const supportedTimeZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];

  const values = supportedTimeZones.length > 0
    ? supportedTimeZones
    : Array.from(
        new Set(
          DELIVERY_COUNTRY_OPTIONS.map((option) => option.defaultTimeZone),
        ),
      );

  return values.sort((left, right) => left.localeCompare(right));
}

const DELIVERY_TIME_ZONE_OPTIONS = buildTimeZoneOptions();
const SUPPORTED_TIME_ZONES = new Set(DELIVERY_TIME_ZONE_OPTIONS);
const COUNTRY_BY_CODE = new Map(
  DELIVERY_COUNTRY_OPTIONS.map((option) => [option.code, option]),
);

export function getDeliveryTimeZoneOptions() {
  return DELIVERY_TIME_ZONE_OPTIONS;
}

export function isSupportedCountryCode(value: string) {
  return COUNTRY_BY_CODE.has(value);
}

export function normalizeCountryCode(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_COUNTRY_CODE;
  }

  const normalized = value.trim().toUpperCase();

  return isSupportedCountryCode(normalized)
    ? normalized
    : DEFAULT_COUNTRY_CODE;
}

export function getDefaultDeliveryTimeZoneForCountry(countryCode: string) {
  return COUNTRY_BY_CODE.get(normalizeCountryCode(countryCode))
    ?.defaultTimeZone ?? DEFAULT_DELIVERY_TIME_ZONE;
}

export function isValidDeliveryTimeZone(value: string) {
  return SUPPORTED_TIME_ZONES.has(value.trim());
}

export function normalizeDeliveryTimeZone(
  value: string | null | undefined,
  countryCode?: string | null,
) {
  if (!value) {
    return getDefaultDeliveryTimeZoneForCountry(countryCode ?? DEFAULT_COUNTRY_CODE);
  }

  const normalized = value.trim();

  return isValidDeliveryTimeZone(normalized)
    ? normalized
    : getDefaultDeliveryTimeZoneForCountry(countryCode ?? DEFAULT_COUNTRY_CODE);
}

export function isValidPreferredDeliveryLocalTime(value: string) {
  const match = value.match(/^([01]\d|2[0-3]):([03]0)$/);

  return Boolean(match);
}

export function normalizePreferredDeliveryLocalTime(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME;
  }

  const normalized = value.trim();

  return isValidPreferredDeliveryLocalTime(normalized)
    ? normalized
    : DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME;
}

export function buildDeliveryTimeOptions(): DeliveryTimeOption[] {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = String(Math.floor(index / 2)).padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    const value = `${hour}:${minute}`;

    return {
      value,
      label: formatPreferredDeliveryLocalTime(value),
    };
  });
}

export function formatPreferredDeliveryLocalTime(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number.parseInt(rawHour ?? "", 10);
  const minute = Number.parseInt(rawMinute ?? "", 10);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return value;
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${twelveHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function formatTimeZoneLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function resolveDeliveryPreferences(input: {
  countryCode?: string | null;
  deliveryTimeZone?: string | null;
  preferredDeliveryLocalTime?: string | null;
}) {
  const countryCode = normalizeCountryCode(input.countryCode);
  const deliveryTimeZone = normalizeDeliveryTimeZone(
    input.deliveryTimeZone,
    countryCode,
  );
  const preferredDeliveryLocalTime = normalizePreferredDeliveryLocalTime(
    input.preferredDeliveryLocalTime,
  );

  return {
    countryCode,
    deliveryTimeZone,
    preferredDeliveryLocalTime,
  };
}

export function inferCountryCodeFromBrowser(options: {
  region?: string | null;
  timeZone?: string | null;
}) {
  const normalizedRegion = normalizeCountryCode(options.region ?? undefined);

  if (normalizedRegion !== DEFAULT_COUNTRY_CODE || options.region?.trim().toUpperCase() === DEFAULT_COUNTRY_CODE) {
    return normalizedRegion;
  }

  const matchedCountry = DELIVERY_COUNTRY_OPTIONS.find(
    (option) => option.defaultTimeZone === options.timeZone,
  );

  return matchedCountry?.code ?? DEFAULT_COUNTRY_CODE;
}
