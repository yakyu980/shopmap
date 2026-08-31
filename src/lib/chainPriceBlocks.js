export function groupChainPrices(rows, venues) {
  const visible = new Set(venues);
  const chains = new Map();
  for (const row of rows) {
    if (!visible.has(row.venueName) || !Number.isFinite(row.price) || row.price <= 0) continue;
    const name = row.chainName || row.venueName?.split(' · ')[0] || 'רשת לא ידועה';
    const current = chains.get(name);
    if (!current || row.price < current.price) chains.set(name, { ...row, chainName: name });
  }
  return [...chains.values()].sort((a, b) => a.price - b.price || a.chainName.localeCompare(b.chainName, 'he'));
}
