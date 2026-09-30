import { contextBridge, ipcRenderer } from 'electron'

console.log('=================================')
console.log('✅ PRELOAD SCRIPT STARTED')
console.log('=================================')

try {
  contextBridge.exposeInMainWorld('api', {
    
    // ==========================================
    // AUTHENTIFICATION & UTILISATEURS
    // ==========================================
    login: (credentials: any) => ipcRenderer.invoke('login', credentials),
    getUsers: () => ipcRenderer.invoke('get-users'),
    createUser: (data: any) => ipcRenderer.invoke('create-user', data),
    updateUser: (data: any) => ipcRenderer.invoke('update-user', data),

    // ==========================================
    // CATALOGUE & STOCK
    // ==========================================
    getProducts: () => ipcRenderer.invoke('get-products'),
    createProduct: (data: any) => ipcRenderer.invoke('create-product', data),
    createVariant: (data: any) => ipcRenderer.invoke('create-variant', data),
    updateVariant: (data: any) => ipcRenderer.invoke('update-variant', data),
    transferStock: (data: any) => ipcRenderer.invoke('transfer-stock', data),
    saveImageLocally: (filePath: string) => ipcRenderer.invoke('save-image-locally', filePath),
    getItemByBarcode: (barcode: string) => ipcRenderer.invoke('get-item-by-barcode', barcode),
    
    // ==========================================
    // LOCATIONS
    // ==========================================
    getActiveRentals: () => ipcRenderer.invoke('get-active-rentals'),
    createRental: (data: any) => ipcRenderer.invoke('create-rental', data),
    returnRental: (data: any) => ipcRenderer.invoke('return-rental', data),
    getAvailableRentStock: (dates: any) => ipcRenderer.invoke('get-available-rent-stock', dates),
    
    // ==========================================
    // DASHBOARD
    // ==========================================
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    // CAISSE
    createSale: (data: any) => ipcRenderer.invoke('create-sale', data),

  })
  
  console.log('✅ window.api EXPOSED SUCCESSFULLY')
} catch (error) {
  console.error('❌ FAILED TO EXPOSE API:', error)
}