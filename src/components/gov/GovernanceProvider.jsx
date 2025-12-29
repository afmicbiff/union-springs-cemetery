import React from "react";
import { initPerfObservers, getCurrentMetrics } from "./metrics";
import { checkAndAlertRegressions } from "./alerts";

export const GovernanceContext = React.createContext({});

export default function GovernanceProvider({ children }) {
  React.useEffect(() => {
    const stop = initPerfObservers();
    const t = setTimeout(async () => {
      try {
        await checkAndAlertRegressions();
      } catch (_) {}
    }, 0);
    return () => {
      clearTimeout(t);
      stop && stop();
    };
  }, []);

  // Expose latest metrics on a global for ad-hoc debugging
  React.useEffect(() => {
    window.__B44_GOV = window.__B44_GOV || {};
    window.__B44_GOV.getMetrics = getCurrentMetrics;
  }, []);

  return (
    <GovernanceContext.Provider value={{}}>
      {children}
    </GovernanceContext.Provider>
  );
}