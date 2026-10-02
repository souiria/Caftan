import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function ReportsScreen() {
  const currentUser = JSON.parse(sessionStorage.getItem('caftan_current_user') || '{}')
  const isAdmin = currentUser.role === 'SUPER_ADMIN'

  // Dates par défaut (Aujourd'hui)
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [selectedUser, setSelectedUser] = useState('ALL')

  const [sales, setSales] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])
  const [missingPrices, setMissingPrices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadReports()
    if (isAdmin) loadMissingPrices()
  }, [])

  const loadReports = async (start = startDate, end = endDate, user = selectedUser) => {
    setIsLoading(true)
    try {
      const data = await (window as any).api.getReportsData({ startDate: start, endDate: end, userId: user })
      setSales(data.sales)
      setUsersList(data.users)
    } catch (error) {
      toast.error("Erreur de chargement des rapports")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMissingPrices = async () => {
    try {
      const data = await (window as any).api.getMissingPurchasePrices()
      setMissingPrices(data)
    } catch (error) {
      console.error(error)
    }
  }

  const setTodayReport = () => {
    setStartDate(today)
    setEndDate(today)
    setSelectedUser('ALL')
    loadReports(today, today, 'ALL')
  }

  // === CALCULS FINANCIERS SÉCURISÉS ===
  let totalRevenue = 0
  let totalCost = 0
  let hasMissingCostInSales = false

  sales.forEach(sale => {
    totalRevenue += Number(sale.finalAmount) || 0
    
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item: any) => {
        // Le "?." évite un crash si un produit a été supprimé de la BDD
        const cost = Number(item?.stockItem?.variant?.purchasePrice) || 0
        if (cost === 0) hasMissingCostInSales = true
        totalCost += cost
      })
    }
  })

  const netProfit = totalRevenue - totalCost

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Rapports & Bénéfices</h2>
          <p className="text-slate-500 mt-1">Analysez vos ventes, vos marges, et les performances de l'équipe.</p>
        </div>
        <button onClick={setTodayReport} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-colors">
          Rapport Rapide : Aujourd'hui
        </button>
      </div>

      {/* ALERTES (Seulement pour ADMIN) */}
      {isAdmin && missingPrices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-black text-red-700 flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Action Requise : Prix d'achat manquants
          </h3>
          <p className="text-sm text-red-600 mb-3">
            Vous avez {missingPrices.length} article(s) sans prix d'achat. <strong>Le calcul du bénéfice sera faux</strong> si vous vendez ces articles. Allez dans "Produits & Variantes" pour les éditer.
          </p>
          <div className="flex flex-wrap gap-2">
            {missingPrices.map(mp => (
              <span key={mp.id} className="bg-white border border-red-200 text-red-700 text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                {mp.product?.name || 'Produit'} - {mp.color} ({mp.size})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BARRE DE FILTRES */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Du</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Au</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
        </div>
        
        {isAdmin && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Utilisateur / Vendeur</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm min-w-[200px] bg-slate-50">
              <option value="ALL">Tous les utilisateurs</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.role === 'SUPER_ADMIN' ? 'Admin' : 'Employé'})</option>
              ))}
            </select>
          </div>
        )}
        
        <button onClick={() => loadReports()} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg ml-auto">
          Appliquer les filtres
        </button>
      </div>

      {/* CARTES DE RÉSUMÉ */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Chiffre d'Affaires Brut</p>
          <p className="text-4xl font-black text-indigo-600">{totalRevenue.toLocaleString('fr-FR')} <span className="text-xl">DH</span></p>
          <p className="text-xs text-slate-400 mt-2">{sales.length} transaction(s)</p>
        </div>

        {isAdmin && (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Coût d'Achat (Investissement)</p>
              <p className="text-4xl font-black text-slate-700">{totalCost.toLocaleString('fr-FR')} <span className="text-xl">DH</span></p>
              {hasMissingCostInSales && <p className="text-xs text-red-500 font-bold mt-2">⚠️ Incomplet (Prix manquants détectés sur certaines ventes)</p>}
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-md text-white flex flex-col justify-center">
              <p className="text-sm font-bold text-emerald-100 uppercase tracking-wider mb-1">Bénéfice Net</p>
              <p className="text-4xl font-black">{netProfit.toLocaleString('fr-FR')} <span className="text-xl">DH</span></p>
              <p className="text-xs text-emerald-100 mt-2">Marge : {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
            </div>
          </>
        )}
      </div>

      {/* TABLEAU DES VENTES DÉTAILLÉES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="font-bold text-slate-700">Détail des Ventes (Période sélectionnée)</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4">Date & Ticket</th>
              <th className="p-4">Vendeur</th>
              <th className="p-4">Articles</th>
              <th className="p-4 text-center">Remise</th>
              <th className="p-4 text-right">CA Brut (DH)</th>
              {isAdmin && <th className="p-4 text-right">Bénéfice (DH)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center">Chargement...</td></tr> : sales.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucune vente sur cette période.</td></tr> : (
              sales.map((sale) => {
                let saleCost = 0;
                sale.items?.forEach((i: any) => saleCost += (Number(i?.stockItem?.variant?.purchasePrice) || 0));
                let saleProfit = sale.finalAmount - saleCost;

                return (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{new Date(sale.createdAt).toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{sale.ticketNumber}</p>
                    </td>
                    <td className="p-4 font-bold text-indigo-600">{sale.user?.username || 'Système'}</td>
                    <td className="p-4 text-xs text-slate-600">
                      {sale.items?.map((i: any, idx: number) => (
                        <div key={idx}>• {i?.stockItem?.variant?.product?.name || 'Article inconnu'} ({i?.stockItem?.variant?.color || 'N/A'})</div>
                      ))}
                    </td>
                    <td className="p-4 text-center">
                      {sale.discountPercent > 0 ? <span className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded">-{sale.discountPercent}%</span> : '-'}
                    </td>
                    <td className="p-4 text-right font-black text-slate-800">{sale.finalAmount}</td>
                    
                    {isAdmin && (
                      <td className="p-4 text-right font-black text-emerald-600">
                        +{saleProfit}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}