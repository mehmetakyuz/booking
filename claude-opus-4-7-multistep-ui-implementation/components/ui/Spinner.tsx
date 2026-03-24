export function Spinner({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <span className="loader-spinner-wrap" role="status">
      <span
        className="loader-spinner spinner"
        style={{ width: size, height: size }}
        aria-hidden
      />
      {label ? <span className="loader-spinner-label">{label}</span> : null}
    </span>
  )
}
