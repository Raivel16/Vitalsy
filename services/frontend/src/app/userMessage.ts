const TECHNICAL =
  /failed to fetch|networkerror|network request failed|load failed|sqlstate|exception|stack trace|the given data|syntaxerror|typeerror|internal server error|whoops|csrf|unauthenticated|server error|undefined is not/i;

export function userMessage(raw: string | undefined, fallback: string): string {
  const message = raw?.trim() ?? "";
  if (!message || isTechnical(message)) return fallback;
  return message;
}

export function errorText(caught: unknown, fallback: string): string {
  return userMessage(caught instanceof Error ? caught.message : undefined, fallback);
}

function isTechnical(message: string): boolean {
  if (TECHNICAL.test(message)) return true;
  if (/^The .+ field /i.test(message)) return true;
  return (
    /^[A-Za-z0-9_ .:\/\\()-]+$/.test(message) &&
    /\b(error|exception|failed|invalid|required)\b/i.test(message)
  );
}
