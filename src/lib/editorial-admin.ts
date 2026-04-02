function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEditorialAdminEmails() {
  const rawValue = process.env.DAILY_SPARKS_ADMIN_EMAILS ?? "";

  return rawValue
    .split(/[\n,;]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function isEditorialAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getEditorialAdminEmails().includes(normalizeEmail(email));
}
