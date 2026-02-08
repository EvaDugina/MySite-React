// contexts/ZoneContext.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";

const ZoneContext = createContext(null);

export function ZoneProvider({ children }) {
  const zoneRefs = useRef({});

  const registerZone = (zoneId, element) => {
    zoneRefs.current[zoneId] = element;
  };

  const unregisterZone = (zoneId) => {
    delete zoneRefs.current[zoneId];
  };

  const getZoneElement = (zoneId) => {
    return zoneRefs.current[zoneId];
  };

  return (
    <ZoneContext.Provider
      value={{ registerZone, unregisterZone, getZoneElement }}
    >
      {children}
    </ZoneContext.Provider>
  );
}

export const useZones = () => {
  const context = useContext(ZoneContext);
  if (!context) {
    throw new Error("useZones must be used within ZoneProvider");
  }
  return context;
};
