"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, countryFlag, formatPhone, parsePhone } from "@/lib/countries";

export function PhoneInput({
  value,
  onChange,
  optional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const initial = parsePhone(value);
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);

  useEffect(() => {
    if (!value) return;
    const parsed = parsePhone(value);
    setIso(parsed.iso);
    setNational(parsed.national);
  }, [value]);

  function update(nextIso: string, nextNational: string) {
    setIso(nextIso);
    setNational(nextNational.replace(/\D/g, ""));
    onChange(formatPhone(nextIso, nextNational));
  }

  return (
    <div className="field">
      <span>{optional ? "Phone (optional)" : "Phone"}</span>
      <div className="phone-row">
        <select
          aria-label="Country calling code"
          value={iso}
          onChange={(event) => update(event.target.value, national)}
        >
          {COUNTRIES.map((country) => (
            <option key={country.iso} value={country.iso}>
              {countryFlag(country.iso)} {country.name} +{country.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="241234567"
          required={!optional}
          value={national}
          onChange={(event) => update(iso, event.target.value)}
        />
      </div>
    </div>
  );
}
