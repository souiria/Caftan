import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function ReportsScreen() {
  const currentUser = JSON.parse(sessionStorage.getItem('caftan_current_user') || '{}')
  const isAdmin = currentUser.role === 'SUPER_ADMIN'

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
      
      // On filtre pour ne garder que les CANCELLED qui ont une avance > 0, on ignore les annulations gratuites
      const validSales = data.sales.filter((s: any) => s.status !== 'CANCELLED' || s.advanceAmount > 0)
      setSales(validSales)
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
    if (sale.status === 'CANCELLED') {
      // Pour une commande annulée, le revenu est juste l'avance. Le coût est 0 car le produit est retourné.
      totalRevenue += Number(sale.advanceAmount) || 0
    } else {
      // Vente normale
      totalRevenue += Number(sale.finalAmount) || 0
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cost = Number(item?.stockItem?.variant?.purchasePrice) || 0
          if (cost === 0) hasMissingCostInSales = true
          totalCost += cost
        })
      }
    }
  })

  const netProfit = totalRevenue - totalCost

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Rapports & Bénéfices</h2>
          <p className="text-slate-500 mt-1">Analysez vos ventes, vos marges, et les avances conservées.</p>
        </div>
        <button onClick={setTodayReport} className="bg-[#043927] hover:bg-emerald-800 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-colors">
          Rapport Rapide : Aujourd'hui
        </button>
      </div>

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

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Du</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-[#043927] font-medium text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Au</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-[#043927] font-medium text-sm" />
        </div>
        
        {isAdmin && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Utilisateur / Vendeur</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-[#043927] font-medium text-sm min-w-[200px] bg-slate-50">
              <option value="ALL">Tous les utilisateurs</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.role === 'SUPER_ADMIN' ? 'Admin' : 'Employé'})</option>
              ))}
            </select>
          </div>
        )}
        
        <button onClick={() => loadReports()} className="bg-slate-800 hover:bg-slate-900 text-amber-500 font-bold py-2 px-6 rounded-lg ml-auto">
          Appliquer les filtres
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Chiffre d'Affaires Brut</p>
          <p className="text-4xl font-black text-[#043927]">{totalRevenue.toLocaleString('fr-FR')} <span className="text-xl">DH</span></p>
          <p className="text-xs text-slate-400 mt-2">{sales.length} encaissement(s)</p>
        </div>

        {isAdmin && (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Coût d'Achat (Investissement)</p>
              <p className="text-4xl font-black text-slate-700">{totalCost.toLocaleString('fr-FR')} <span className="text-xl">DH</span></p>
              {hasMissingCostInSales && <p className="text-xs text-red-500 font-bold mt-2">⚠️ Incomplet (Prix manquants détectés sur certaines ventes)</p>}
            </div>

            <div className="bg-gradient-to-br from-[#043927] to-emerald-900 p-6 rounded-2xl shadow-md text-white flex flex-col justify-center border border-amber-900/30">
              <p className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-1">Bénéfice Net</p>
              <p className="text-4xl font-black text-white">{netProfit.toLocaleString('fr-FR')} <span className="text-xl text-amber-500">DH</span></p>
              <p className="text-xs text-emerald-100 mt-2">Marge globale : {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="font-bold text-slate-700">Détail des Ventes & Avances Conservées</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4">Date & Ticket</th>
              <th className="p-4">Vendeur</th>
              <th className="p-4">Articles</th>
              <th className="p-4 text-center">Statut</th>
              <th className="p-4 text-right">CA Net (DH)</th>
              {isAdmin && <th className="p-4 text-right">Bénéfice (DH)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center">Chargement...</td></tr> : sales.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucun encaissement sur cette période.</td></tr> : (
              sales.map((sale) => {
                let saleCost = 0;
                let revenue = 0;
                let saleProfit = 0;

                // Comptabilité selon le statut de la vente
                if (sale.status === 'CANCELLED') {
                  revenue = sale.advanceAmount;
                  saleCost = 0; // Le produit est retourné, coût zéro
                  saleProfit = revenue; // 100% de bénéfice sur une avance conservée
                } else {
                  sale.items?.forEach((i: any) => saleCost += (Number(i?.stockItem?.variant?.purchasePrice) || 0));
                  revenue = sale.finalAmount;
                  saleProfit = revenue - saleCost;
                }

                return (
                  <tr key={sale.id} className={sale.status === 'CANCELLED' ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50'}>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{new Date(sale.createdAt).toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{sale.ticketNumber}</p>
                    </td>
                    <td className="p-4 font-bold text-[#043927]">{sale.user?.username || 'Système'}</td>
                    <td className="p-4 text-xs text-slate-600">
                      {sale.items?.map((i: any, idx: number) => (
                        <div key={idx}>• {i?.stockItem?.variant?.product?.name || 'Article inconnu'} ({i?.stockItem?.variant?.color || 'N/A'})</div>
                      ))}
                    </td>
                    <td className="p-4 text-center">
                      {sale.status === 'CANCELLED' ? (
                        <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-[10px] uppercase">Annulée</span>
                      ) : sale.discountPercent > 0 ? (
                        <span className="bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded text-[10px] uppercase">Remise -{sale.discountPercent}%</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded text-[10px] uppercase">Normale</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-black text-slate-800">{revenue}</p>
                      {sale.status === 'CANCELLED' && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Avance Conservée</p>}
                    </td>
                    
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