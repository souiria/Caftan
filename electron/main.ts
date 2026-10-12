import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

type AuthenticatedUser = { id: string; username: string; role: string; isActive: boolean }
const authenticatedUsers = new Map<number, AuthenticatedUser>()
const ADMIN_ONLY_CHANNELS = new Set([
  'get-users', 'create-user', 'update-user', 'update-sale-status',
  'create-product', 'create-variant', 'update-variant', 'transfer-stock', 'save-image-locally',
  'update-customer', 'delete-customer',
  'get-reports-data', 'get-missing-purchase-prices',
  'add-category', 'delete-category', 'add-fabric', 'delete-fabric', 'update-company'
])

function registerProtectedHandler(channel: string, handler: (...args: any[]) => any) {
  ipcMain.handle(channel, async (event, ...args) => {
    let user = authenticatedUsers.get(event.sender.id)
    if (!user) throw new Error('Authentification requise. Veuillez vous reconnecter.')
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, isActive: true } })
    if (!account?.isActive) {
      authenticatedUsers.delete(event.sender.id)
      throw new Error('Ce compte est inactif. Veuillez vous reconnecter.')
    }
    user = { ...user, role: account.role, isActive: account.isActive }
    authenticatedUsers.set(event.sender.id, user)
    if (ADMIN_ONLY_CHANNELS.has(channel) && user.role !== 'SUPER_ADMIN') {
      throw new Error('Accès réservé à un administrateur.')
    }
    return handler(event, ...args, user)
  })
}

function createWindow() {
  const possiblePreloads = [path.join(__dirname, 'preload.cjs'), path.join(__dirname, 'preload.js'), path.join(__dirname, 'preload.mjs')]
  let preloadPath = possiblePreloads.find(p => fs.existsSync(p)) || path.join(__dirname, 'preload.cjs')

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, 'electron-vite.svg'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  // === DÉSACTIVER LE MENU SUPÉRIEUR ===
  Menu.setApplicationMenu(null)

  win.maximize()
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = VITE_DEV_SERVER_URL
      ? new URL(url).origin === new URL(VITE_DEV_SERVER_URL).origin
      : url === pathToFileURL(path.join(RENDERER_DIST, 'index.html')).href
    if (!allowed) event.preventDefault()
  })
  const contents = win.webContents
  contents.once('destroyed', () => authenticatedUsers.delete(contents.id))
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
  registerProtectedHandler('save-image-locally', async (_, sourcePath) => {
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
  const PBKDF2_ITERATIONS = 310_000
  const hashPassword = (password: string) => new Promise<string>((resolve, reject) => {
    const salt = crypto.randomBytes(16)
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, 32, 'sha256', (error, derivedKey) => {
      if (error) return reject(error)
      resolve(`pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${derivedKey.toString('hex')}`)
    })
  })
  const verifyPassword = async (password: string, storedHash: string) => {
    const [scheme, rounds, saltHex, keyHex] = storedHash.split('$')
    if (scheme === 'pbkdf2' && Number(rounds) >= 100_000 && saltHex && keyHex) {
      const expected = Buffer.from(keyHex, 'hex')
      const actual = await new Promise<Buffer>((resolve, reject) => crypto.pbkdf2(password, Buffer.from(saltHex, 'hex'), Number(rounds), expected.length, 'sha256', (error, key) => error ? reject(error) : resolve(key)))
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
    }
    // Migration transparente des hashes SHA-256 historiques après une connexion valide.
    const legacy = crypto.createHash('sha256').update(password).digest()
    let expected: Buffer
    try { expected = Buffer.from(storedHash, 'hex') } catch { return false }
    return expected.length === legacy.length && crypto.timingSafeEqual(expected, legacy)
  }

  ipcMain.handle('login', async (event, data) => {
    const username = typeof data?.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data?.password === 'string' ? data.password : ''
    if (!username || !password) throw new Error('Identifiant et mot de passe requis.')
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) throw new Error("Identifiant ou mot de passe incorrect.")
    if (!user.isActive) throw new Error("Ce compte a été désactivé par un administrateur.")
    if (!await verifyPassword(password, user.passwordHash)) throw new Error("Identifiant ou mot de passe incorrect.")
    if (!user.passwordHash.startsWith('pbkdf2$')) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } })
    }
    const session = { id: user.id, username: user.username, role: user.role, isActive: user.isActive }
    authenticatedUsers.set(event.sender.id, session)
    return session
  })
  ipcMain.handle('logout', (event) => { authenticatedUsers.delete(event.sender.id); return true })

  registerProtectedHandler('get-users', async () => await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, username: true, role: true, isActive: true, createdAt: true } }))
  registerProtectedHandler('create-user', async (_, data) => {
    const username = typeof data?.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data?.password === 'string' ? data.password : ''
    if (!/^[a-z0-9._-]{3,40}$/.test(username) || password.length < 10 || !['SUPER_ADMIN', 'USER', 'USER_VENTE', 'USER_LOCATION'].includes(data?.role)) throw new Error('Données utilisateur invalides. Le mot de passe doit contenir au moins 10 caractères.')
    return prisma.user.create({ data: { username, passwordHash: await hashPassword(password), role: data.role, isActive: true }, select: { id: true, username: true, role: true, isActive: true, createdAt: true } })
  })
  registerProtectedHandler('update-user', async (_, data) => {
    const { id, username: rawUsername, password, role, isActive } = data || {}
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : ''
    if (typeof id !== 'string' || !/^[a-z0-9._-]{3,40}$/.test(username) || !['SUPER_ADMIN', 'USER', 'USER_VENTE', 'USER_LOCATION'].includes(role) || typeof isActive !== 'boolean') throw new Error('Données utilisateur invalides.')
    const updateData: any = { username, role, isActive }
    if (password && password.trim() !== '') {
      if (password.length < 10) throw new Error('Le mot de passe doit contenir au moins 10 caractères.')
      updateData.passwordHash = await hashPassword(password)
    }
    return await prisma.user.update({ where: { id }, data: updateData, select: { id: true, username: true, role: true, isActive: true, createdAt: true } })
  })

  // =========================================================
  // GESTION DU CATALOGUE ET STOCK
  // =========================================================
  registerProtectedHandler('get-products', async (_, session: AuthenticatedUser) => {
    const products = await prisma.product.findMany({ include: { variants: { include: { stockItems: true } } }, orderBy: { name: 'asc' } })
    if (session.role === 'SUPER_ADMIN') return products
    return products.map((product: any) => ({ ...product, variants: product.variants.map((variant: any) => {
      const safeVariant = { ...variant }
      delete safeVariant.purchasePrice
      return safeVariant
    }) }))
  })

  registerProtectedHandler('create-product', async (_, data) => {
    const { name, type, description } = data
    let product = await prisma.product.findFirst({ where: { name: name, type: type } })
    if (!product) product = await prisma.product.create({ data: { name, type, description } })
    return product
  })

  registerProtectedHandler('create-variant', async (_, data) => {
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

  registerProtectedHandler('update-variant', async (_, updateData) => {
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

  registerProtectedHandler('transfer-stock', async (_, transferData) => {
    const { variantId, quantity, fromType, toType } = transferData
    return await prisma.$transaction(async (tx: any) => {
      const availableItems = await tx.stockItem.findMany({ where: { variantId, stockType: fromType, status: 'AVAILABLE' }, take: quantity })
      if (availableItems.length < quantity) throw new Error(`Pas assez d'articles.`)
      const idsToUpdate = availableItems.map((item: any) => item.id)
      await tx.stockItem.updateMany({ where: { id: { in: idsToUpdate } }, data: { stockType: toType } })
      return true
    })
  })

  registerProtectedHandler('get-item-by-barcode', async (_, barcodeText) => {
    let stockItem = await prisma.stockItem.findUnique({ where: { barcode: barcodeText }, include: { variant: { include: { product: true } } } })
    if (!stockItem) stockItem = await prisma.stockItem.findFirst({ where: { barcode: { startsWith: barcodeText }, status: 'AVAILABLE' }, include: { variant: { include: { product: true } } } })
    return stockItem
  })

  // =========================================================
  // GESTION DES LOCATIONS (RENTALS)
  // =========================================================
  registerProtectedHandler('get-active-rentals', async () => await prisma.reservation.findMany({ where: { status: 'ACTIVE_RENT' }, include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } }, orderBy: { endDate: 'asc' } }))
  
  registerProtectedHandler('get-available-rent-stock', async (_, dates) => {
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

  registerProtectedHandler('create-rental', async (_, data, session: AuthenticatedUser) => {
    return await prisma.$transaction(async (tx: any) => {
      const startDate = new Date(data?.startDate)
      const endDate = new Date(data?.endDate)
      const totalAmount = Number(data?.totalAmount)
      const advanceAmount = Number(data?.advanceAmount ?? 0)
      const cin = typeof data?.cin === 'string' ? data.cin.trim().toUpperCase() : ''
      const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : ''
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) throw new Error('La date de retour doit être postérieure à la date de sortie.')
      if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(advanceAmount) || advanceAmount < 0 || advanceAmount > totalAmount) throw new Error('Montants de location invalides.')
      if (!cin || !fullName || typeof data?.stockItemId !== 'string') throw new Error('Les informations du client et de l’article sont requises.')
      const stockItem = await tx.stockItem.findUnique({ where: { id: data.stockItemId } })
      if (!stockItem || stockItem.stockType !== 'RENT' || stockItem.status === 'SOLD') throw new Error('Article de location introuvable ou indisponible.')
      const conflict = await tx.reservationItem.findFirst({ where: {
        stockItemId: stockItem.id,
        reservation: { status: { in: ['ACTIVE_RENT', 'RESERVED'] }, startDate: { lt: endDate }, endDate: { gt: startDate } }
      } })
      if (conflict) throw new Error('Cet article est déjà réservé pour une partie de cette période.')
      const customer = await tx.customer.upsert({ where: { cin }, update: { fullName }, create: { cin, fullName, phone: '' } })
      const status = startDate <= new Date() ? 'ACTIVE_RENT' : 'RESERVED'
      const reservation = await tx.reservation.create({
        data: {
          reservationNum: `LOC-${crypto.randomUUID()}`, customerId: customer.id, startDate, endDate, totalAmount, advanceAmount, remainingAmount: totalAmount - advanceAmount, status, userId: session.id,
          items: { create: [{ stockItemId: stockItem.id, appliedRentPrice: totalAmount }] }
        }
      })
      await tx.stockItem.update({ where: { id: stockItem.id }, data: { status: status === 'RESERVED' ? 'RESERVED' : 'RENTED' } })
      return reservation
    }, { isolationLevel: 'Serializable' })
  })

  registerProtectedHandler('return-rental', async (_, data) => {
    return await prisma.$transaction(async (tx: any) => {
      const reservation = await tx.reservation.findUnique({ where: { id: data?.reservationId }, include: { items: true } })
      const lateFee = Number(data?.lateFee ?? 0)
      if (!reservation || reservation.status !== 'ACTIVE_RENT') throw new Error('Location active introuvable.')
      if (!reservation.items.some((item: any) => item.stockItemId === data?.stockItemId)) throw new Error('L’article ne correspond pas à cette location.')
      if (!Number.isFinite(lateFee) || lateFee < 0) throw new Error('Montant de retour invalide.')
      const returned = await tx.reservation.updateMany({ where: { id: reservation.id, status: 'ACTIVE_RENT' }, data: { status: 'COMPLETED', actualReturnDate: new Date(), totalAmount: { increment: lateFee } } })
      if (returned.count !== 1) throw new Error('Cette location a déjà été clôturée.')
      const nextReservation = await tx.reservationItem.findFirst({ where: { stockItemId: data.stockItemId, reservation: { status: 'RESERVED', startDate: { gte: new Date() } } } })
      await tx.stockItem.update({ where: { id: data.stockItemId }, data: { status: nextReservation ? 'RESERVED' : 'AVAILABLE' } })
      return tx.reservation.findUnique({ where: { id: reservation.id } })
    }, { isolationLevel: 'Serializable' })
  })

  // =========================================================
  // CAISSE (POS / VENTES) & HISTORIQUE
  // =========================================================
  registerProtectedHandler('create-sale', async (_, data, session: AuthenticatedUser) => {
    return await prisma.$transaction(async (tx: any) => {
      const items = Array.isArray(data?.items) ? data.items : []
      const discountPercent = Number(data?.discountPercent ?? 0)
      const paymentMethod = data?.paymentMethod
      const advanceAmount = Number(data?.advanceAmount ?? 0)
      if (items.length === 0) throw new Error('Le panier est vide.')
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) throw new Error('Pourcentage de remise invalide.')
      if (!['CASH', 'TPE', 'ON_DELIVERY'].includes(paymentMethod)) throw new Error('Mode de paiement invalide.')

      const canonicalItems: Array<{ stock: any; price: number }> = []
      for (const item of items) {
        if (typeof item?.barcode !== 'string') throw new Error('Article du panier invalide.')
        const stock = await tx.stockItem.findUnique({ where: { barcode: item.barcode }, include: { variant: true } })
        if (!stock || stock.status !== 'AVAILABLE') throw new Error(`L’article ${item.barcode} n’est plus disponible.`)
        if (item.stockType !== stock.stockType) throw new Error(`Le type de stock de ${item.barcode} est invalide.`)
        const price = stock.stockType === 'SALE' ? stock.variant.salePrice : stock.variant.rentPrice
        if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) throw new Error(`Prix non défini pour l’article ${item.barcode}.`)
        canonicalItems.push({ stock, price })
      }
      const subtotal = canonicalItems.reduce((sum, item) => sum + item.price, 0)
      const finalAmount = subtotal * (1 - discountPercent / 100)
      if (paymentMethod === 'ON_DELIVERY' && (!Number.isFinite(advanceAmount) || advanceAmount < 0 || advanceAmount > finalAmount)) throw new Error('Avance invalide.')

      let customerId = data?.customer?.id || null
      if (customerId && !await tx.customer.findUnique({ where: { id: customerId } })) throw new Error('Client introuvable.')
      if (!customerId && typeof data?.customer?.fullName === 'string' && data.customer.fullName.trim()) {
        const newCustomer = await tx.customer.create({ data: { fullName: data.customer.fullName.trim(), phone: data.customer.phone || '', email: data.customer.email || '', city: data.customer.city || '' } })
        customerId = newCustomer.id
      }
      if (paymentMethod === 'ON_DELIVERY' && !customerId) throw new Error('Un client doit être associé à une vente à la livraison.')

      const remainingAmount = paymentMethod === 'ON_DELIVERY' ? finalAmount - advanceAmount : 0
      const sale = await tx.sale.create({
        data: {
          ticketNumber: `VNT-${crypto.randomUUID()}`, totalAmount: subtotal, discountPercent, discountAmount: subtotal - finalAmount,
          finalAmount, advanceAmount: paymentMethod === 'ON_DELIVERY' ? advanceAmount : finalAmount,
          remainingAmount: Math.max(0, remainingAmount), paymentMethod,
          status: paymentMethod === 'ON_DELIVERY' ? 'PENDING_DELIVERY' : 'COMPLETED', userId: session.id, customerId,
          items: { create: canonicalItems.map(({ stock, price }) => ({ stockItemId: stock.id, appliedPrice: price })) }
        }
      })
      for (const { stock } of canonicalItems) {
        const updated = await tx.stockItem.updateMany({ where: { id: stock.id, status: 'AVAILABLE' }, data: { status: stock.stockType === 'SALE' ? 'SOLD' : 'RENTED' } })
        if (updated.count !== 1) throw new Error(`L’article ${stock.barcode} vient d’être pris par une autre opération.`)
      }
      return sale
    }, { isolationLevel: 'Serializable' })
  })

  registerProtectedHandler('get-sales', async () => await prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true, customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } } }))

  registerProtectedHandler('update-sale-status', async (_, data) => {
    return await prisma.$transaction(async (tx: any) => {
      const sale = await tx.sale.findUnique({ where: { id: data.saleId }, include: { items: true } })
      if (!sale) throw new Error("Vente introuvable")
      if (sale.status !== 'PENDING_DELIVERY') throw new Error('Seules les ventes en attente de livraison peuvent être modifiées.')
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
  registerProtectedHandler('get-dashboard-stats', async (_, _data, session: AuthenticatedUser) => {
    const { id: userId, role } = session
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const salesWhere = role === 'SUPER_ADMIN' ? {} : { userId: userId }
    
    // 🔴 AJOUT : On inclut les CANCELLED
    const todaySales = await prisma.sale.findMany({ where: { ...salesWhere, createdAt: { gte: today }, status: { in: ['COMPLETED', 'PENDING_DELIVERY', 'CANCELLED'] } } })
    const activeRentals = await prisma.reservation.findMany({ where: { status: 'ACTIVE_RENT' }, include: { customer: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } } })
    const recentSales = await prisma.sale.findMany({ where: salesWhere, orderBy: { createdAt: 'desc' }, take: 10, include: { user: true } })

    return {
      // 🔴 CALCUL : Si annulée, on ne compte que l'avance. Sinon, le montant final.
      todayRevenue: todaySales.reduce((acc: number, sale: any) => acc + (sale.status === 'CANCELLED' ? sale.advanceAmount : sale.finalAmount), 0),
      activeRentalsCount: activeRentals.length,
      totalStock: await prisma.stockItem.count({ where: { status: 'AVAILABLE' } }),
      lateRentals: activeRentals.filter((r: any) => new Date(r.endDate).getTime() < new Date().getTime()),
      recentActivity: recentSales.map((s: any) => ({ type: 'SALE', title: `Vente ${s.ticketNumber}`, date: s.createdAt, amount: s.status === 'CANCELLED' ? s.advanceAmount : s.finalAmount }))
    }
  })

  registerProtectedHandler('get-reports-data', async (_, data) => {
    const { startDate, endDate, userId } = data
    // 🔴 AJOUT : On inclut les CANCELLED dans la recherche
    let whereClause: any = { status: { in: ['COMPLETED', 'PENDING_DELIVERY', 'CANCELLED'] } }
    if (startDate && endDate) whereClause.createdAt = { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T23:59:59.999Z`) }
    if (userId && userId !== 'ALL') whereClause.userId = userId
    return {
      sales: await prisma.sale.findMany({ where: whereClause, include: { user: true, items: { include: { stockItem: { include: { variant: { include: { product: true } } } } } } }, orderBy: { createdAt: 'desc' } }),
      users: await prisma.user.findMany({ select: { id: true, username: true, role: true } })
    }
  })

  registerProtectedHandler('get-missing-purchase-prices', async () => await prisma.productVariant.findMany({ where: { OR: [{ purchasePrice: null }, { purchasePrice: 0 }] }, include: { product: true } }))

  // =========================================================
  // CRUD : CATÉGORIES & TISSUS & CLIENTS (PARAMÈTRES)
  // =========================================================
  registerProtectedHandler('get-categories', async () => await prisma.category.findMany({ orderBy: { name: 'asc' } }))
  registerProtectedHandler('add-category', async (_, name) => await prisma.category.create({ data: { name } }))
  registerProtectedHandler('delete-category', async (_, id) => await prisma.category.delete({ where: { id } }))

  registerProtectedHandler('get-fabrics', async () => await prisma.fabric.findMany({ orderBy: { name: 'asc' } }))
  registerProtectedHandler('add-fabric', async (_, name) => await prisma.fabric.create({ data: { name } }))
  registerProtectedHandler('delete-fabric', async (_, id) => await prisma.fabric.delete({ where: { id } }))

  registerProtectedHandler('get-customers', async () => await prisma.customer.findMany({ orderBy: { fullName: 'asc' } }))
  registerProtectedHandler('add-customer', async (_, data) => await prisma.customer.create({ data: { fullName: data.fullName, phone: data.phone || '', email: data.email || '', city: data.city || '', cin: data.cin || null } }))
  registerProtectedHandler('update-customer', async (_, data) => { const { id, ...rest } = data; return await prisma.customer.update({ where: { id }, data: rest }) })
  registerProtectedHandler('delete-customer', async (_, id) => await prisma.customer.delete({ where: { id } }))

  // =========================================================
  // GESTION DU PROFIL DE L'ENTREPRISE
  // =========================================================
  registerProtectedHandler('get-company', async () => {
    let company = await prisma.companySettings.findUnique({ where: { id: "1" } })
    if (!company) {
      company = await prisma.companySettings.create({ data: { id: "1", name: "Ma Boutique", message: "Merci de votre visite !" } })
    }
    return company
  })

  registerProtectedHandler('update-company', async (_, data) => {
    return await prisma.companySettings.upsert({
      where: { id: "1" },
      update: data,
      create: { id: "1", ...data }
    })
  })

} // ✅ L'accolade de fermeture est maintenant à la toute fin de tous les ipcMain.handle

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.whenReady().then(() => { setupDatabaseIPC(); createWindow() })