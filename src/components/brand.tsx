import Image from "next/image";

export function Brand({
  light = false,
  size = "md",
}: {
  light?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <div className={`brand ${large ? "is-lg" : ""} ${light ? "is-light" : ""}`}>
      <Image
        src="/brand/mark.png"
        alt=""
        width={81}
        height={52}
        className="brand-mark"
      />
      <span className="brand-word">
        <span className="brand-my">my</span>Domain
      </span>
    </div>
  );
}
