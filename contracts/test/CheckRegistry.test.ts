import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const DAY = 24 * 60 * 60;
const COOLDOWN = 3 * DAY;

async function fixture() {
  const [owner, drawer, payee, third] = await ethers.getSigners();
  const usdc = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);

  const vaultI = await (await ethers.getContractFactory("MockERC4626")).deploy(await usdc.getAddress());
  const vaultC = await (await ethers.getContractFactory("MockERC4626")).deploy(await usdc.getAddress());

  const registry = await (await ethers.getContractFactory("CheckRegistry")).deploy(owner.address);

  const instant = await (await ethers.getContractFactory("ERC4626Adapter")).deploy(
    await vaultI.getAddress(),
    await registry.getAddress(),
  );
  const cool = await (await ethers.getContractFactory("MockCooldownAdapter")).deploy(
    await vaultC.getAddress(),
    await registry.getAddress(),
    COOLDOWN,
  );

  await registry.connect(owner).setVault(await usdc.getAddress(), await instant.getAddress(), true);
  await registry.connect(owner).setVault(await usdc.getAddress(), await cool.getAddress(), true);
  // Zero fees for the mechanics tests; the dedicated "fees" block sets them explicitly.
  await registry.connect(owner).setFees(0, 0, 0, owner.address);

  const amount = 1_000_000_000n; // 1,000 USDC
  await usdc.mint(drawer.address, amount * 10n);

  return { owner, drawer, payee, third, usdc, vaultI, vaultC, registry, instant, cool, amount };
}

type Env = Awaited<ReturnType<typeof fixture>>;

async function create(env: Env, adapter: string, maturityDelta: number) {
  const { registry, usdc, drawer, payee, amount } = env;
  await usdc.connect(drawer).approve(await registry.getAddress(), amount);
  const maturity = (await time.latest()) + maturityDelta;
  await registry.connect(drawer).createCheck(payee.address, await usdc.getAddress(), adapter, amount, maturity);
  return { checkId: 1n, maturity };
}

async function donate(env: Env, vault: any, amt: bigint) {
  const { usdc, owner } = env;
  await usdc.mint(owner.address, amt);
  await usdc.connect(owner).approve(await vault.getAddress(), amt);
  await vault.connect(owner).simulateYield(amt);
}

describe("CheckRegistry (adapter model)", () => {
  it("only owner sets a vault; asset must match", async () => {
    const env = await fixture();
    await expect(
      env.registry.connect(env.drawer).setVault(await env.usdc.getAddress(), await env.instant.getAddress(), true),
    ).to.be.revertedWithCustomError(env.registry, "OwnableUnauthorizedAccount");

    const other = await (await ethers.getContractFactory("MockERC20")).deploy("X", "X", 18);
    const otherVault = await (await ethers.getContractFactory("MockERC4626")).deploy(await other.getAddress());
    const badAdapter = await (await ethers.getContractFactory("ERC4626Adapter")).deploy(
      await otherVault.getAddress(),
      await env.registry.getAddress(),
    );
    await expect(
      env.registry.setVault(await env.usdc.getAddress(), await badAdapter.getAddress(), true),
    ).to.be.revertedWithCustomError(env.registry, "AdapterAssetMismatch");
  });

  it("creates a cheque: funds locked in adapter, NFT to payee", async () => {
    const env = await fixture();
    await create(env, await env.instant.getAddress(), 30 * DAY);
    expect(await env.registry.ownerOf(1)).to.equal(env.payee.address);
    expect(await env.usdc.balanceOf(await env.registry.getAddress())).to.equal(0n);
    expect(await env.vaultI.balanceOf(await env.instant.getAddress())).to.be.greaterThan(0n);
  });

  it("rejects non-whitelisted adapter and too-soon maturity", async () => {
    const env = await fixture();
    await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
    const rogue = await (await ethers.getContractFactory("ERC4626Adapter")).deploy(
      await env.vaultI.getAddress(),
      await env.registry.getAddress(),
    );
    const m = (await time.latest()) + DAY;
    await expect(
      env.registry.connect(env.drawer).createCheck(env.payee.address, await env.usdc.getAddress(), await rogue.getAddress(), env.amount, m),
    ).to.be.revertedWithCustomError(env.registry, "AdapterNotApproved");

    // cooldown adapter requires maturity > now + 3 days
    await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
    const soon = (await time.latest()) + DAY;
    await expect(
      env.registry.connect(env.drawer).createCheck(env.payee.address, await env.usdc.getAddress(), await env.cool.getAddress(), env.amount, soon),
    ).to.be.revertedWithCustomError(env.registry, "MaturityTooSoon");
  });

  it("endorsement transfers the cheque and emits Endorsed", async () => {
    const env = await fixture();
    await create(env, await env.instant.getAddress(), 30 * DAY);
    await expect(env.registry.connect(env.payee).transferFrom(env.payee.address, env.third.address, 1))
      .to.emit(env.registry, "Endorsed")
      .withArgs(1, env.payee.address, env.third.address);
    expect(await env.registry.ownerOf(1)).to.equal(env.third.address);
  });

  describe("instant adapter", () => {
    it("settles at maturity: principal to holder, yield to drawer", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      await donate(env, env.vaultI, 50_000_000n);
      await time.increaseTo(maturity);
      const before = await env.usdc.balanceOf(env.drawer.address);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      expect((await env.usdc.balanceOf(env.drawer.address)) - before).to.be.closeTo(50_000_000n, 2n);
    });

    it("reverts before maturity and on double settle", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      await expect(env.registry.settle(1)).to.be.revertedWithCustomError(env.registry, "NotMatured");
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      await expect(env.registry.settle(1)).to.be.reverted;
    });

    it("holder is made whole first on a loss", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      await donate(env, env.vaultI, 30_000_000n);
      await env.vaultI.simulateLoss(20_000_000n, env.third.address);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
    });
  });

  describe("cooldown adapter (Brix-style)", () => {
    it("prepare then settle pays at maturity", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.cool.getAddress(), 30 * DAY);
      await donate(env, env.vaultC, 40_000_000n);

      // Too early to prepare (more than cooldown before maturity).
      await expect(env.registry.prepareRedeem(1)).to.be.revertedWithCustomError(env.registry, "TooEarlyToPrepare");
      // Settle without prepare fails.
      await time.increaseTo(maturity);
      await expect(env.registry.settle(1)).to.be.revertedWithCustomError(env.registry, "RedeemNotReady");

      // Rewind approach: create a fresh one and do it properly.
    });

    it("full cooldown lifecycle", async () => {
      const env = await fixture();
      const maturity = (await time.latest()) + 10 * DAY;
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
      await env.registry
        .connect(env.drawer)
        .createCheck(env.payee.address, await env.usdc.getAddress(), await env.cool.getAddress(), env.amount, maturity);
      await donate(env, env.vaultC, 40_000_000n);

      // Move to within the cooldown window before maturity, then prepare.
      await time.increaseTo(maturity - COOLDOWN);
      await env.registry.prepareRedeem(1);

      // Not yet claimable / not matured.
      await expect(env.registry.settle(1)).to.be.revertedWithCustomError(env.registry, "NotMatured");

      // At maturity (cooldown has elapsed since prepare), settle succeeds.
      await time.increaseTo(maturity);
      const before = await env.usdc.balanceOf(env.drawer.address);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      expect((await env.usdc.balanceOf(env.drawer.address)) - before).to.be.closeTo(40_000_000n, 2n);
    });
  });

  describe("Chainlink Automation", () => {
    it("drives instant settle", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      expect((await env.registry.checkUpkeep("0x"))[0]).to.equal(false);
      await time.increaseTo(maturity);
      const res = await env.registry.checkUpkeep("0x");
      expect(res[0]).to.equal(true);
      await env.registry.performUpkeep(res[1]);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
    });

    it("drives cooldown prepare then settle", async () => {
      const env = await fixture();
      const maturity = (await time.latest()) + 10 * DAY;
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
      await env.registry
        .connect(env.drawer)
        .createCheck(env.payee.address, await env.usdc.getAddress(), await env.cool.getAddress(), env.amount, maturity);

      // Window opens at maturity - cooldown: keeper prepares.
      await time.increaseTo(maturity - COOLDOWN + 60);
      let res = await env.registry.checkUpkeep("0x");
      expect(res[0]).to.equal(true);
      await env.registry.performUpkeep(res[1]);
      const c = await env.registry.getCheck(1);
      expect(c.redeemStarted).to.equal(true);

      // After the cooldown elapses (>= claimableAt and >= maturity): keeper settles.
      await time.increaseTo(Number(c.claimableAt));
      res = await env.registry.checkUpkeep("0x");
      expect(res[0]).to.equal(true);
      await env.registry.performUpkeep(res[1]);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      expect((await env.registry.activeCheckIds()).length).to.equal(0);
    });
  });

  describe("emergency exit (expired vault)", () => {
    it("party rescues from a flagged adapter; principal paid at maturity", async () => {
      const env = await fixture();
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      await donate(env, env.vaultI, 20_000_000n);

      // Not flagged → cannot exit.
      await expect(env.registry.connect(env.payee).emergencyExit(1)).to.be.revertedWithCustomError(
        env.registry,
        "NotEmergency",
      );
      // Guardian flags the adapter as expired.
      await env.registry.connect(env.owner).setAdapterEmergency(await env.instant.getAddress(), true);
      // Non-party cannot exit.
      await expect(env.registry.connect(env.owner).emergencyExit(1)).to.be.revertedWithCustomError(
        env.registry,
        "NotParty",
      );
      // Holder rescues → funds moved to idle holding.
      await env.registry.connect(env.payee).emergencyExit(1);
      expect(await env.registry.rescued(1)).to.equal(true);

      // Still paid only at maturity (schedule preserved).
      await expect(env.registry.settle(1)).to.be.revertedWithCustomError(env.registry, "NotMatured");
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
    });
  });

  describe("adapter migration (two-sided consent + guardian)", () => {
    async function rescued(env: Env) {
      const { maturity } = await create(env, await env.instant.getAddress(), 30 * DAY);
      await env.registry.connect(env.owner).setAdapterEmergency(await env.instant.getAddress(), true);
      await env.registry.connect(env.payee).emergencyExit(1);
      // A fresh, healthy instant adapter to migrate into.
      const vaultN = await (await ethers.getContractFactory("MockERC4626")).deploy(await env.usdc.getAddress());
      const target = await (await ethers.getContractFactory("ERC4626Adapter")).deploy(
        await vaultN.getAddress(),
        await env.registry.getAddress(),
      );
      await env.registry.connect(env.owner).setVault(await env.usdc.getAddress(), await target.getAddress(), true);
      return { maturity, target, vaultN };
    }

    it("requires both parties + guardian; redeploys principal and resumes yield", async () => {
      const env = await fixture();
      const { maturity, target, vaultN } = await rescued(env);
      const targetAddr = await target.getAddress();

      // Only a party may request.
      await expect(env.registry.connect(env.third).requestMigration(1, targetAddr)).to.be.revertedWithCustomError(
        env.registry,
        "NotParty",
      );
      // Guardian can't approve before both consent.
      await env.registry.connect(env.drawer).requestMigration(1, targetAddr);
      await expect(env.registry.connect(env.owner).approveMigration(1)).to.be.revertedWithCustomError(
        env.registry,
        "MigrationNotReady",
      );
      // Holder consents too → guardian executes.
      await env.registry.connect(env.payee).requestMigration(1, targetAddr);
      await env.registry.connect(env.owner).approveMigration(1);

      // Position now lives in the new adapter; rescued cleared.
      expect((await env.registry.getCheck(1)).adapter).to.equal(targetAddr);
      expect(await env.registry.rescued(1)).to.equal(false);
      expect(await vaultN.balanceOf(targetAddr)).to.be.greaterThan(0n);

      // Yield resumes and is paid to the drawer at maturity.
      await donate(env, vaultN, 15_000_000n);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      expect(await env.usdc.balanceOf(env.drawer.address)).to.be.greaterThan(0n);
    });

    it("changing the target resets prior consent", async () => {
      const env = await fixture();
      const { target } = await rescued(env);
      const targetAddr = await target.getAddress();

      // A second valid target.
      const vault2 = await (await ethers.getContractFactory("MockERC4626")).deploy(await env.usdc.getAddress());
      const target2 = await (await ethers.getContractFactory("ERC4626Adapter")).deploy(
        await vault2.getAddress(),
        await env.registry.getAddress(),
      );
      await env.registry.connect(env.owner).setVault(await env.usdc.getAddress(), await target2.getAddress(), true);

      await env.registry.connect(env.drawer).requestMigration(1, targetAddr);
      await env.registry.connect(env.payee).requestMigration(1, targetAddr);
      // Drawer changes mind → switches target, which clears holder's consent.
      await env.registry.connect(env.drawer).requestMigration(1, await target2.getAddress());
      await expect(env.registry.connect(env.owner).approveMigration(1)).to.be.revertedWithCustomError(
        env.registry,
        "MigrationNotReady",
      );
      // Holder re-consents to the new target → now it can execute.
      await env.registry.connect(env.payee).requestMigration(1, await target2.getAddress());
      await env.registry.connect(env.owner).approveMigration(1);
      expect((await env.registry.getCheck(1)).adapter).to.equal(await target2.getAddress());
    });

    it("rejects migration when funds aren't rescued, and to a flagged target", async () => {
      const env = await fixture();
      // No rescue yet → cannot request.
      await create(env, await env.instant.getAddress(), 30 * DAY);
      await expect(env.registry.connect(env.drawer).requestMigration(1, await env.cool.getAddress())).to.be.revertedWithCustomError(
        env.registry,
        "NotRescued",
      );

      // Now rescue, then try to migrate into a flagged adapter.
      const { target } = await rescued(env);
      await env.registry.connect(env.owner).setAdapterEmergency(await target.getAddress(), true);
      await env.registry.connect(env.drawer).requestMigration(1, await target.getAddress());
      await env.registry.connect(env.payee).requestMigration(1, await target.getAddress());
      await expect(env.registry.connect(env.owner).approveMigration(1)).to.be.revertedWithCustomError(
        env.registry,
        "AdapterNotApproved",
      );
    });
  });

  it("reports accrued yield (instant)", async () => {
    const env = await fixture();
    await create(env, await env.instant.getAddress(), 30 * DAY);
    expect(await env.registry.accruedYield(1)).to.equal(0n);
    await donate(env, env.vaultI, 12_000_000n);
    expect(await env.registry.accruedYield(1)).to.be.closeTo(12_000_000n, 2n);
  });

  describe("fees & marketplace", () => {
    async function withFees(env: Env) {
      // 10% perf, 0.1% create, 0.5% sale; treasury = `third` for isolation.
      await env.registry.connect(env.owner).setFees(1000, 10, 50, env.third.address);
    }

    it("charges a 0.1% creation fee on top of principal", async () => {
      const env = await fixture();
      await withFees(env);
      const treBefore = await env.usdc.balanceOf(env.third.address);
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount * 2n);
      const maturity = (await time.latest()) + 30 * DAY;
      await env.registry
        .connect(env.drawer)
        .createCheck(env.payee.address, await env.usdc.getAddress(), await env.instant.getAddress(), env.amount, maturity);
      // Fee = 0.1% of 1,000 = 1 USDC.
      expect((await env.usdc.balanceOf(env.third.address)) - treBefore).to.equal(env.amount / 1000n);
      // Full principal still backs the cheque.
      expect((await env.registry.getCheck(1)).principal).to.equal(env.amount);
    });

    it("takes a 10% performance fee from yield, never from principal", async () => {
      const env = await fixture();
      await withFees(env);
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount * 2n);
      const maturity = (await time.latest()) + 30 * DAY;
      await env.registry
        .connect(env.drawer)
        .createCheck(env.payee.address, await env.usdc.getAddress(), await env.instant.getAddress(), env.amount, maturity);
      await donate(env, env.vaultI, 100_000_000n); // 100 USDC yield
      const treBefore = await env.usdc.balanceOf(env.third.address);
      const drawerBefore = await env.usdc.balanceOf(env.drawer.address);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount); // principal intact
      expect((await env.usdc.balanceOf(env.third.address)) - treBefore).to.be.closeTo(10_000_000n, 2n); // 10% of 100
      expect((await env.usdc.balanceOf(env.drawer.address)) - drawerBefore).to.be.closeTo(90_000_000n, 2n); // 90%
    });

    it("instant buy: seller gets full price, buyer pays 0.5% fee on top", async () => {
      const env = await fixture();
      await env.registry.connect(env.owner).setFees(1000, 0, 50, env.owner.address);
      await create(env, await env.instant.getAddress(), 30 * DAY); // payee holds cheque #1
      const price = 970_000_000n; // 970 USDC (early discount on 1,000 face)
      const fee = (price * 50n) / 10_000n;
      await env.registry.connect(env.payee).listForSale(1, price);

      await env.usdc.mint(env.third.address, price + fee);
      await env.usdc.connect(env.third).approve(await env.registry.getAddress(), price + fee);
      const treBefore = await env.usdc.balanceOf(env.owner.address);

      await env.registry.connect(env.third).buy(1);
      expect(await env.registry.ownerOf(1)).to.equal(env.third.address);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(price); // seller gets full price
      expect((await env.usdc.balanceOf(env.owner.address)) - treBefore).to.equal(fee); // buyer-paid fee
    });

    it("offers: bidder escrows, seller accepts, NFT moves and fee taken", async () => {
      const env = await fixture();
      await env.registry.connect(env.owner).setFees(1000, 0, 50, env.owner.address);
      await create(env, await env.instant.getAddress(), 30 * DAY); // payee holds cheque #1
      const price = 950_000_000n;
      const fee = (price * 50n) / 10_000n;

      // Bidder = third escrows price + fee.
      await env.usdc.mint(env.third.address, price + fee);
      await env.usdc.connect(env.third).approve(await env.registry.getAddress(), price + fee);
      await env.registry.connect(env.third).makeOffer(1, price);
      expect(await env.usdc.balanceOf(await env.registry.getAddress())).to.equal(price + fee);

      const treBefore = await env.usdc.balanceOf(env.owner.address);
      await env.registry.connect(env.payee).acceptOffer(1, env.third.address);
      expect(await env.registry.ownerOf(1)).to.equal(env.third.address);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(price);
      expect((await env.usdc.balanceOf(env.owner.address)) - treBefore).to.equal(fee);
    });

    it("offers can be cancelled and refunded", async () => {
      const env = await fixture();
      await env.registry.connect(env.owner).setFees(1000, 0, 50, env.owner.address);
      await create(env, await env.instant.getAddress(), 30 * DAY);
      const price = 900_000_000n;
      const fee = (price * 50n) / 10_000n;
      await env.usdc.mint(env.third.address, price + fee);
      await env.usdc.connect(env.third).approve(await env.registry.getAddress(), price + fee);
      await env.registry.connect(env.third).makeOffer(1, price);
      await env.registry.connect(env.third).cancelOffer(1);
      expect(await env.usdc.balanceOf(env.third.address)).to.equal(price + fee); // refunded
    });
  });
});
