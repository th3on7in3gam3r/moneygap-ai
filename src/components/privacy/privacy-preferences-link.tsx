"use client";

export function PrivacyPreferencesLink({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("mg:open-smart-consent"));
      }}
    >
      Privacy preferences
    </button>
  );
}
