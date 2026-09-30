import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
const require$1 = createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const { PrismaClient } = require$1("../prisma/generated/client");
const isDev = !app.isPackaged;
let dbPath = path.join(__dirname$1, "../prisma/dev.db");
if (!isDev) {
  dbPath = path.join(app.getPath("userData"), "caftan-store.db");
  if (!fs.existsSync(dbPath)) {
    const sourceDb = path.join(process.resourcesPath, "prisma", "dev.db");
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, dbPath);
    }
  }
}
const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${dbPath}` }
  }
});
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
function createWindow() {
  const possiblePreloads = [path.join(__dirname$1, "preload.cjs"), path.join(__dirname$1, "preload.js"), path.join(__dirname$1, "preload.mjs")];
  let preloadPath = possiblePreloads.find((p) => fs.existsSync(p)) || path.join(__dirname$1, "preload.cjs");
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });
  win.maximize();
  win.webContents.openDevTools();
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function setupDatabaseIPC() {
  ipcMain.removeHandler("get-products");
  ipcMain.removeHandler("create-product");
  ipcMain.removeHandler("create-variant");
  ipcMain.removeHandler("update-variant");
  ipcMain.removeHandler("save-image-locally");
  ipcMain.removeHandler("get-item-by-barcode");
  ipcMain.removeHandler("transfer-stock");
  ipcMain.removeHandler("get-active-rentals");
  ipcMain.removeHandler("create-rental");
  ipcMain.removeHandler("return-rental");
  ipcMain.removeHandler("get-available-rent-stock");
  ipcMain.removeHandler("get-dashboard-stats");
  ipcMain.removeHandler("get-users");
  ipcMain.removeHandler("create-user");
  ipcMain.removeHandler("update-user");
  ipcMain.handle("save-image-locally", async (_, sourcePath) => {
    if (!sourcePath || sourcePath.startsWith("http")) return sourcePath;
    try {
      const uploadsDir = path.join(process.env.APP_ROOT, "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(sourcePath);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
      const destinationPath = path.join(uploadsDir, fileName);
      fs.copyFileSync(sourcePath, destinationPath);
      return destinationPath;
    } catch (err) {
      return sourcePath;
    }
  });
  ipcMain.handle("get-products", async () => {
    return await prisma.product.findMany({ include: { variants: { include: { stockItems: true } } }, orderBy: { name: "asc" } });
  });
  ipcMain.handle("create-product", async (_, productData) => {
    return await prisma.product.create({ data: productData });
  });
  ipcMain.handle("create-variant", async (_, variantData) => {
    const { quantity, barcodePrefix, color, size, stockType, purchasePrice, salePrice, rentPrice, productId, imagePath } = variantData;
    return await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({ data: { productId, color, size, purchasePrice, salePrice, rentPrice, imagePath } });
      const stockItems = [];
      for (let i = 1; i <= quantity; i++) {
        const barcode = `${barcodePrefix}-${String(i).padStart(3, "0")}`;
        const stockItem = await tx.stockItem.create({ data: { barcode, variantId: variant.id, stockType, status: "AVAILABLE" } });
        stockItems.push(stockItem);
      }
      return { variant, stockItems };
    });
  });
  ipcMain.handle("update-variant", async (_, updateData) => {
    const { variantId, purchasePrice, salePrice, rentPrice, imagePath, newQuantity } = updateData;
    return await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.update({ where: { id: variantId }, data: { purchasePrice, salePrice, rentPrice, imagePath }, include: { stockItems: true } });
      const currentItems = variant.stockItems;
      const currentQty = currentItems.length;
      if (newQuantity > currentQty) {
        const diff = newQuantity - currentQty;
        const baseBarcode = currentItems[0].barcode.substring(0, currentItems[0].barcode.lastIndexOf("-"));
        const stockType = currentItems[0].stockType;
        const maxSuffix = Math.max(...currentItems.map((i) => parseInt(i.barcode.split("-").pop() || "0")));
        for (let i = 1; i <= diff; i++) {
          const barcode = `${baseBarcode}-${String(maxSuffix + i).padStart(3, "0")}`;
          await tx.stockItem.create({ data: { barcode, variantId: variant.id, stockType, status: "AVAILABLE" } });
        }
      } else if (newQuantity < currentQty) {
        const diff = currentQty - newQuantity;
        const availableItems = currentItems.filter((i) => i.status === "AVAILABLE");
        if (availableItems.length < diff) throw new Error(`Impossible de réduire le stock.`);
        const itemsToDelete = availableItems.slice(-diff);
        for (const item of itemsToDelete) await tx.stockItem.delete({ where: { id: item.id } });
      }
      return variant;
    });
  });
  ipcMain.handle("transfer-stock", async (_, transferData) => {
    const { variantId, quantity, fromType, toType } = transferData;
    return await prisma.$transaction(async (tx) => {
      const availableItems = await tx.stockItem.findMany({ where: { variantId, stockType: fromType, status: "AVAILABLE" }, take: quantity });
      if (availableItems.length < quantity) throw new Error(`Pas assez d'articles.`);
      const idsToUpdate = availableItems.map((item) => item.id);
      await tx.stockItem.updateMany({ where: { id: { in: idsToUpdate } }, data: { stockType: toType } });
      return true;
    });
  });
  ipcMain.handle("get-item-by-barcode", async (_, barcodeText) => {
    let stockItem = await prisma.stockItem.findUnique({ where: { barcode: barcodeText }, include: { variant: { include: { product: true } } } });
    if (!stockItem) stockItem = await prisma.stockItem.findFirst({ where: { barcode: { startsWith: barcodeText }, status: "AVAILABLE" }, include: { variant: { include: { product: true } } } });
    return stockItem;
  });
  ipcMain.handle("get-active-rentals", async () => {
    return await prisma.reservation.findMany({
      where: { status: "ACTIVE_RENT" },
      include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } },
      orderBy: { endDate: "asc" }
    });
  });
  ipcMain.handle("get-available-rent-stock", async (_, dates) => {
    const { startDate, endDate } = dates || {};
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await prisma.stockItem.findMany({
      where: {
        stockType: "RENT",
        status: { not: "SOLD" },
        reservationItems: {
          none: {
            reservation: {
              status: { in: ["ACTIVE_RENT", "RESERVED"] },
              AND: [
                { startDate: { lt: end } },
                { endDate: { gt: start } }
              ]
            }
          }
        }
      },
      include: { variant: { include: { product: true } } }
    });
  });
  ipcMain.handle("create-rental", async (_, data) => {
    const { cin, fullName, startDate, endDate, totalAmount, advanceAmount, stockItemId } = data;
    return await prisma.$transaction(async (tx) => {
      let defaultUser = await tx.user.findFirst();
      if (!defaultUser) {
        defaultUser = await tx.user.create({
          data: { username: "admin", passwordHash: "123456", role: "SUPER_ADMIN" }
        });
      }
      const customer = await tx.customer.upsert({
        where: { cin },
        update: { fullName },
        create: { cin, fullName, phone: "" }
      });
      const reservation = await tx.reservation.create({
        data: {
          reservationNum: `LOC-${Date.now()}`,
          customerId: customer.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalAmount: Number(totalAmount),
          advanceAmount: Number(advanceAmount),
          remainingAmount: Number(totalAmount) - Number(advanceAmount),
          status: "ACTIVE_RENT",
          userId: defaultUser.id,
          items: {
            create: [{ stockItemId, appliedRentPrice: Number(totalAmount) }]
          }
        }
      });
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { status: "RENTED" }
      });
      return reservation;
    });
  });
  ipcMain.handle("return-rental", async (_, data) => {
    const { reservationId, stockItemId, lateFee } = data;
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({ where: { id: reservationId }, data: { status: "COMPLETED", actualReturnDate: /* @__PURE__ */ new Date(), totalAmount: { increment: Number(lateFee || 0) } } });
      await tx.stockItem.update({ where: { id: stockItemId }, data: { status: "AVAILABLE" } });
      return reservation;
    });
  });
  const hashPassword2 = (password) => crypto.createHash("sha256").update(password).digest("hex");
  ipcMain.handle("get-users", async () => {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true }
    });
  });
  ipcMain.handle("create-user", async (_, data) => {
    const { username, password, role } = data;
    return await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword2(password),
        role,
        isActive: true
      }
    });
  });
  ipcMain.handle("update-user", async (_, data) => {
    const { id, username, password, role, isActive } = data;
    const updateData = { username, role, isActive };
    if (password && password.trim() !== "") {
      updateData.passwordHash = hashPassword2(password);
    }
    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  });
  ipcMain.handle("get-dashboard-stats", async () => {
    const sales = await prisma.sale.aggregate({ _sum: { finalAmount: true } });
    const completedRentals = await prisma.reservation.aggregate({ where: { status: "COMPLETED" }, _sum: { totalAmount: true } });
    const activeRentalsAdvance = await prisma.reservation.aggregate({ where: { status: "ACTIVE_RENT" }, _sum: { advanceAmount: true } });
    const totalRevenue = (sales._sum.finalAmount || 0) + (completedRentals._sum.totalAmount || 0) + (activeRentalsAdvance._sum.advanceAmount || 0);
    const totalStock = await prisma.stockItem.count({ where: { status: "AVAILABLE" } });
    const activeRentalsCount = await prisma.reservation.count({ where: { status: "ACTIVE_RENT" } });
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const lateRentals = await prisma.reservation.findMany({
      where: { status: "ACTIVE_RENT", endDate: { lt: today } },
      include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } }
    });
    const recentSales = await prisma.sale.findMany({ take: 3, orderBy: { createdAt: "desc" }, include: { items: true } });
    const recentRentals = await prisma.reservation.findMany({ take: 3, orderBy: { createdAt: "desc" }, include: { customer: true } });
    const recentActivity = [
      ...recentSales.map((s) => ({ id: s.id, type: "SALE", amount: s.finalAmount, date: s.createdAt, title: `Vente (${s.items.length} articles)` })),
      ...recentRentals.map((r) => ({ id: r.id, type: "RENT", amount: r.totalAmount, date: r.createdAt, title: `Location - ${r.customer.fullName}` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    return { revenue: totalRevenue, totalStock, activeRentalsCount, lateRentals, recentActivity };
  });
}
const hashPassword = (password) => crypto.createHash("sha256").update(password).digest("hex");
ipcMain.handle("login", async (_, data) => {
  const { username, password } = data;
  if (username === "Abdoo" && password === "Abdoo.863") {
    return { id: "master-admin", username: "Abdoo", role: "SUPER_ADMIN", isActive: true };
  }
  const user = await prisma.user.findFirst({
    where: { username: username.toLowerCase() }
  });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (!user.isActive) throw new Error("Ce compte a été désactivé par un administrateur.");
  const hashedInput = hashPassword(password);
  if (user.passwordHash !== hashedInput) throw new Error("Mot de passe incorrect.");
  return { id: user.id, username: user.username, role: user.role, isActive: user.isActive };
});
ipcMain.handle("create-sale", async (_, data) => {
  const { items, totalAmount, userId } = data;
  return await prisma.$transaction(async (tx) => {
    let validUserId = userId;
    if (userId === "master-admin") {
      let defaultAdmin = await tx.user.findFirst();
      if (!defaultAdmin) {
        defaultAdmin = await tx.user.create({
          data: { username: "System", passwordHash: "123456", role: "SUPER_ADMIN" }
        });
      }
      validUserId = defaultAdmin.id;
    }
    const sale = await tx.sale.create({
      data: {
        ticketNumber: `VNT-${Date.now()}`,
        totalAmount: Number(totalAmount),
        finalAmount: Number(totalAmount),
        paymentMethod: "CASH",
        userId: validUserId
        // <-- Utilise un vrai identifiant
      }
    });
    for (const item of items) {
      await tx.stockItem.update({
        where: { barcode: item.barcode },
        data: { status: item.stockType === "SALE" ? "SOLD" : "RENTED" }
      });
    }
    return sale;
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.whenReady().then(() => {
  setupDatabaseIPC();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
