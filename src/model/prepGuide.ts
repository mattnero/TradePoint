import provinces from "../data/provinces.json";
import links from "../data/prepLinks.json";
import type { Province } from "../math/tax";
import type { IsoDate } from "./dates";

export interface ProvinceRule {
  text: string;
  url: string;
  verifiedOn: IsoDate;
}

export interface ProvinceRules {
  name: string;
  authority: string;
  rules: ProvinceRule[];
}

export interface PrepLink {
  label: string;
  url: string;
  verifiedOn: IsoDate;
}

export const PROVINCE_RULES: Record<Province, ProvinceRules> = {
  ON: { name: provinces.ON.name, authority: provinces.ON.rulesAuthority, rules: provinces.ON.rules },
};

export const PREP_LINKS: { preApproval: PrepLink[]; tradeOffers: PrepLink[] } = links;
