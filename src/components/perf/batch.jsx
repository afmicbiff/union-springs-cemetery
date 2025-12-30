import { apiFetch } from "./netGuard";

let queue = [];
let timer = null;

function flush() {
  const batch = queue;
  queue = [];
  timer = null;

  return apiFetch("/functions/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calls: batch.map((x) => x.call) }),
  })
    .then((r) => r.json())
    .then((result) => {
      const list = Array.isArray(result?.results) ? result.results : [];
      list.forEach((item, i) => {
        if (item && item.ok) {
          batch[i].resolve(item.data);
        } else {
          batch[i].reject(new Error(item?.error || "Batch item failed"));
        }
      });
    })
    .catch((err) => {
      batch.forEach((x) => x.reject(err));
    });
}

/**
 * batchCall merges requests happening within a short window.
 * Use for dashboards, homepages, and list pages.
 */
export function batchCall(call) {
  return new Promise((resolve, reject) => {
    queue.push({ call, resolve, reject });
    if (!timer) timer = setTimeout(flush, 20);
  });
}

// Optional helper to batch multiple calls at once
export function batchAll(calls) {
  return Promise.all(calls.map((c) => batchCall(c)));
}