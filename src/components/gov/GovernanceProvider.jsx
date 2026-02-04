import React from "react";

export const GovernanceContext = React.createContext({});

export default function GovernanceProvider({ children }) {
  return (
    <GovernanceContext.Provider value={{}}>
      {children}
    </GovernanceContext.Provider>
  );
}