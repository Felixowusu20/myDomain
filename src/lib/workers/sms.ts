import { logMessaging } from "@/lib/messaging/log";
import { processSmsBatch } from "@/lib/messaging/queue";

async function main() {
  logMessaging("worker.start", { connector: "mock", simulated: true });
  for (;;) {
    try {
      const count = await processSmsBatch(20);
      await new Promise((resolve) => setTimeout(resolve, count > 0 ? 250 : 1000));
    } catch {
      logMessaging("worker.error", { connector: "mock" });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const entry = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (entry.endsWith("/workers/sms.ts") || entry.endsWith("/workers/sms.js")) {
  void main();
}
