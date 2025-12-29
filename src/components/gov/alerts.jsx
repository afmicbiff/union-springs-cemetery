import { base44 } from "@/api/base44Client";
import { getCurrentMetrics } from "./metrics";

// Simple threshold rules (can be adjusted later or driven by entity settings)
const LIMITS = {
  payloadBytes: 1.5 * 1024 * 1024, // 1.5 MB
  requestCount: 50,
  lcp: 2500, // ms
  cls: 0.1,
  inp: 200, // ms
};

const FLAG_KEY = "b44_last_flags_v1";

export async function checkAndAlertRegressions() {
  const m = getCurrentMetrics();
  if (!m || !m.ts) return;

  const flags = [];
  if (typeof m.payloadBytes === "number" && m.payloadBytes > LIMITS.payloadBytes) flags.push("Payload too large");
  if (typeof m.requestCount === "number" && m.requestCount > LIMITS.requestCount) flags.push("Too many requests");
  if (typeof m.lcp === "number" && m.lcp > LIMITS.lcp) flags.push("LCP slow");
  if (typeof m.cls === "number" && m.cls > LIMITS.cls) flags.push("Layout shift high");
  if (typeof m.inp === "number" && m.inp > LIMITS.inp) flags.push("Interaction delay high");

  // Avoid spamming: compare to last sent signature
  const sig = JSON.stringify({ flags, ts: m.ts });
  const last = localStorage.getItem(FLAG_KEY);
  if (flags.length && last !== sig) {
    localStorage.setItem(FLAG_KEY, sig);
    try {
      const user = await base44.auth.me().catch(() => null);
      const message = `Performance regression: ${flags.join(", ")}`;
      await base44.entities.Notification.create({
        message,
        type: "alert",
        user_email: user?.email || null,
        related_entity_type: "other",
        created_at: new Date().toISOString(),
      });
    } catch (_) {
      // non-fatal
    }
  }
}