import { cents } from "../src/model/money";
import { preApprovalStatus, rulesStatus, tradeStatus, walkAwayStatus } from "../src/model/prepCopy";

const clutch = { source: "Clutch", amount: cents(920000), date: "2026-11-01" };
const dealer = { source: "Second dealer", amount: cents(875000), date: "2026-11-03" };

describe("prep row status lines", () => {
  it("pre-approval", () => {
    expect(preApprovalStatus(undefined)).toBe("Not yet");
    expect(preApprovalStatus({ preApprovalApr: 0.0599 })).toBe("5.99% pre-approved");
  });

  it("trade figures name the best one", () => {
    expect(tradeStatus(undefined)).toBe("None yet");
    expect(tradeStatus({ tradeOffers: [dealer] })).toBe("1 of 2 · $8,750 from Second dealer");
    expect(tradeStatus({ tradeOffers: [dealer, clutch] })).toBe("Best $9,200 from Clutch");
  });

  it("walk-away", () => {
    expect(walkAwayStatus(undefined)).toBe("Not set");
    expect(walkAwayStatus({ walkAway: cents(3300000) })).toBe("$33,000 all-in");
  });

  it("rules", () => {
    expect(rulesStatus(undefined)).toBe("Not read yet · 1 minute");
    expect(rulesStatus({ rulesReadOn: "2026-11-04" })).toBe("Read");
  });
});
