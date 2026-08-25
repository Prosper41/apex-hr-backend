const runSuffix = Date.now();

export function uniqueEmail(label: string): string {
  const noise = Math.random().toString(36).slice(2, 8);
  return `${label}.${runSuffix}.${noise}@apexhr-test.com`;
}

/**
 * Generates a unique company name for the same reason (Tenant.name is
 * @unique in the schema).
 */
export function uniqueCompanyName(label: string): string {
  const noise = Math.random().toString(36).slice(2, 8);
  return `ApexTest ${label} ${runSuffix}-${noise}`;
}
