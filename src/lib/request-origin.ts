function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export function getRequestOrigin(request: Request) {
  const forwardedHost = getFirstHeaderValue(request.headers.get("x-forwarded-host"));
  const forwardedProto =
    getFirstHeaderValue(request.headers.get("x-forwarded-proto")) || "https";
  const host = getFirstHeaderValue(request.headers.get("host"));

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const url = new URL(request.url);
    return `${url.protocol}//${host}`;
  }

  return new URL(request.url).origin;
}
