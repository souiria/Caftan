import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const Icons = {
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Database: () => <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
}

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'FABRICS' | 'CUSTOMERS'>('CUSTOMERS')
  
  const [categories, setCategories] = useState<any[]>([])
  const [fabrics, setFabrics] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [newItemName, setNewItemName] = useState('')
  const [customerModal, setCustomerModal] = useState<{isOpen: boolean, mode: 'ADD' | 'EDIT', data: any}>({ isOpen: false, mode: 'ADD', data: {} })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if ((window as any).api.getCategories) setCategories(await (window as any).api.getCategories())
      if ((window as any).api.getFabrics) setFabrics(await (window as any).api.getFabrics())
      if ((window as any).api.getCustomers) setCustomers(await (window as any).api.getCustomers())
    } catch (error) {
      toast.error("Erreur de chargement des données")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSimpleItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    try {
      if (activeTab === 'CATEGORIES') {
        await (window as any).api.addCategory(newItemName.trim())
      } else {
        await (window as any).api.addFabric(newItemName.trim())
      }
      toast.success("Élément ajouté !")
      setNewItemName('')
      loadData()
    } catch (error) { toast.error("Ce nom existe déjà.") }
  }

  // CORRECTION ICI : 'CATEGORIES' | 'FABRICS' au pluriel
  const handleDeleteSimpleItem = async (id: string, type: 'CATEGORIES' | 'FABRICS') => {
    if (!window.confirm("Confirmer la suppression ?")) return
    try {
      if (type === 'CATEGORIES') await (window as any).api.deleteCategory(id)
      else await (window as any).api.deleteFabric(id)
      toast.success("Supprimé avec succès")
      loadData()
    } catch (error) { toast.error("Erreur lors de la suppression.") }
  }

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (customerModal.mode === 'ADD') {
        await (window as any).api.addCustomer(customerModal.data)
        toast.success("Client ajouté !")
      } else {
        await (window as any).api.updateCustomer(customerModal.data)
        toast.success("Client mis à jour !")
      }
      setCustomerModal({ isOpen: false, mode: 'ADD', data: {} })
      loadData()
    } catch (error) { toast.error("Erreur lors de l'enregistrement du client.") }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce client ? Les ventes liées pourraient être affectées.")) return
    try {
      await (window as any).api.deleteCustomer(id)
      toast.success("Client supprimé !")
      loadData()
    } catch (error) { toast.error("Impossible de supprimer un client ayant des transactions existantes.") }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {customerModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg">{customerModal.mode === 'ADD' ? 'Nouveau Client' : 'Modifier Client'}</h3>
              <button onClick={() => setCustomerModal({ isOpen: false, mode: 'ADD', data: {} })} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Nom Complet *</label><input type="text" required value={customerModal.data.fullName || ''} onChange={e => setCustomerModal({...customerModal, data: {...customerModal.data, fullName: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label><input type="text" value={customerModal.data.phone || ''} onChange={e => setCustomerModal({...customerModal, data: {...customerModal.data, phone: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">CIN</label><input type="text" value={customerModal.data.cin || ''} onChange={e => setCustomerModal({...customerModal, data: {...customerModal.data, cin: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Ville</label><input type="text" value={customerModal.data.city || ''} onChange={e => setCustomerModal({...customerModal, data: {...customerModal.data, city: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input type="email" value={customerModal.data.email || ''} onChange={e => setCustomerModal({...customerModal, data: {...customerModal.data, email: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" /></div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3"><Icons.Database /> Données & Paramètres</h2>
          <p className="text-slate-500 mt-1">Gérez votre base de clients et les listes déroulantes de l'application.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[70vh]">
        <div className="flex bg-slate-50 border-b border-slate-100 p-2 gap-2">
          <button onClick={() => setActiveTab('CUSTOMERS')} className={`px-6 py-3 text-sm font-bold rounded-xl transition-colors ${activeTab === 'CUSTOMERS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>Base Clients</button>
          <button onClick={() => setActiveTab('CATEGORIES')} className={`px-6 py-3 text-sm font-bold rounded-xl transition-colors ${activeTab === 'CATEGORIES' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>Noms (Produits)</button>
          <button onClick={() => setActiveTab('FABRICS')} className={`px-6 py-3 text-sm font-bold rounded-xl transition-colors ${activeTab === 'FABRICS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>Tissus (Types)</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
          
          {activeTab === 'CUSTOMERS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Liste des Clients ({customers.length})</h3>
                <button onClick={() => setCustomerModal({ isOpen: true, mode: 'ADD', data: {} })} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md">+ Nouveau Client</button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr><th className="p-4">Nom Complet</th><th className="p-4">Contact</th><th className="p-4">Ville</th><th className="p-4 text-center">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr> : customers.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun client.</td></tr> : (
                      customers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-700">
                            {c.fullName} <span className="block text-xs font-normal text-slate-400 font-mono mt-0.5">{c.cin ? `CIN: ${c.cin}` : ''}</span>
                          </td>
                          <td className="p-4"><p className="font-medium text-slate-700">{c.phone || '-'}</p><p className="text-xs text-slate-400">{c.email}</p></td>
                          <td className="p-4 text-slate-600 font-medium">{c.city || '-'}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => setCustomerModal({ isOpen: true, mode: 'EDIT', data: c })} className="p-2 text-indigo-400 hover:text-indigo-600"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteCustomer(c.id)} className="p-2 text-red-400 hover:text-red-600"><Icons.Trash /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'CATEGORIES' || activeTab === 'FABRICS') && (
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={handleAddSimpleItem} className="flex gap-2">
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder={`Nouveau ${activeTab === 'CATEGORIES' ? 'nom de produit' : 'tissu'}...`} className="flex-1 p-3 rounded-xl border border-slate-300 outline-none focus:border-indigo-500 font-medium" />
                <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 shadow-md">Ajouter</button>
              </form>
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? <tr><td className="p-8 text-center">Chargement...</td></tr> : (activeTab === 'CATEGORIES' ? categories : fabrics).length === 0 ? <tr><td className="p-8 text-center text-slate-400">Liste vide.</td></tr> : (
                      (activeTab === 'CATEGORIES' ? categories : fabrics).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-700">{item.name}</td>
                          <td className="p-4 text-right">
                            {/* CORRECTION ICI : as 'CATEGORIES' | 'FABRICS' */}
                            <button onClick={() => handleDeleteSimpleItem(item.id, activeTab as 'CATEGORIES' | 'FABRICS')} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg"><Icons.Trash /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}