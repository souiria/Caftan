import { useState, useEffect } from 'react'

// Structure regroupée par modèle/couleur ET par destination
type GroupedStockItem = {
  id: string // Identifiant unique généré (ex: variantId-SALE)
  baseBarcode: string
  productName: string
  productType: string
  color: string
  size: string
  imagePath: string | null
  stockType: string // 'SALE' ou 'RENT'
  
  // Statistiques de stock spécifiques à cette destination
  totalGeneratedQty: number
  currentQty: number // 🔴 NOUVEAU : Le vrai stock possédé (Généré - Vendu)
  availableQty: number
  rentedQty: number
  soldQty: number
  reservedQty: number
}

export default function StockScreen() {
  const [items, setItems] = useState<GroupedStockItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const [filterType, setFilterType] = useState('ALL')

  useEffect(() => {
    loadStock()
  }, [])

  const loadStock = async () => {
    setIsLoading(true)
    try {
      const data = await (window as any).api.getProducts()
      const groupedItems: GroupedStockItem[] = []

      data.forEach((product: any) => {
        product.variants.forEach((variant: any) => {
          if (!variant.stockItems || variant.stockItems.length === 0) return

          const saleItems = variant.stockItems.filter((i: any) => i.stockType === 'SALE')
          const rentItems = variant.stockItems.filter((i: any) => i.stockType === 'RENT')

          const createGroup = (itemsList: any[], type: string) => {
            if (itemsList.length === 0) return

            const totalGeneratedQty = itemsList.length
            const availableQty = itemsList.filter((i: any) => i.status === 'AVAILABLE').length
            const rentedQty = itemsList.filter((i: any) => i.status === 'RENTED').length
            const soldQty = itemsList.filter((i: any) => i.status === 'SOLD').length
            const reservedQty = itemsList.filter((i: any) => i.status === 'RESERVED').length

            // 🔴 CALCUL DU STOCK ACTUEL (On retire ce qui a été vendu définitivement)
            const currentQty = totalGeneratedQty - soldQty

            const firstBarcode = itemsList[0].barcode
            const baseBarcode = firstBarcode.substring(0, firstBarcode.lastIndexOf('-'))

            groupedItems.push({
              id: `${variant.id}-${type}`,
              baseBarcode,
              productName: product.name,
              productType: product.type,
              color: variant.color,
              size: variant.size,
              imagePath: variant.imagePath,
              stockType: type,
              totalGeneratedQty,
              currentQty, // Ajout du stock actuel
              availableQty,
              rentedQty,
              soldQty,
              reservedQty
            })
          }

          createGroup(saleItems, 'SALE')
          createGroup(rentItems, 'RENT')
        })
      })

      setItems(groupedItems)
    } catch (error) {
      console.error("Erreur lors du chargement du stock:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.baseBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.color.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || item.stockType === filterType;
    
    // 🔴 OPTIONNEL : Ne pas afficher les lignes où le stock actuel est de 0 
    // (Décommentez la ligne ci-dessous si vous voulez cacher les articles totalement vendus)
    // const hasCurrentStock = item.currentQty > 0;

    return matchesSearch && matchesType;
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER ET RECHERCHE */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">État du Stock</h2>
          <p className="text-slate-500 mt-1">
            Vue globale des quantités disponibles, louées et vendues, séparées par destination.
          </p>
        </div>
        <div className="flex gap-4">
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filterType === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tout le Stock
            </button>
            <button
              onClick={() => setFilterType('SALE')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filterType === 'SALE' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vente
            </button>
            <button
              onClick={() => setFilterType('RENT')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filterType === 'RENT' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Location
            </button>
          </div>

          <div className="relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Code, produit, couleur..." 
              className="pl-10 pr-4 py-2 w-72 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-sm h-full"
            />
          </div>
        </div>
      </div>

      {/* TABLEAU DE STOCK REGROUPÉ ET SÉPARÉ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="p-4 w-16">Image</th>
                <th className="p-4">Code Barre Base</th>
                <th className="p-4">Produit</th>
                <th className="p-4">Détails</th>
                <th className="p-4 text-center">Qté Actuelle</th>
                <th className="p-4">Répartition du Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Chargement de l'inventaire...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Aucun article trouvé pour ce filtre.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Colonne Image */}
                    <td className="p-4">
                      {item.imagePath ? (
                        <img 
                          src={item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}`} 
                          alt={item.productName} 
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm" 
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                          N/A
                        </div>
                      )}
                    </td>
                    
                    {/* Colonne Code Barre Base */}
                    <td className="p-4 font-mono font-bold text-indigo-600 text-xs">
                      {item.baseBarcode}
                    </td>
                    
                    {/* Colonne Produit */}
                    <td className="p-4">
                      <p className="font-bold text-slate-800 text-base">{item.productName}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.productType}</p>
                      
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        item.stockType === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.stockType === 'SALE' ? 'Stock Vente' : 'Stock Location'}
                      </span>
                    </td>
                    
                    {/* Colonne Couleur/Taille */}
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{item.color}</p>
                      <p className="text-xs text-slate-500">Taille: <span className="font-mono">{item.size}</span></p>
                    </td>
                    
                    {/* 🔴 NOUVEAU : Quantité Actuelle (Total - Vendu) */}
                    <td className="p-4 text-center">
                      <span className="text-xl font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                        {item.currentQty}
                      </span>
                    </td>
                    
                    {/* Répartition / Statuts détaillés */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        
                        {/* Disponible */}
                        {item.availableQty > 0 && (
                          <div className="flex justify-between items-center text-xs w-36">
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dispo
                            </span>
                            <span className="font-bold bg-emerald-50 text-emerald-700 px-1.5 rounded">{item.availableQty}</span>
                          </div>
                        )}
                        
                        {/* En Location */}
                        {item.rentedQty > 0 && (
                          <div className="flex justify-between items-center text-xs w-36">
                            <span className="text-purple-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Loué
                            </span>
                            <span className="font-bold bg-purple-50 text-purple-700 px-1.5 rounded">{item.rentedQty}</span>
                          </div>
                        )}

                        {/* Réservé */}
                        {item.reservedQty > 0 && (
                          <div className="flex justify-between items-center text-xs w-36">
                            <span className="text-orange-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Réservé
                            </span>
                            <span className="font-bold bg-orange-50 text-orange-700 px-1.5 rounded">{item.reservedQty}</span>
                          </div>
                        )}

                        {/* Vendu (Historique conservé pour info) */}
                        {item.soldQty > 0 && (
                          <div className="flex justify-between items-center text-xs w-36 mt-1 pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Vendu
                            </span>
                            <span className="font-bold bg-slate-100 text-slate-500 px-1.5 rounded">{item.soldQty}</span>
                          </div>
                        )}

                      </div>
                    </td>
                    
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}