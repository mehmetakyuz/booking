export function Spinner({ small = false }: { small?: boolean }) {
  return <div className={small ? "spinner spinner--sm" : "spinner"} aria-label="Loading" />;
}

export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="loading-overlay">
      <Spinner />
      {label && <span style={{ fontSize: 14, color: "var(--grey-darkest)" }}>{label}</span>}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
