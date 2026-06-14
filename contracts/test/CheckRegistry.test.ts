import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const DAY = 24 * 60 * 60;

async function deployFixture() {
  const [owner, drawer, payee, third] = await ethers.getSigners();

  const ERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await ERC20.deploy("USD Coin", "USDC", 6);

  const Vault = await ethers.getContractFactory("MockERC4626");
  const vault = await Vault.deploy(await usdc.getAddress());

  const Registry = await ethers.getContractFactory("CheckRegistry");
  const registry = await Registry.deploy(owner.address);

  // Whitelist the vault for USDC.
  await registry.connect(owner).setVault(await usdc.getAddress(), await vault.getAddress(), true);

  // Fund the drawer.
  const amount = 1_000_000_000n; // 1,000 USDC (6 decimals)
  await usdc.mint(drawer.address, amount * 10n);

  return { owner, drawer, payee, third, usdc, vault, registry, amount };
}

async function createCheck(env: Awaited<ReturnType<typeof deployFixture>>, maturityDelta = 30 * DAY) {
  const { registry, usdc, vault, drawer, payee, amount } = env;
  await usdc.connect(drawer).approve(await registry.getAddress(), amount);
  const maturity = (await time.latest()) + maturityDelta;
  const tx = await registry
    .connect(drawer)
    .createCheck(payee.address, await usdc.getAddress(), await vault.getAddress(), amount, maturity);
  await tx.wait();
  return { checkId: 1n, maturity };
}

// Simulate vault yield by donating underlying into the vault (raises share price).
async function simulateYield(env: Awaited<ReturnType<typeof deployFixture>>, yieldAmount: bigint) {
  const { usdc, vault, owner } = env;
  await usdc.mint(owner.address, yieldAmount);
  await usdc.connect(owner).approve(await vault.getAddress(), yieldAmount);
  await vault.connect(owner).simulateYield(yieldAmount);
}

describe("CheckRegistry", () => {
  describe("vault whitelist", () => {
    it("only owner can set a vault", async () => {
      const env = await deployFixture();
      await expect(
        env.registry.connect(env.drawer).setVault(await env.usdc.getAddress(), await env.vault.getAddress(), true),
      ).to.be.revertedWithCustomError(env.registry, "OwnableUnauthorizedAccount");
    });

    it("reverts if the vault asset does not match the stablecoin", async () => {
      const env = await deployFixture();
      const ERC20 = await ethers.getContractFactory("MockERC20");
      const other = await ERC20.deploy("Other", "OTH", 18);
      await expect(
        env.registry.setVault(await other.getAddress(), await env.vault.getAddress(), true),
      ).to.be.revertedWithCustomError(env.registry, "VaultAssetMismatch");
    });
  });

  describe("createCheck", () => {
    it("locks funds in the vault and mints the cheque NFT to the payee", async () => {
      const env = await deployFixture();
      await createCheck(env);

      expect(await env.registry.ownerOf(1)).to.equal(env.payee.address);
      const c = await env.registry.getCheck(1);
      expect(c.drawer).to.equal(env.drawer.address);
      expect(c.principal).to.equal(env.amount);
      expect(c.settled).to.equal(false);
      // The registry holds no loose USDC — everything is supplied to the vault.
      expect(await env.usdc.balanceOf(await env.registry.getAddress())).to.equal(0n);
      expect(await env.vault.balanceOf(await env.registry.getAddress())).to.be.greaterThan(0n);
    });

    it("reverts for a non-whitelisted vault", async () => {
      const env = await deployFixture();
      const Vault = await ethers.getContractFactory("MockERC4626");
      const rogue = await Vault.deploy(await env.usdc.getAddress());
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
      const maturity = (await time.latest()) + DAY;
      await expect(
        env.registry
          .connect(env.drawer)
          .createCheck(env.payee.address, await env.usdc.getAddress(), await rogue.getAddress(), env.amount, maturity),
      ).to.be.revertedWithCustomError(env.registry, "VaultNotApproved");
    });

    it("reverts when maturity is in the past", async () => {
      const env = await deployFixture();
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
      const past = (await time.latest()) - 1;
      await expect(
        env.registry
          .connect(env.drawer)
          .createCheck(env.payee.address, await env.usdc.getAddress(), await env.vault.getAddress(), env.amount, past),
      ).to.be.revertedWithCustomError(env.registry, "MaturityInPast");
    });

    it("cannot create while paused", async () => {
      const env = await deployFixture();
      await env.registry.connect(env.owner).pause();
      await env.usdc.connect(env.drawer).approve(await env.registry.getAddress(), env.amount);
      const maturity = (await time.latest()) + DAY;
      await expect(
        env.registry
          .connect(env.drawer)
          .createCheck(env.payee.address, await env.usdc.getAddress(), await env.vault.getAddress(), env.amount, maturity),
      ).to.be.revertedWithCustomError(env.registry, "EnforcedPause");
    });
  });

  describe("endorsement (ciro)", () => {
    it("transfers the cheque and emits Endorsed without the drawer's involvement", async () => {
      const env = await deployFixture();
      await createCheck(env);
      await expect(
        env.registry.connect(env.payee).transferFrom(env.payee.address, env.third.address, 1),
      )
        .to.emit(env.registry, "Endorsed")
        .withArgs(1, env.payee.address, env.third.address);
      expect(await env.registry.ownerOf(1)).to.equal(env.third.address);
    });
  });

  describe("settlement", () => {
    it("reverts before maturity", async () => {
      const env = await deployFixture();
      await createCheck(env);
      await expect(env.registry.settle(1)).to.be.revertedWithCustomError(env.registry, "NotMatured");
    });

    it("pays principal to the holder and yield to the drawer at maturity", async () => {
      const env = await deployFixture();
      const { maturity } = await createCheck(env);
      const yieldAmount = 50_000_000n; // 50 USDC yield
      await simulateYield(env, yieldAmount);

      await time.increaseTo(maturity);
      const drawerBefore = await env.usdc.balanceOf(env.drawer.address);

      await expect(env.registry.settle(1)).to.emit(env.registry, "Settled");

      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      // Drawer receives approximately the yield (allow rounding dust).
      const drawerGain = (await env.usdc.balanceOf(env.drawer.address)) - drawerBefore;
      expect(drawerGain).to.be.closeTo(yieldAmount, 2n);
      // NFT is burned.
      await expect(env.registry.ownerOf(1)).to.be.reverted;
    });

    it("pays yield to the current holder after endorsement", async () => {
      const env = await deployFixture();
      const { maturity } = await createCheck(env);
      await simulateYield(env, 10_000_000n);
      // Endorse to a third party.
      await env.registry.connect(env.payee).transferFrom(env.payee.address, env.third.address, 1);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.third.address)).to.equal(env.amount);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(0n);
    });

    it("on a vault loss the holder is made whole first (yield buffer absorbs loss)", async () => {
      const env = await deployFixture();
      const { maturity } = await createCheck(env);
      // Add yield buffer of 30, then lose 20 → still covers principal.
      await simulateYield(env, 30_000_000n);
      await env.vault.simulateLoss(20_000_000n, env.third.address);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
    });

    it("cannot settle twice", async () => {
      const env = await deployFixture();
      const { maturity } = await createCheck(env);
      await time.increaseTo(maturity);
      await env.registry.settle(1);
      await expect(env.registry.settle(1)).to.be.reverted; // burned / unknown
    });
  });

  describe("Chainlink Automation", () => {
    it("checkUpkeep reports matured cheques and performUpkeep settles them", async () => {
      const env = await deployFixture();
      const { maturity } = await createCheck(env);

      let [needed] = await env.registry.checkUpkeep("0x");
      expect(needed).to.equal(false);

      await time.increaseTo(maturity);
      const res = await env.registry.checkUpkeep("0x");
      expect(res[0]).to.equal(true);

      await env.registry.performUpkeep(res[1]);
      expect(await env.usdc.balanceOf(env.payee.address)).to.equal(env.amount);
      // Active set is now empty.
      expect((await env.registry.activeCheckIds()).length).to.equal(0);
    });
  });

  describe("views", () => {
    it("reports accrued yield and current value", async () => {
      const env = await deployFixture();
      await createCheck(env);
      expect(await env.registry.accruedYield(1)).to.equal(0n);
      await simulateYield(env, 12_000_000n);
      expect(await env.registry.accruedYield(1)).to.be.closeTo(12_000_000n, 2n);
      expect(await env.registry.currentValue(1)).to.be.closeTo(env.amount + 12_000_000n, 2n);
    });
  });
});
