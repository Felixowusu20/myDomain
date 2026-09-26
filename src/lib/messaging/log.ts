export function logMessaging(event: string, fields: Record<string, string | number | boolean | null> = {}) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "messaging",
      event,
      ...fields,
    }),
  );
}
