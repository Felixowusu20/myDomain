"use client";

import { Brand } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";

export function ThemeBrand({ size = "md" }: { size?: "md" | "lg" }) {
  const { theme } = useTheme();
  return <Brand light={theme === "dark"} size={size} />;
}
