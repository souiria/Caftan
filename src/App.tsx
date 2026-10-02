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
import SettingsScreen from './screens/SettingsScreen' // 🔴 AJOUT de l'import

export default function App() {
  // On initialise avec ce qui est déjà sauvegardé dans le sessionStorage (effacé à la fermeture de l'app)
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

  // ROUTEUR SIMPLIFIÉ
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
      case 'settings': return currentUser.role === 'SUPER_ADMIN' ? <SettingsScreen /> : <DashboardScreen /> // 🔴 ROUTE AJOUTÉE
      default: return <DashboardScreen />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Conteneur global pour les notifications non bloquantes */}
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white p-6 flex flex-col shadow-xl z-10 print:hidden">
        <div className="mb-10">
          <h1 className="text-2xl font-black text-indigo-400 tracking-widest uppercase">CAFTAN</h1>
          <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">STORE MANAGER</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button onClick={() => setCurrentScreen('dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Tableau de Bord</button>
          <button onClick={() => setCurrentScreen('pos')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'pos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Vente (Caisse)</button>
          <button onClick={() => setCurrentScreen('rentals')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'rentals' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Location & Planning</button>
          <button onClick={() => setCurrentScreen('stock')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'stock' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Gestion Stock</button>
          <button onClick={() => setCurrentScreen('products')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'products' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Produits & Variantes</button>
          <button onClick={() => setCurrentScreen('history')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${currentScreen === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Historique & Livraisons</button>
          
          {/* ADMIN SEULEMENT */}
          {currentUser.role === 'SUPER_ADMIN' && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 ml-4">Administration</p>
              
              <button onClick={() => setCurrentScreen('users')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-between mb-2 ${currentScreen === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'}`}>
                <span>Équipe & Accès</span>
              </button>
              
              <button onClick={() => setCurrentScreen('reports')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-between mb-2 ${currentScreen === 'reports' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'}`}>
                <span>Rapports & Bénéfices</span>
              </button>

              {/* 🔴 BOUTON POUR SETTINGS */}
              <button onClick={() => setCurrentScreen('settings')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-between ${currentScreen === 'settings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'}`}>
                <span>Données & Paramètres</span>
              </button>
            </div>
          )}
        </nav>

        {/* PROFIL EN BAS */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${currentUser.role === 'SUPER_ADMIN' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm text-white truncate max-w-[100px]">{currentUser.username}</p>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{currentUser.role === 'SUPER_ADMIN' ? 'Admin' : 'Employé'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

      {/* ZONE DYNAMIQUE */}
      <div className="flex-1 overflow-y-auto p-10 relative">
        {renderScreen()}
      </div>
    </div>
  )
}