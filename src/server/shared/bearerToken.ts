import { timingSafeEqual } from "node:crypto";

interface RequestWithHeaders {
  headers?: Record<string, string | string[] | undefined>;
}

const requestHeader = (
  request: RequestWithHeaders,
  name: string,
): string | undefined => {
  const entry = Object.entries(request.headers ?? {})
    .find(([headerName]) => headerName.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] : value;
};

export const hasValidBearerToken = (
  request: RequestWithHeaders,
  expectedToken: string,
): boolean => {
  const authorization = requestHeader(request, "authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;
  const actual = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
