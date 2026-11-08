import type { PurchaseOutcome } from "./entitlement";
import type { ProStore } from "./storeEntitlement";

export const ENTITLEMENT_ID = "pro";

const CANCELLED_CODE = "1";
const PENDING_CODE = "20";

export function purchaseOutcomeFromError(error: unknown): PurchaseOutcome | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, userCancelled } = error as { code?: unknown; userCancelled?: unknown };
  if (userCancelled === true || code === CANCELLED_CODE) return "cancelled";
  if (code === PENDING_CODE) return "pending";
  return null;
}

export function apiKeyFor(platform: string, env: Record<string, string | undefined>): string | null {
  const key = platform === "android" ? env.VITE_REVENUECAT_ANDROID_KEY : platform === "ios" ? env.VITE_REVENUECAT_IOS_KEY : undefined;
  const trimmed = key?.trim();
  return trimmed ? trimmed : null;
}

type CustomerInfo = { entitlements: { active: Record<string, unknown> } };

const hasPro = (info: CustomerInfo) => ENTITLEMENT_ID in info.entitlements.active;

export async function createRevenueCatStore(apiKey: string): Promise<ProStore> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.configure({ apiKey });

  const proPackage = async () => {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    const found = offering?.lifetime ?? offering?.availablePackages[0];
    if (!found) throw new Error("No Pro package in the current offering");
    return found;
  };

  return {
    async customerHasPro() {
      return hasPro((await Purchases.getCustomerInfo()).customerInfo);
    },
    onChange(listener) {
      void Purchases.addCustomerInfoUpdateListener((info) => listener(hasPro(info)));
    },
    async price() {
      return (await proPackage()).product.priceString;
    },
    async buy() {
      try {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: await proPackage() });
        return hasPro(customerInfo) ? "purchased" : "pending";
      } catch (error) {
        const outcome = purchaseOutcomeFromError(error);
        if (outcome === null) throw error;
        return outcome;
      }
    },
    async restore() {
      return hasPro((await Purchases.restorePurchases()).customerInfo);
    },
  };
}
