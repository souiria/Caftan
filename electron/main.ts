import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto' 

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { PrismaClient } = require('../prisma/generated/client')

const isDev = !app.isPackaged
let dbPath = path.join(__dirname, '../prisma/dev.db') 

if (!isDev) {
  dbPath = path.join(app.getPath('userData'), 'caftan-store.db')
  if (!fs.existsSync(dbPath)) {
    const sourceDb = path.join(process.resourcesPath, 'prisma', 'dev.db')
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, dbPath)
    }
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } }
})

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

function createWindow() {
  const possiblePreloads = [path.join(__dirname, 'preload.cjs'), path.join(__dirname, 'preload.js'), path.join(__dirname, 'preload.mjs')]
  let preloadPath = possiblePreloads.find(p => fs.existsSync(p)) || path.join(__dirname, 'preload.cjs')

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, 'electron-vite.svg'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false 
    }
  })

  // === DÉSACTIVER LE MENU SUPÉRIEUR ===
  Menu.setApplicationMenu(null)

  win.maximize()
  if (isDev) win.webContents.openDevTools()
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function setupDatabaseIPC() {
  // === NETTOYAGE DES HANDLERS ===
  ipcMain.removeHandler('login')
  ipcMain.removeHandler('get-users')
  ipcMain.removeHandler('create-user')
  ipcMain.removeHandler('update-user')
  
  ipcMain.removeHandler('get-products')
  ipcMain.removeHandler('create-product')
  ipcMain.removeHandler('create-variant')
  ipcMain.removeHandler('update-variant')
  ipcMain.removeHandler('save-image-locally')
  ipcMain.removeHandler('get-item-by-barcode')
  ipcMain.removeHandler('transfer-stock')
  
  ipcMain.removeHandler('get-active-rentals')
  ipcMain.removeHandler('create-rental')
  ipcMain.removeHandler('return-rental')
  ipcMain.removeHandler('get-available-rent-stock')
  
  ipcMain.removeHandler('get-dashboard-stats')
  ipcMain.removeHandler('create-sale')
  ipcMain.removeHandler('get-sales')
  ipcMain.removeHandler('update-sale-status')
  
  ipcMain.removeHandler('get-reports-data')
  ipcMain.removeHandler('get-missing-purchase-prices')
  
  ipcMain.removeHandler('get-categories')
  ipcMain.removeHandler('add-category')
  ipcMain.removeHandler('delete-category')
  ipcMain.removeHandler('get-fabrics')
  ipcMain.removeHandler('add-fabric')
  ipcMain.removeHandler('delete-fabric')
  
  ipcMain.removeHandler('get-customers')
  ipcMain.removeHandler('add-customer')
  ipcMain.removeHandler('update-customer')
  ipcMain.removeHandler('delete-customer')

  ipcMain.removeHandler('get-company')
  ipcMain.removeHandler('update-company')

  // =========================================================
  // GESTION DES FICHIERS
  // =========================================================
  ipcMain.handle('save-image-locally', async (_, sourcePath) => {
    if (!sourcePath || sourcePath.startsWith('http')) return sourcePath
    try {
      const uploadsDir = path.join(process.env.APP_ROOT, 'uploads')
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
      const ext = path.extname(sourcePath)
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`
      const destinationPath = path.join(uploadsDir, fileName)
      fs.copyFileSync(sourcePath, destinationPath)
      return destinationPath 
    } catch (err) { return sourcePath }
  })

  // =========================================================
  // GESTION DES UTILISATEURS (USERS) ET AUTHENTIFICATION
  // =========================================================
  const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex')

  ipcMain.handle('login', async (_, data) => {
    const { username, password } = data
    if (username === 'Abdoo' && password === 'Abdoo.863') {
      return { id: 'master-admin', username: 'Abdoo', role: 'SUPER_ADMIN', isActive: true }
    }
    const user = await prisma.user.findFirst({ where: { username: username.toLowerCase() } })
    if (!user) throw new Error("Utilisateur introuvable.")
    if (!user.isActive) throw new Error("Ce compte a été désactivé par un administrateur.")
    if (user.passwordHash !== hashPassword(password)) throw new Error("Mot de passe incorrect.")
    return { id: user.id, username: user.username, role: user.role, isActive: user.isActive }
  }) 

  ipcMain.handle('get-users', async () => await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, username: true, role: true, isActive: true, createdAt: true } }))
  ipcMain.handle('create-user', async (_, data) => await prisma.user.create({ data: { username: data.username, passwordHash: hashPassword(data.password), role: data.role, isActive: true } }))
  ipcMain.handle('update-user', async (_, data) => {
    const { id, username, password, role, isActive } = data
    const updateData: any = { username, role, isActive }
    if (password && password.trim() !== '') updateData.passwordHash = hashPassword(password)
    return await prisma.user.update({ where: { id }, data: updateData })
  })

  // =========================================================
  // GESTION DU CATALOGUE ET STOCK
  // =========================================================
  ipcMain.handle('get-products', async () => {
    return await prisma.product.findMany({ include: { variants: { include: { stockItems: true } } }, orderBy: { name: 'asc' } })
  })

  ipcMain.handle('create-product', async (_, data) => {
    const { name, type, description } = data
    let product = await prisma.product.findFirst({ where: { name: name, type: type } })
    if (!product) product = await prisma.product.create({ data: { name, type, description } })
    return product
  })

  ipcMain.handle('create-variant', async (_, data) => {
    const { productId, barcodePrefix, color, size, quantity, stockType, imagePath, purchasePrice, salePrice, rentPrice } = data
    return await prisma.$transaction(async (tx: any) => {
      const variant = await tx.productVariant.create({ data: { productId, color, size, purchasePrice, salePrice, rentPrice, priceStatus: 'VALID', imagePath } })
      const stockItemsData = []
      for (let i = 1; i <= quantity; i++) {
        stockItemsData.push({ barcode: `${barcodePrefix}-${String(i).padStart(3, '0')}`, variantId: variant.id, stockType, status: 'AVAILABLE' })
      }
      await tx.stockItem.createMany({ data: stockItemsData })
      return variant
    })
  })

  ipcMain.handle('update-variant', async (_, updateData) => {
    const { variantId, purchasePrice, salePrice, rentPrice, imagePath, newQuantity } = updateData
    return await prisma.$transaction(async (tx: any) => {
      const variant = await tx.productVariant.update({ where: { id: variantId }, data: { purchasePrice, salePrice, rentPrice, imagePath }, include: { stockItems: true } })
      const currentItems = variant.stockItems
      const currentQty = currentItems.length
      if (newQuantity > currentQty) {
        const diff = newQuantity - currentQty
        const baseBarcode = currentItems[0].barcode.substring(0, currentItems[0].barcode.lastIndexOf('-'))
        const maxSuffix = Math.max(...currentItems.map((i: any) => parseInt(i.barcode.split('-').pop() || '0')))
        for (let i = 1; i <= diff; i++) {
          await tx.stockItem.create({ data: { barcode: `${baseBarcode}-${String(maxSuffix + i).padStart(3, '0')}`, variantId: variant.id, stockType: currentItems[0].stockType, status: 'AVAILABLE' } })
        }
      } else if (newQuantity < currentQty) {
        const diff = currentQty - newQuantity
        const availableItems = currentItems.filter((i: any) => i.status === 'AVAILABLE')
        if (availableItems.length < diff) throw new Error(`Impossible de réduire le stock.`)
        const itemsToDelete = availableItems.slice(-diff)
        for (const item of itemsToDelete) await tx.stockItem.delete({ where: { id: item.id } })
      }
      return variant
    })
  })

  ipcMain.handle('transfer-stock', async (_, transferData) => {
    const { variantId, quantity, fromType, toType } = transferData
    return await prisma.$transaction(async (tx: any) => {
      const availableItems = await tx.stockItem.findMany({ where: { variantId, stockType: fromType, status: 'AVAILABLE' }, take: quantity })
      if (availableItems.length < quantity) throw new Error(`Pas assez d'articles.`)
      const idsToUpdate = availableItems.map((item: any) => item.id)
      await tx.stockItem.updateMany({ where: { id: { in: idsToUpdate } }, data: { stockType: toType } })
      return true
    })
  })

  ipcMain.handle('get-item-by-barcode', async (_, barcodeText) => {
    let stockItem = await prisma.stockItem.findUnique({ where: { barcode: barcodeText }, include: { variant: { include: { product: true } } } })
    if (!stockItem) stockItem = await prisma.stockItem.findFirst({ where: { barcode: { startsWith: barcodeText }, status: 'AVAILABLE' }, include: { variant: { include: { product: true } } } })
    return stockItem
  })

  // =========================================================
  // GESTION DES LOCATIONS (RENTALS)
  // =========================================================
  ipcMain.handle('get-active-rentals', async () => await prisma.reservation.findMany({ where: { status: 'ACTIVE_RENT' }, include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } }, orderBy: { endDate: 'asc' } }))
  
  ipcMain.handle('get-available-rent-stock', async (_, dates) => {
    const { startDate, endDate } = dates || {}
    if (!startDate || !endDate) return []
    return await prisma.stockItem.findMany({
      where: { 
        stockType: 'RENT', status: { not: 'SOLD' },
        reservationItems: { none: { reservation: { status: { in: ['ACTIVE_RENT', 'RESERVED'] }, AND: [{ startDate: { lt: new Date(endDate) } }, { endDate: { gt: new Date(startDate) } }] } } }
      },
      include: { variant: { include: { product: true } } }
    })
  })

  ipcMain.handle('create-rental', async (_, data) => {
    return await prisma.$transaction(async (tx: any) => {
      let defaultUser = await tx.user.findFirst()
      if (!defaultUser) defaultUser = await tx.user.create({ data: { username: 'admin', passwordHash: '123456', role: 'SUPER_ADMIN' } })
      const customer = await tx.customer.upsert({ where: { cin: data.cin }, update: { fullName: data.fullName }, create: { cin: data.cin, fullName: data.fullName, phone: '' } })
      const reservation = await tx.reservation.create({
        data: {
          reservationNum: `LOC-${Date.now()}`, customerId: customer.id, startDate: new Date(data.startDate), endDate: new Date(data.endDate), totalAmount: Number(data.totalAmount), advanceAmount: Number(data.advanceAmount), remainingAmount: Number(data.totalAmount) - Number(data.advanceAmount), status: 'ACTIVE_RENT', userId: defaultUser.id,
          items: { create: [{ stockItemId: data.stockItemId, appliedRentPrice: Number(data.totalAmount) }] }
        }
      })
      await tx.stockItem.update({ where: { id: data.stockItemId }, data: { status: 'RENTED' } })
      return reservation
    })
  })

  ipcMain.handle('return-rental', async (_, data) => {
    return await prisma.$transaction(async (tx: any) => {
      const reservation = await tx.reservation.update({ where: { id: data.reservationId }, data: { status: 'COMPLETED', actualReturnDate: new Date(), totalAmount: { increment: Number(data.lateFee || 0) } } })
      await tx.stockItem.update({ where: { id: data.stockItemId }, data: { status: 'AVAILABLE' } })
      return reservation
    })
  })

  // =========================================================
  // CAISSE (POS / VENTES) & HISTORIQUE
  // =========================================================
  ipcMain.handle('create-sale', async (_, data) => {
    const { items, totalAmount, discountPercent, advanceAmount, paymentMethod, customer, userId } = data
    return await prisma.$transaction(async (tx: any) => {
      let validUserId = userId
      if (userId === 'master-admin') {
        let defaultAdmin = await tx.user.findFirst()
        if (!defaultAdmin) defaultAdmin = await tx.user.create({ data: { username: 'System', passwordHash: '123456', role: 'SUPER_ADMIN' } })
        validUserId = defaultAdmin.id
      }
      let customerId = customer?.id || null
      if (!customerId && customer && customer.fullName) {
        const newCustomer = await tx.customer.create({ data: { fullName: customer.fullName, phone: customer.phone || '', email: customer.email || '', city: customer.city || '' } })
        customerId = newCustomer.id
      }
      const finalAmt = Number(totalAmount) * (1 - (Number(discountPercent) / 100))
      const remainAmt = paymentMethod === 'ON_DELIVERY' ? finalAmt - Number(advanceAmount) : 0
      const sale = await tx.sale.create({
        data: {
          ticketNumber: `VNT-${Date.now()}`, totalAmount: Number(totalAmount), discountPercent: Number(discountPercent), discountAmount: Number(totalAmount) - finalAmt, finalAmount: finalAmt, advanceAmount: paymentMethod === 'ON_DELIVERY' ? Number(advanceAmount) : finalAmt, remainingAmount: Math.max(0, remainAmt), paymentMethod: paymentMethod, status: paymentMethod === 'ON_DELIVERY' ? 'PENDING_DELIVERY' : 'COMPLETED', userId: validUserId, customerId: customerId,
          items: { create: items.map((item: any) => ({ stockItem: { connect: { barcode: item.barcode } }, appliedPrice: item.price })) }
        }
      })
      for (const item of items) await tx.stockItem.update({ where: { barcode: item.barcode }, data: { status: item.stockType === 'SALE' ? 'SOLD' : 'RENTED' } })
      return sale
    })
  })

  ipcMain.handle('get-sales', async () => await prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true, customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } } }))

  ipcMain.handle('update-sale-status', async (_, data) => {
    return await prisma.$transaction(async (tx: any) => {
      const sale = await tx.sale.findUnique({ where: { id: data.saleId }, include: { items: true } })
      if (!sale) throw new Error("Vente introuvable")
      if (data.action === 'VALIDATE') return await tx.sale.update({ where: { id: data.saleId }, data: { status: 'COMPLETED', remainingAmount: 0 } })
      if (data.action === 'CANCEL') {
        const updatedSale = await tx.sale.update({ where: { id: data.saleId }, data: { status: 'CANCELLED' } })
        for (const item of sale.items) await tx.stockItem.update({ where: { id: item.stockItemId }, data: { status: 'AVAILABLE' } })
        return updatedSale
      }
    })
  })

  // =========================================================
  // TABLEAU DE BORD ET RAPPORTS
  // =========================================================
  ipcMain.handle('get-dashboard-stats', async (_, data) => {
    const { userId, role } = data || {}
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const salesWhere = role === 'SUPER_ADMIN' ? {} : { userId: userId }
    const todaySales = await prisma.sale.findMany({ where: { ...salesWhere, createdAt: { gte: today }, status: { in: ['COMPLETED', 'PENDING_DELIVERY'] } } })
    const activeRentals = await prisma.reservation.findMany({ where: { status: 'ACTIVE_RENT' }, include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } } })
    const recentSales = await prisma.sale.findMany({ where: salesWhere, orderBy: { createdAt: 'desc' }, take: 10, include: { user: true } })

    return {
      todayRevenue: todaySales.reduce((acc: number, sale: any) => acc + sale.finalAmount, 0),
      activeRentalsCount: activeRentals.length,
      totalStock: await prisma.stockItem.count({ where: { status: 'AVAILABLE' } }),
      lateRentals: activeRentals.filter((r: any) => new Date(r.endDate).getTime() < new Date().getTime()),
      recentActivity: recentSales.map((s: any) => ({ type: 'SALE', title: `Vente ${s.ticketNumber}`, date: s.createdAt, amount: s.finalAmount }))
    }
  })

  ipcMain.handle('get-reports-data', async (_, data) => {
    const { startDate, endDate, userId } = data
    let whereClause: any = { status: { in: ['COMPLETED', 'PENDING_DELIVERY'] } }
    if (startDate && endDate) whereClause.createdAt = { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T23:59:59.999Z`) }
    if (userId && userId !== 'ALL') whereClause.userId = userId
    return {
      sales: await prisma.sale.findMany({ where: whereClause, include: { user: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } }, orderBy: { createdAt: 'desc' } }),
      users: await prisma.user.findMany({ select: { id: true, username: true, role: true } })
    }
  })

  ipcMain.handle('get-missing-purchase-prices', async () => await prisma.productVariant.findMany({ where: { OR: [{ purchasePrice: null }, { purchasePrice: 0 }] }, include: { product: true } }))

  // =========================================================
  // CRUD : CATÉGORIES & TISSUS & CLIENTS (PARAMÈTRES)
  // =========================================================
  ipcMain.handle('get-categories', async () => await prisma.category.findMany({ orderBy: { name: 'asc' } }))
  ipcMain.handle('add-category', async (_, name) => await prisma.category.create({ data: { name } }))
  ipcMain.handle('delete-category', async (_, id) => await prisma.category.delete({ where: { id } }))

  ipcMain.handle('get-fabrics', async () => await prisma.fabric.findMany({ orderBy: { name: 'asc' } }))
  ipcMain.handle('add-fabric', async (_, name) => await prisma.fabric.create({ data: { name } }))
  ipcMain.handle('delete-fabric', async (_, id) => await prisma.fabric.delete({ where: { id } }))

  ipcMain.handle('get-customers', async () => await prisma.customer.findMany({ orderBy: { fullName: 'asc' } }))
  ipcMain.handle('add-customer', async (_, data) => await prisma.customer.create({ data: { fullName: data.fullName, phone: data.phone || '', email: data.email || '', city: data.city || '', cin: data.cin || null } }))
  ipcMain.handle('update-customer', async (_, data) => { const { id, ...rest } = data; return await prisma.customer.update({ where: { id }, data: rest }) })
  ipcMain.handle('delete-customer', async (_, id) => await prisma.customer.delete({ where: { id } }))

  // =========================================================
  // GESTION DU PROFIL DE L'ENTREPRISE
  // =========================================================
  ipcMain.handle('get-company', async () => {
    let company = await prisma.companySettings.findUnique({ where: { id: "1" } })
    if (!company) {
      company = await prisma.companySettings.create({ data: { id: "1", name: "Ma Boutique", message: "Merci de votre visite !" } })
    }
    return company
  })

  ipcMain.handle('update-company', async (_, data) => {
    return await prisma.companySettings.upsert({
      where: { id: "1" },
      update: data,
      create: { id: "1", ...data }
    })
  })

} // ✅ L'accolade de fermeture est maintenant à la toute fin de tous les ipcMain.handle

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.whenReady().then(() => { setupDatabaseIPC(); createWindow() })