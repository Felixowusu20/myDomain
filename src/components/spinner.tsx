export function Spinner({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  return <span className={`spinner spinner-${size}`} aria-hidden="true" />;
}

export function BusyLabel({
  busy,
  busyText = "Please wait",
  children,
}: {
  busy: boolean;
  busyText?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {busy ? <Spinner size="sm" /> : null}
      {busy ? busyText : children}
    </>
  );
}
