import { useState, useEffect } from 'react'

const Icons = {
  TrendingUp: () => <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Users: () => <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Box: () => <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Alert: () => <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  ShoppingBag: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Check: () => <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> // L'icône Check a bien été ajoutée ici
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await (window as any).api.getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error("Erreur de chargement des stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="max-w-7xl mx-auto h-[80vh] flex items-center justify-center text-slate-400 font-bold animate-pulse">Chargement des données du tableau de bord...</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord</h2>
          <p className="text-slate-500 mt-1 font-medium">Vue exécutive des performances de la boutique.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Date d'aujourd'hui</p>
          <p className="text-lg font-black text-indigo-600">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ==========================================
          KPIs PRINCIPAUX (CARTES)
      ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"><Icons.TrendingUp /></div>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 rounded-xl shadow-inner border border-emerald-100"><Icons.TrendingUp /></div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.revenue?.toLocaleString('fr-FR')} <span className="text-lg text-emerald-500">DH</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"><Icons.Users /></div>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-xl shadow-inner border border-indigo-100"><Icons.Users /></div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Locations Actives</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.activeRentalsCount || 0} <span className="text-lg text-indigo-500">en cours</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"><Icons.Box /></div>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl shadow-inner border border-blue-100"><Icons.Box /></div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Articles Libres</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.totalStock || 0} <span className="text-lg text-blue-500">pièces</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-red-500 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"><Icons.Alert /></div>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-red-200"><Icons.Alert /></div>
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-wider">Retards Critiques</p>
              <h3 className="text-3xl font-black text-red-600">{stats?.lateRentals?.length || 0} <span className="text-lg text-red-400">alertes</span></h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            URGENCES (CÔTÉ GAUCHE - 1 COLONNE)
        ========================================== */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
                <Icons.Alert /> Alertes Retours
              </h3>
              <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{stats?.lateRentals?.length || 0}</span>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto bg-slate-50/50">
              {stats?.lateRentals?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <Icons.Check />
                  <p className="mt-2 text-sm font-medium">Aucun retard détecté.<br/>Vos clients sont à l'heure !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.lateRentals?.map((rental: any) => {
                    const diffTime = new Date().getTime() - new Date(rental.endDate).getTime()
                    const lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    return (
                      <div key={rental.id} className="bg-white p-4 rounded-xl border border-red-200 shadow-sm hover:border-red-400 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-slate-800">{rental.customer.fullName}</p>
                          <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">{lateDays} jours de retard</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mb-2">📞 {rental.customer.cin}</p>
                        <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded truncate">
                          {rental.items[0]?.stockItem?.variant?.product?.name} ({rental.items[0]?.stockItem?.barcode})
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==========================================
            ACTIVITÉ RÉCENTE (CÔTÉ DROIT - 2 COLONNES)
        ========================================== */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dernières Transactions</h3>
              <button className="text-indigo-600 text-xs font-bold hover:underline">Voir tout l'historique</button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Description</th>
                    <th className="p-4 font-bold">Date & Heure</th>
                    <th className="p-4 font-bold text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentActivity?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-400 italic">
                        Aucune transaction pour le moment.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentActivity?.map((activity: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          {activity.type === 'SALE' ? (
                            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-max">
                              <Icons.ShoppingBag /> Vente
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-max">
                              <Icons.Clock /> Location
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-700">{activity.title}</td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(activity.date).toLocaleDateString('fr-FR')} à {new Date(activity.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-right font-black text-slate-800 text-base">
                          {activity.amount} <span className="text-xs text-slate-400 font-bold">DH</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}