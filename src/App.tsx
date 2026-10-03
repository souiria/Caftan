import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import LoginScreen from './screens/LoginScreen'
import ProductsScreen from './screens/ProductsScreen'
import DashboardScreen from './screens/DashboardScreen'
import POSScreen from './screens/POSScreen'
import RentalsScreen from './screens/RentalsScreen'
import StockScreen from './screens/StockScreen'
import UsersScreen from './screens/UsersScreen'
import SalesHistoryScreen from './screens/SalesHistoryScreen'
import ReportsScreen from './screens/ReportsScreen'
import SettingsScreen from './screens/SettingsScreen'
import CompanyScreen from './screens/CompanyScreen' // 🔴 NOUVELLE PAGE ENTREPRISE

const MenuIcons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  POS: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Rentals: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Stock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Products: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  History: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Reports: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Store: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = sessionStorage.getItem('caftan_current_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  
  const [currentScreen, setCurrentScreen] = useState('dashboard')

  const handleLogin = (user: any) => {
    setCurrentUser(user)
    sessionStorage.setItem('caftan_current_user', JSON.stringify(user))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    sessionStorage.removeItem('caftan_current_user')
    setCurrentScreen('dashboard')
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen />
      case 'pos': return <POSScreen />
      case 'history': return <SalesHistoryScreen />
      case 'rentals': return <RentalsScreen />
      case 'stock': return <StockScreen />
      case 'products': return <ProductsScreen />
      case 'reports': return currentUser.role === 'SUPER_ADMIN' ? <ReportsScreen /> : <DashboardScreen />
      case 'users': return currentUser.role === 'SUPER_ADMIN' ? <UsersScreen /> : <DashboardScreen />
      case 'settings': return currentUser.role === 'SUPER_ADMIN' ? <SettingsScreen /> : <DashboardScreen />
      case 'company': return currentUser.role === 'SUPER_ADMIN' ? <CompanyScreen /> : <DashboardScreen /> // 🔴 ROUTE ENTREPRISE
      default: return <DashboardScreen />
    }
  }

  // Composant bouton réutilisable pour le menu
  const NavButton = ({ id, label, icon, isAdminSection = false }: any) => {
    const isActive = currentScreen === id
    const baseClasses = "w-full text-left px-4 py-3.5 rounded-xl font-bold transition-all duration-200 flex items-center gap-3 group relative overflow-hidden"
    
    // Style Admin (Vert Emeraude) vs Style Employé (Indigo)
    const activeClasses = isAdminSection 
      ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/50 translate-x-1" 
      : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1"
      
    const inactiveClasses = "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"

    return (
      <button onClick={() => setCurrentScreen(id)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r-md"></div>}
        <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          {icon}
        </div>
        <span className="tracking-wide text-sm">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* SIDEBAR */}
      <div className="w-72 bg-[#0B1120] text-white flex flex-col shadow-2xl z-10 print:hidden relative border-r border-slate-800/50">
        
        {/* EN-TÊTE LOGO */}
        <div className="p-8 pb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <span className="text-2xl font-black text-white">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">CAFTAN</h1>
            <p className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] mt-0.5">STORE MANAGER</p>
          </div>
        </div>
        
        {/* NAVIGATION PRINCIPALE */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 ml-2 mt-2">Général</p>
          <NavButton id="dashboard" label="Tableau de Bord" icon={<MenuIcons.Dashboard />} />
          <NavButton id="pos" label="Vente (Caisse)" icon={<MenuIcons.POS />} />
          <NavButton id="rentals" label="Location & Planning" icon={<MenuIcons.Rentals />} />
          
          <div className="my-6"></div>
          <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 ml-2">Inventaire</p>
          <NavButton id="stock" label="État du Stock" icon={<MenuIcons.Stock />} />
          <NavButton id="products" label="Produits & Variantes" icon={<MenuIcons.Products />} />
          <NavButton id="history" label="Historique & Livraisons" icon={<MenuIcons.History />} />
          
          {/* ADMINISTRATION (SUPER_ADMIN) */}
          {currentUser.role === 'SUPER_ADMIN' && (
            <div className="mt-8 mb-4">
              <div className="h-px w-full bg-slate-800 mb-6"></div>
              <p className="text-[10px] font-black tracking-widest text-emerald-500/70 uppercase mb-3 ml-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Administration
              </p>
              <div className="space-y-1">
                <NavButton id="users" label="Équipe & Accès" icon={<MenuIcons.Users />} isAdminSection={true} />
                <NavButton id="reports" label="Rapports & Bénéfices" icon={<MenuIcons.Reports />} isAdminSection={true} />
                <NavButton id="settings" label="Listes & Catégories" icon={<MenuIcons.Settings />} isAdminSection={true} />
                <NavButton id="company" label="Profil Entreprise" icon={<MenuIcons.Store />} isAdminSection={true} />
              </div>
            </div>
          )}
        </div>

        {/* PROFIL EN BAS */}
        <div className="p-4 m-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${currentUser.role === 'SUPER_ADMIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm text-white truncate max-w-[100px]">{currentUser.username}</p>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{currentUser.role === 'SUPER_ADMIN' ? 'Administrateur' : 'Employé'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

      {/* ZONE DYNAMIQUE */}
      <div className="flex-1 overflow-y-auto p-10 relative custom-scrollbar">
        {renderScreen()}
      </div>
    </div>
  )
}