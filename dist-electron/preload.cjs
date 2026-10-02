"use strict";
const electron = require("electron");
console.log("=================================");
console.log("✅ PRELOAD SCRIPT STARTED");
console.log("=================================");
try {
  electron.contextBridge.exposeInMainWorld("api", {
    // ==========================================
    // AUTHENTIFICATION & UTILISATEURS
    // ==========================================
    login: (credentials) => electron.ipcRenderer.invoke("login", credentials),
    getUsers: () => electron.ipcRenderer.invoke("get-users"),
    createUser: (data) => electron.ipcRenderer.invoke("create-user", data),
    updateUser: (data) => electron.ipcRenderer.invoke("update-user", data),
    // ==========================================
    // CATALOGUE & STOCK
    // ==========================================
    getProducts: () => electron.ipcRenderer.invoke("get-products"),
    createProduct: (data) => electron.ipcRenderer.invoke("create-product", data),
    createVariant: (data) => electron.ipcRenderer.invoke("create-variant", data),
    updateVariant: (data) => electron.ipcRenderer.invoke("update-variant", data),
    transferStock: (data) => electron.ipcRenderer.invoke("transfer-stock", data),
    saveImageLocally: (filePath) => electron.ipcRenderer.invoke("save-image-locally", filePath),
    getItemByBarcode: (barcode) => electron.ipcRenderer.invoke("get-item-by-barcode", barcode),
    // ==========================================
    // LOCATIONS
    // ==========================================
    getActiveRentals: () => electron.ipcRenderer.invoke("get-active-rentals"),
    createRental: (data) => electron.ipcRenderer.invoke("create-rental", data),
    returnRental: (data) => electron.ipcRenderer.invoke("return-rental", data),
    getAvailableRentStock: (dates) => electron.ipcRenderer.invoke("get-available-rent-stock", dates),
    // ==========================================
    // DASHBOARD
    // ==========================================
    getDashboardStats: () => electron.ipcRenderer.invoke("get-dashboard-stats"),
    // CAISSE
    createSale: (data) => electron.ipcRenderer.invoke("create-sale", data),
    // CLIENTS
    getCustomers: () => electron.ipcRenderer.invoke("get-customers"),
    // VENTES & HISTORIQUE
    getSales: () => electron.ipcRenderer.invoke("get-sales"),
    updateSaleStatus: (data) => electron.ipcRenderer.invoke("update-sale-status", data),
    // RAPPORTS
    getReportsData: (data) => electron.ipcRenderer.invoke("get-reports-data", data),
    getMissingPurchasePrices: () => electron.ipcRenderer.invoke("get-missing-purchase-prices"),
    // PARAMÈTRES (CATÉGORIES & TISSUS)
    // PARAMÈTRES (CATÉGORIES & TISSUS)
    getCategories: () => electron.ipcRenderer.invoke("get-categories"),
    addCategory: (name) => electron.ipcRenderer.invoke("add-category", name),
    deleteCategory: (id) => electron.ipcRenderer.invoke("delete-category", id),
    getFabrics: () => electron.ipcRenderer.invoke("get-fabrics"),
    addFabric: (name) => electron.ipcRenderer.invoke("add-fabric", name),
    deleteFabric: (id) => electron.ipcRenderer.invoke("delete-fabric", id),
    // GESTION DES CLIENTS
    addCustomer: (data) => electron.ipcRenderer.invoke("add-customer", data),
    updateCustomer: (data) => electron.ipcRenderer.invoke("update-customer", data),
    deleteCustomer: (id) => electron.ipcRenderer.invoke("delete-customer", id)
  });
  console.log("✅ window.api EXPOSED SUCCESSFULLY");
} catch (error) {
  console.error("❌ FAILED TO EXPOSE API:", error);
}
