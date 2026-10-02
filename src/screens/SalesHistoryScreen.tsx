import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL, PENDING_DELIVERY, COMPLETED

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const data = await (window as any).api.getSales()
      setSales(data)
    } catch (error) {
      toast.error("Erreur de chargement de l'historique")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (saleId: string, action: 'VALIDATE' | 'CANCEL') => {
    const isCancel = action === 'CANCEL'
    if (isCancel && !window.confirm("Êtes-vous sûr d'annuler ? L'avance sera conservée et les articles retourneront en stock.")) return
    
    try {
      await (window as any).api.updateSaleStatus({ saleId, action })
      toast.success(isCancel ? "Commande annulée (Stock restitué)" : "Livraison validée !")
      loadSales()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredSales = sales.filter(s => filter === 'ALL' ? true : s.status === filter)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Historique & Livraisons</h2>
          <p className="text-slate-500 mt-1">Gérez vos encaissements et validez les commandes en attente.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-sm font-bold rounded-lg ${filter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Toutes</button>
          <button onClick={() => setFilter('PENDING_DELIVERY')} className={`px-4 py-2 text-sm font-bold rounded-lg ${filter === 'PENDING_DELIVERY' ? 'bg-orange-500 shadow text-white' : 'text-slate-500'}`}>En Attente de Livraison</button>
          <button onClick={() => setFilter('COMPLETED')} className={`px-4 py-2 text-sm font-bold rounded-lg ${filter === 'COMPLETED' ? 'bg-emerald-500 shadow text-white' : 'text-slate-500'}`}>Terminées</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4">Ticket & Date</th>
              <th className="p-4">Vendeur (Utilisateur)</th>
              <th className="p-4">Client</th>
              <th className="p-4">Paiement</th>
              <th className="p-4">Montants</th>
              <th className="p-4 text-center">Statut / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center">Chargement...</td></tr> : filteredSales.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucune commande trouvée.</td></tr> : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{sale.ticketNumber}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.createdAt).toLocaleString('fr-FR')}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{sale.items?.length || 0} article(s)</p>
                  </td>
                  
                  {/* C'EST ICI QU'ON AFFICHE L'UTILISATEUR */}
                  <td className="p-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold text-xs">
                      {sale.user?.username || 'Inconnu'}
                    </span>
                  </td>

                  <td className="p-4">
                    {sale.customer ? (
                      <><p className="font-bold text-slate-700">{sale.customer.fullName}</p><p className="text-xs text-slate-500">{sale.customer.phone}</p></>
                    ) : <span className="text-slate-400 italic text-xs">Client de passage</span>}
                  </td>

                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${sale.paymentMethod === 'ON_DELIVERY' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                      {sale.paymentMethod === 'ON_DELIVERY' ? 'À La Livraison' : sale.paymentMethod}
                    </span>
                  </td>

                  <td className="p-4">
                    <p className="font-black text-slate-800">{sale.finalAmount} DH</p>
                    {sale.paymentMethod === 'ON_DELIVERY' && (
                      <div className="text-xs mt-1">
                        <p className="text-emerald-600">Avance: {sale.advanceAmount} DH</p>
                        <p className="text-orange-600 font-bold">Reste: {sale.remainingAmount} DH</p>
                      </div>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    {sale.status === 'PENDING_DELIVERY' ? (
                      <div className="flex flex-col gap-2 items-center">
                        <span className="text-xs font-bold text-orange-500 mb-1 animate-pulse">EN ATTENTE</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(sale.id, 'VALIDATE')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors">Valider</button>
                          <button onClick={() => handleAction(sale.id, 'CANCEL')} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">Annuler</button>
                        </div>
                      </div>
                    ) : sale.status === 'CANCELLED' ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Annulée (Avance gardée)</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Payée & Terminée</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}