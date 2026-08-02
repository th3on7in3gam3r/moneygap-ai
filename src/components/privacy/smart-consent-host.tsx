"use client";

import { useEffect, useState } from "react";
import { SmartConsent } from "./smart-consent";

/** Mounts Smart Consent™ and listens for reopen events from footer / Privacy Center. */
export function SmartConsentHost() {
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    const handler = () => setForceOpen(true);
    window.addEventListener("mg:open-smart-consent", handler);
    return () => window.removeEventListener("mg:open-smart-consent", handler);
  }, []);

  return (
    <SmartConsent
      forceOpen={forceOpen}
      onClose={() => setForceOpen(false)}
    />
  );
}
