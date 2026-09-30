import { useState, useEffect } from 'react'

const Icons = {
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Barcode: () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
}

type CartItem = {
  barcode: string
  name: string
  color: string
  size: string
  price: number
  transactionType: 'Vente' | 'Location'
  imagePath?: string | null
}

export default function POSScreen() {
  // 🔴 AJOUT : Récupération de l'utilisateur connecté depuis le localStorage
  const currentUser = JSON.parse(localStorage.getItem('caftan_current_user') || '{}')

  const [barcode, setBarcode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // SAUVEGARDE AUTOMATIQUE : On charge le panier depuis le localStorage au démarrage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('pos_cart')
    return savedCart ? JSON.parse(savedCart) : []
  })

  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart))
  }, [cart])

  // Recherche Manuelle (Modal)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableItems, setAvailableItems] = useState<any[]>([])

  const handleScan = async (e?: React.FormEvent, manualBarcode?: string) => {
    if (e) e.preventDefault()
    const targetBarcode = manualBarcode || barcode.trim()
    if (!targetBarcode) return

    if (cart.find(item => item.barcode === targetBarcode)) {
      alert("Cet article est déjà dans le panier !")
      setBarcode('')
      return
    }

    try {
      const itemData = await (window as any).api.getItemByBarcode(targetBarcode)

      if (!itemData) {
        alert("Code-barres introuvable dans la base de données !")
        setBarcode('')
        return
      }

      if (itemData.status !== 'AVAILABLE') {
        alert(`Cet article n'est pas disponible (Statut actuel : ${itemData.status})`)
        setBarcode('')
        return
      }

      const variant = itemData.variant
      const product = variant.product
      const itemPrice = itemData.stockType === 'SALE' ? (variant.salePrice || 0) : (variant.rentPrice || 0)
      const transType = itemData.stockType === 'SALE' ? 'Vente' : 'Location'

      const newItem: CartItem = {
        barcode: itemData.barcode,
        name: `${product.name} (${product.type})`,
        color: variant.color,
        size: variant.size,
        price: itemPrice,
        transactionType: transType,
        imagePath: variant.imagePath || null
      }

      setCart([...cart, newItem])
      setBarcode('') 
      setIsSearchModalOpen(false) 

    } catch (error) {
      console.error(error)
      alert("Erreur lors du scan du code-barres.")
    }
  }

  const openSearchModal = async () => {
    setIsSearchModalOpen(true)
    setSearchTerm('')
    try {
      const data = await (window as any).api.getProducts()
      const itemsList: any[] = []

      data.forEach((p: any) => {
        p.variants.forEach((v: any) => {
          v.stockItems.forEach((s: any) => {
            if (s.status === 'AVAILABLE') {
              itemsList.push({ ...s, variant: v, product: p })
            }
          })
        })
      })
      setAvailableItems(itemsList)
    } catch (error) {
      console.error("Erreur de chargement du stock", error)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    // 🔴 SÉCURITÉ : Vérifier si l'utilisateur est bien reconnu avant d'encaisser
    if (!currentUser.id) {
      return alert("Erreur : Aucun utilisateur connecté détecté. Veuillez vous reconnecter.")
    }

    setIsLoading(true)

    try {
      await (window as any).api.createSale({
        items: cart.map(c => ({ 
          barcode: c.barcode, 
          stockType: c.transactionType === 'Vente' ? 'SALE' : 'RENT' 
        })),
        totalAmount: total,
        userId: currentUser.id // 🔴 AJOUT : Transmission de l'ID utilisateur au backend
      })

      alert("Encaissé avec succès !")
      setCart([]) 
      localStorage.removeItem('pos_cart') 
    } catch (error: any) {
      alert("Erreur lors de l'encaissement : " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = (indexToRemove: number) => {
    setCart(cart.filter((_, index) => index !== indexToRemove))
  }

  const updateItemPrice = (indexToUpdate: number, newPrice: string) => {
    const updatedCart = [...cart]
    updatedCart[indexToUpdate].price = Number(newPrice) || 0
    setCart(updatedCart)
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0)

  const filteredSearchItems = availableItems.filter(item => 
    item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.variant.color.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      {/* MODAL DE RECHERCHE MANUELLE */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h3 className="font-black text-indigo-800 text-lg">Recherche Manuelle d'Article</h3>
              <button onClick={() => setIsSearchModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 font-bold">✕</button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icons.Search /></div>
                <input 
                  type="text" autoFocus
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Chercher par nom, couleur, code..." 
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                {filteredSearchItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleScan(undefined, item.barcode)}
                    className="cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all flex gap-3 items-center shadow-sm"
                  >
                    {item.variant.imagePath ? (
                      <img src={item.variant.imagePath.startsWith('http') ? item.variant.imagePath : `file://${item.variant.imagePath}`} alt="product" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center"><Icons.Barcode /></div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-500 truncate">{item.variant.color} • {item.variant.size}</p>
                      <p className="font-mono text-[10px] text-indigo-600 mt-1 truncate">{item.barcode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERFACE PRINCIPALE */}
      <div className="max-w-7xl mx-auto h-[85vh] flex gap-6 animate-in fade-in duration-500">

        {/* ==========================================
            GAUCHE : Panier Actuel
        ========================================== */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Panier Actuel (Caisse)</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setCart([]); localStorage.removeItem('pos_cart') }}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                Vider le panier
              </button>
              <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-xs font-bold">
                {cart.length} article(s)
              </span>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="font-medium text-lg">Le panier est vide</p>
                <p className="text-sm mt-1">Scannez un code-barres ou recherchez un article.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {item.imagePath ? (
                        <img src={item.imagePath.startsWith('http') ? item.imagePath : `file://${item.imagePath}`} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.barcode} • {item.color} ({item.size})</p>
                      <span className={`mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.transactionType === 'Vente' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.transactionType}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <input 
                          type="number" 
                          value={item.price === 0 ? '' : item.price} 
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          className="w-20 text-right font-black text-slate-800 text-lg bg-transparent outline-none p-1 appearance-none"
                          title="Modifier le prix"
                        />
                        <span className="font-bold text-slate-500 pr-2 text-sm">DH</span>
                      </div>
                      <button onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Retirer l'article">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            DROITE : Scanner et Paiement
        ========================================== */}
        <div className="w-[400px] flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center"><Icons.Barcode /> Scanner Code-Barres</span>
              <button onClick={openSearchModal} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded">
                <Icons.Search /> <span className="text-[10px]">Manuelle</span>
              </button>
            </h3>
            <form onSubmit={handleScan} className="flex gap-2">
              <input 
                type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: TAK-MLI-ROU-STD-..."
                className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-sm"
              />
              <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">OK</button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Résumé</h3>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-500 font-medium">Sous-total</span>
              <span className="font-bold text-slate-700">{total} DH</span>
            </div>
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
              <span className="text-slate-500 font-medium">TVA (0%)</span>
              <span className="font-bold text-slate-700">0 DH</span>
            </div>
            <div className="flex justify-between items-end mb-8 mt-auto">
              <span className="text-2xl font-bold text-slate-800">Total</span>
              <span className="text-5xl font-black text-indigo-600 tracking-tight">
                {total} <span className="text-2xl text-indigo-400">DH</span>
              </span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {isLoading ? 'Traitement...' : 'Encaisser'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}