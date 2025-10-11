export class PaissaDbUrlBuilder {
  static buildUrl(
    worldId: number,
    districtId: number | null,
    size: number | null,
    lotteryPhase: number | null,
    allowedTenants: number | null,
  ): string {
    return `https://zhu.codes/paissa?world=${worldId}` +
      (size !== null ? `&sizes=${size}` : "") +
      (districtId !== null ? `&districts=${districtId}` : "") +
      (lotteryPhase !== null ? `&phases=${lotteryPhase}` : "") +
      (allowedTenants !== null ? `&tenants=${allowedTenants}` : "");
  }
}
