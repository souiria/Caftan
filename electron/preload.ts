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
// CLIENTS
    getCustomers: () => ipcRenderer.invoke('get-customers'),
    // VENTES & HISTORIQUE
    getSales: () => ipcRenderer.invoke('get-sales'),
    updateSaleStatus: (data: any) => ipcRenderer.invoke('update-sale-status', data),
    // RAPPORTS
    getReportsData: (data: any) => ipcRenderer.invoke('get-reports-data', data),
    getMissingPurchasePrices: () => ipcRenderer.invoke('get-missing-purchase-prices'),
    // PARAMÈTRES (CATÉGORIES & TISSUS)
   // PARAMÈTRES (CATÉGORIES & TISSUS)
    getCategories: () => ipcRenderer.invoke('get-categories'),
    addCategory: (name: string) => ipcRenderer.invoke('add-category', name),
    deleteCategory: (id: string) => ipcRenderer.invoke('delete-category', id),
    
    getFabrics: () => ipcRenderer.invoke('get-fabrics'),
    addFabric: (name: string) => ipcRenderer.invoke('add-fabric', name),
    deleteFabric: (id: string) => ipcRenderer.invoke('delete-fabric', id),
    // GESTION DES CLIENTS
    addCustomer: (data: any) => ipcRenderer.invoke('add-customer', data),
    updateCustomer: (data: any) => ipcRenderer.invoke('update-customer', data),
    deleteCustomer: (id: string) => ipcRenderer.invoke('delete-customer', id),

    getCompany: () => ipcRenderer.invoke('get-company'),
    updateCompany: (data: any) => ipcRenderer.invoke('update-company', data),
  })
  
  console.log('✅ window.api EXPOSED SUCCESSFULLY')
} catch (error) {
  console.error('❌ FAILED TO EXPOSE API:', error)
}