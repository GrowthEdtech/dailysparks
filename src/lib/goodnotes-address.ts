const GOODNOTES_EMAIL_SUFFIX = "@goodnotes.email";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInput(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getGoodnotesLocalPart(value: string) {
  const normalizedValue = normalizeInput(value);

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.endsWith(GOODNOTES_EMAIL_SUFFIX)) {
    return normalizedValue.slice(0, -GOODNOTES_EMAIL_SUFFIX.length);
  }

  const [localPart = ""] = normalizedValue.split("@");
  return localPart;
}

export function normalizeGoodnotesAddress(value: unknown) {
  const normalizedValue = normalizeInput(value);

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.endsWith(GOODNOTES_EMAIL_SUFFIX)) {
    return normalizedValue;
  }

  if (normalizedValue.includes("@")) {
    return "";
  }

  return `${normalizedValue}${GOODNOTES_EMAIL_SUFFIX}`;
}

export function isValidGoodnotesAddress(value: string) {
  return value.endsWith(GOODNOTES_EMAIL_SUFFIX) && EMAIL_REGEX.test(value);
}

export { GOODNOTES_EMAIL_SUFFIX };
