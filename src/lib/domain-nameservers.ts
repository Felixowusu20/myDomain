const MOCK_NS_PATTERN = /mockprovider\.com/i;

/** Drop placeholder/mock nameserver values before showing them to customers. */
export function displayNameservers(nameservers: string[]) {
  return nameservers
    .map((ns) => ns.trim())
    .filter((ns) => ns.length > 0 && !MOCK_NS_PATTERN.test(ns));
}

export function isMockNameserverList(nameservers: string[]) {
  if (!nameservers.length) return false;
  return nameservers.every((ns) => MOCK_NS_PATTERN.test(ns));
}
