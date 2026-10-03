import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const Icons = {
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Barcode: () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>,
  User: () => <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}

type CartItem = { barcode: string; name: string; color: string; size: string; price: number; transactionType: 'Vente' | 'Location'; imagePath?: string | null }

export default function POSScreen() {
  const currentUser = JSON.parse(sessionStorage.getItem('caftan_current_user') || '{}')

  const [barcode, setBarcode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [customersList, setCustomersList] = useState<any[]>([])
  
  // 🔴 NOUVEAU : État pour le ticket de caisse et les infos de la boutique
  const [companyInfo, setCompanyInfo] = useState<any>({})
  const [receiptData, setReceiptData] = useState<any>(null)

  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = sessionStorage.getItem('pos_cart')
    return savedCart ? JSON.parse(savedCart) : []
  })

  useEffect(() => { 
    sessionStorage.setItem('pos_cart', JSON.stringify(cart)) 
  }, [cart])

  // Charger les clients ET les infos de la boutique au démarrage
  useEffect(() => {
    const fetchData = async () => {
      try {
        if ((window as any).api.getCustomers) {
          const custData = await (window as any).api.getCustomers()
          setCustomersList(custData)
        }
        if ((window as any).api.getCompany) {
          const compData = await (window as any).api.getCompany()
          setCompanyInfo(compData || { name: 'MA BOUTIQUE' })
        }
      } catch (error) { console.error("Erreur", error) }
    }
    fetchData()
  }, [])

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TPE' | 'ON_DELIVERY'>('CASH')
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('')
  const [customer, setCustomer] = useState({ id: '', fullName: '', phone: '', email: '', city: '' })
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableItems, setAvailableItems] = useState<any[]>([])

  const handleScan = async (e?: React.FormEvent, manualBarcode?: string) => {
    if (e) e.preventDefault()
    const targetBarcode = manualBarcode || barcode.trim()
    if (!targetBarcode) return

    if (cart.find(item => item.barcode === targetBarcode)) return toast.error("Cet article est déjà dans le panier !"), setBarcode('')

    try {
      const itemData = await (window as any).api.getItemByBarcode(targetBarcode)
      if (!itemData) return toast.error("Code-barres introuvable !"), setBarcode('')
      if (itemData.status !== 'AVAILABLE') return toast.error(`Article non disponible (${itemData.status})`), setBarcode('')

      const variant = itemData.variant
      const itemPrice = itemData.stockType === 'SALE' ? (variant.salePrice || 0) : (variant.rentPrice || 0)

      setCart([...cart, {
        barcode: itemData.barcode, name: `${variant.product.name} (${variant.product.type})`,
        color: variant.color, size: variant.size, price: itemPrice,
        transactionType: itemData.stockType === 'SALE' ? 'Vente' : 'Location',
        imagePath: variant.imagePath || null
      }])
      setBarcode(''); setIsSearchModalOpen(false) 
    } catch (error) { toast.error("Erreur de scan.") }
  }

  const openSearchModal = async () => {
    setIsSearchModalOpen(true); setSearchTerm('')
    try {
      const data = await (window as any).api.getProducts()
      const itemsList: any[] = []
      data.forEach((p: any) => p.variants.forEach((v: any) => v.stockItems.forEach((s: any) => { if (s.status === 'AVAILABLE') itemsList.push({ ...s, variant: v, product: p }) })))
      setAvailableItems(itemsList)
    } catch (error) { toast.error("Impossible de charger le stock.") }
  }

  const subTotal = cart.reduce((sum, item) => sum + item.price, 0)
  const discountAmount = subTotal * (discountPercent / 100)
  const finalTotal = subTotal - discountAmount
  const remainingToPay = paymentMethod === 'ON_DELIVERY' ? Math.max(0, finalTotal - (Number(advanceAmount) || 0)) : 0

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!currentUser.id) return toast.error("Aucun utilisateur connecté.")
    if (paymentMethod === 'ON_DELIVERY' && (!advanceAmount || Number(advanceAmount) < 0)) return toast.error("Veuillez saisir une avance valide.")
    if (paymentMethod === 'ON_DELIVERY' && !customer.fullName) return toast.error("Le client est obligatoire pour une livraison.")

    setIsLoading(true)
    try {
      const sale = await (window as any).api.createSale({
        items: cart.map(c => ({ barcode: c.barcode, price: c.price, stockType: c.transactionType === 'Vente' ? 'SALE' : 'RENT' })),
        totalAmount: subTotal,
        discountPercent: discountPercent,
        advanceAmount: advanceAmount || 0,
        paymentMethod: paymentMethod,
        customer: customer.fullName ? customer : null,
        userId: currentUser.id
      })

      // 🔴 PRÉPARATION DU TICKET DE CAISSE
      setReceiptData({
        ticketNumber: sale.ticketNumber,
        date: new Date(),
        items: [...cart],
        subTotal,
        discountAmount,
        finalTotal,
        paymentMethod,
        advanceAmount: advanceAmount || finalTotal,
        remainingToPay,
        customerName: customer.fullName,
        cashier: currentUser.username
      })

      toast.success("Encaissé avec succès !")
      
      // Réinitialisation de l'écran (derrière le ticket)
      setCart([])
      setCustomer({ id: '', fullName: '', phone: '', email: '', city: '' })
      setDiscountPercent(0); setAdvanceAmount(''); setPaymentMethod('CASH')
      sessionStorage.removeItem('pos_cart') 
      
      if ((window as any).api.getCustomers) {
        setCustomersList(await (window as any).api.getCustomers())
      }

      // 🔴 DÉCLENCHEMENT DE L'IMPRESSION (Laisse une demi-seconde à React pour afficher le ticket caché)
      setTimeout(() => {
        window.print()
        setReceiptData(null) // Ferme le ticket une fois imprimé
      }, 500)

    } catch (error: any) { toast.error("Erreur lors de l'encaissement : " + error.message) } 
    finally { setIsLoading(false) }
  }

  const filteredSearchItems = availableItems.filter(item => 
    item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) || item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.variant.color.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      {/* ========================================================
          TICKET DE CAISSE THERMIQUE (Caché sur l'écran, visible à l'impression)
      ======================================================== */}
      {receiptData && (
        <div className="hidden print:block absolute inset-0 bg-white z-[99999] text-black">
          <style>{`
            @media print { 
              @page { size: 80mm auto; margin: 0; } 
              body, html { background: white !important; padding: 0; margin: 0; }
              * { color: black !important; font-family: monospace; }
            }
          `}</style>
          
          <div className="w-[72mm] mx-auto pt-4 pb-10 text-sm">
            {/* EN TÊTE */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-black uppercase mb-1">{companyInfo.name || 'CAFTAN STORE'}</h1>
              {companyInfo.address && <p className="text-xs">{companyInfo.address}</p>}
              {companyInfo.phone && <p className="text-xs">Tél: {companyInfo.phone}</p>}
              {companyInfo.ice && <p className="text-[10px] mt-1">ICE: {companyInfo.ice}</p>}
            </div>

            <div className="border-b border-dashed border-black mb-4"></div>

            {/* INFOS TICKET */}
            <div className="text-xs mb-4">
              <p>Ticket N° : {receiptData.ticketNumber}</p>
              <p>Date : {receiptData.date.toLocaleDateString('fr-FR')} à {receiptData.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}</p>
              <p>Caissier : {receiptData.cashier}</p>
              {receiptData.customerName && <p>Client : {receiptData.customerName}</p>}
            </div>

            <div className="border-b border-dashed border-black mb-4"></div>

            {/* ARTICLES */}
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left pb-1">Article</th>
                  <th className="text-right pb-1">Prix</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1">
                      {item.name}
                      <br/>
                      <span className="text-[10px]">{item.barcode}</span>
                    </td>
                    <td className="text-right align-top py-1 font-bold">{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-black mb-2"></div>

            {/* TOTAUX */}
            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span>Sous-total:</span>
                <span>{receiptData.subTotal} DH</span>
              </div>
              {receiptData.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Remise:</span>
                  <span>- {receiptData.discountAmount} DH</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black mt-2">
                <span>TOTAL A PAYER:</span>
                <span>{receiptData.finalTotal} DH</span>
              </div>

              {/* LIVRAISON (Si applicable) */}
              {receiptData.paymentMethod === 'ON_DELIVERY' && (
                <div className="mt-4 pt-2 border-t border-black text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Avance payée:</span>
                    <span>{receiptData.advanceAmount} DH</span>
                  </div>
                  <div className="flex justify-between font-black text-sm mt-1">
                    <span>RESTE A LA LIVRAISON:</span>
                    <span>{receiptData.remainingToPay} DH</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-black mb-4"></div>

            {/* MESSAGE FIN */}
            <div className="text-center text-xs space-y-2">
              <p>{companyInfo.message || 'Merci de votre visite et à très bientôt !'}</p>
              <p>----------------------</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECHERCHE */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h3 className="font-black text-indigo-800 text-lg">Recherche Manuelle d'Article</h3>
              <button onClick={() => setIsSearchModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 font-bold">✕</button>
            </div>
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icons.Search /></div>
                <input type="text" autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Chercher..." className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-800" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                {filteredSearchItems.map(item => (
                  <div key={item.id} onClick={() => handleScan(undefined, item.barcode)} className="cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all flex gap-3 items-center shadow-sm">
                    {item.variant.imagePath ? <img src={`file://${item.variant.imagePath}`} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" /> : <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center"><Icons.Barcode /></div>}
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

      {/* INTERFACE PRINCIPALE (Masquée pendant l'impression) */}
      <div className="max-w-[1400px] mx-auto h-[85vh] flex gap-6 animate-in fade-in duration-500 print:hidden">

        {/* GAUCHE : Panier */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Panier Actuel</h2>
            <button onClick={() => { setCart([]); sessionStorage.removeItem('pos_cart') }} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Vider le panier</button>
          </div>
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Icons.Search /> <p className="mt-2 font-medium">Panier vide</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-lg">{item.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.barcode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <input type="number" value={item.price} onChange={(e) => { const newCart = [...cart]; newCart[index].price = Number(e.target.value); setCart(newCart) }} className="w-20 text-right font-black text-slate-800 text-lg bg-transparent outline-none p-1" />
                        <span className="font-bold text-slate-500 pr-2 text-sm">DH</span>
                      </div>
                      <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="p-2 text-slate-300 hover:text-red-500"><Icons.Barcode /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DROITE : Scanner, Client et Paiement */}
        <div className="w-[450px] flex flex-col gap-4 overflow-y-auto pr-2 pb-10">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex justify-between items-center">
              Scanner <button onClick={openSearchModal} className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-[10px]">Manuelle</button>
            </h3>
            <form onSubmit={handleScan} className="flex gap-2">
              <input type="text" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Code-barres..." className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500" />
              <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl font-bold">OK</button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center"><Icons.User /> Fiche Client</h3>
              <button onClick={() => setShowCustomerForm(!showCustomerForm)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {showCustomerForm ? 'Masquer' : 'Gérer Client'}
              </button>
            </div>
            
            {showCustomerForm && (
              <div className="grid grid-cols-2 gap-3 mt-4 animate-in slide-in-from-top-2">
                <div className="col-span-2">
                  <select 
                    className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-indigo-50/50 font-bold text-indigo-700"
                    value={customer.id || 'NEW'}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setCustomer({ id: '', fullName: '', phone: '', email: '', city: '' })
                      } else {
                        const selected = customersList.find(c => c.id === e.target.value)
                        if (selected) setCustomer({ id: selected.id, fullName: selected.fullName, phone: selected.phone || '', email: selected.email || '', city: selected.city || '' })
                      }
                    }}
                  >
                    <option value="NEW">+ CRÉER UN NOUVEAU CLIENT</option>
                    <optgroup label="Clients Existants">
                      {customersList.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName} {c.phone ? `(${c.phone})` : ''}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="col-span-2">
                  <input type="text" placeholder="Nom Complet *" disabled={!!customer.id} required={paymentMethod === 'ON_DELIVERY'} value={customer.fullName} onChange={e => setCustomer({...customer, fullName: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div><input type="text" placeholder="Téléphone" disabled={!!customer.id} value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" /></div>
                <div><input type="text" placeholder="Ville" disabled={!!customer.id} value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" /></div>
                <div className="col-span-2"><input type="email" placeholder="Email" disabled={!!customer.id} value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" /></div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
              <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${paymentMethod === 'CASH' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Espèces</button>
              <button onClick={() => setPaymentMethod('TPE')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${paymentMethod === 'TPE' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>TPE (Carte)</button>
              <button onClick={() => { setPaymentMethod('ON_DELIVERY'); setShowCustomerForm(true); }} className={`flex-1 py-2 text-xs font-bold rounded-lg ${paymentMethod === 'ON_DELIVERY' ? 'bg-orange-500 shadow text-white' : 'text-slate-500'}`}>Livraison</button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Sous-total</span><span className="font-bold text-slate-700">{subTotal} DH</span>
              </div>
              
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Remise (%)</span>
                <input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} className="w-16 p-1 text-right font-bold text-red-500 bg-red-50 rounded outline-none" />
              </div>

              {paymentMethod === 'ON_DELIVERY' && (
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-orange-600 font-bold">Avance (DH)</span>
                  <input type="number" min="0" max={finalTotal} value={advanceAmount} onChange={e => setAdvanceAmount(Number(e.target.value))} placeholder="Montant" className="w-24 p-1.5 text-right font-black text-orange-600 bg-orange-50 border border-orange-200 rounded-lg outline-none" />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-end mb-6">
              <span className="text-xl font-bold text-slate-800">{paymentMethod === 'ON_DELIVERY' ? 'Reste à payer' : 'Total Net'}</span>
              <span className={`text-4xl font-black tracking-tight ${paymentMethod === 'ON_DELIVERY' ? 'text-orange-600' : 'text-indigo-600'}`}>
                {paymentMethod === 'ON_DELIVERY' ? remainingToPay : finalTotal} <span className="text-lg">DH</span>
              </span>
            </div>

            <button onClick={handleCheckout} disabled={cart.length === 0 || isLoading} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg disabled:bg-slate-300 ${paymentMethod === 'ON_DELIVERY' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
              {isLoading ? 'Impression en cours...' : (paymentMethod === 'ON_DELIVERY' ? 'Valider et Imprimer' : 'Encaisser et Imprimer')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}