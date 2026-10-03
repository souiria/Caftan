import { useState, useEffect } from 'react'
import Barcode from 'react-barcode'

const Icons = {
  Search: () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Alert: () => <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Check: () => <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Calendar: () => <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}

// Fonction pour obtenir la date locale au bon format (YYYY-MM-DD)
const getLocalDateString = (date: Date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

export default function RentalsScreen() {
  const [rentals, setRentals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [printData, setPrintData] = useState<any>(null)

  // Grille de Stock (Dépendant des dates)
  const [availableStock, setAvailableStock] = useState<any[]>([])
  const [stockSearch, setStockSearch] = useState('')

  // Formulaire de réservation
  const [scannedItem, setScannedItem] = useState<any>(null)
  const [cin, setCin] = useState('')
  const [fullName, setFullName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')

  // Formulaire de retour
  const [selectedRental, setSelectedRental] = useState<any>(null)
  const [confirmCin, setConfirmCin] = useState('')
  const [lateFee, setLateFee] = useState(0)

  useEffect(() => { loadRentals() }, [])

  const loadRentals = async () => {
    try {
      const data = await (window as any).api.getActiveRentals()
      setRentals(data)
    } catch (error) { console.error("Erreur", error) }
  }

  // ==========================================
  // GESTION DES DATES & DU STOCK
  // ==========================================
  const loadAvailableStock = async (start: string, end: string) => {
    if (!start || !end) return
    try {
      const stock = await (window as any).api.getAvailableRentStock({ startDate: start, endDate: end })
      setAvailableStock(stock)
      // Si l'article sélectionné n'est plus dans la liste disponible, on l'enlève du panier
      if (scannedItem && !stock.find((s: any) => s.id === scannedItem.id)) {
        setScannedItem(null)
      }
    } catch (error) { console.error("Erreur de chargement du stock", error) }
  }

  const openBookingModal = () => {
    setIsBookingModalOpen(true)
    resetBookingForm()
    
    // Initialise avec Aujourd'hui et Demain (En heure locale pour éviter les décalages)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startStr = getLocalDateString(today)
    const endStr = getLocalDateString(tomorrow)
    
    setStartDate(startStr)
    setEndDate(endStr)
    loadAvailableStock(startStr, endStr)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value
    setStartDate(newStart)
    if (endDate && new Date(newStart) > new Date(endDate)) {
      setEndDate(newStart)
      loadAvailableStock(newStart, newStart)
    } else if (endDate) {
      loadAvailableStock(newStart, endDate)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value
    setEndDate(newEnd)
    if (startDate) loadAvailableStock(startDate, newEnd)
  }

  const selectStockItem = (item: any) => {
    setScannedItem(item)
    setTotalPrice(item.variant.rentPrice || '')
  }

  const filteredStock = availableStock.filter(item => 
    item.barcode.toLowerCase().includes(stockSearch.toLowerCase()) ||
    item.variant.product.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    item.variant.color.toLowerCase().includes(stockSearch.toLowerCase())
  )

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scannedItem || !cin || !fullName || !startDate || !endDate) return alert("Veuillez remplir tous les champs.")
    if (new Date(startDate) > new Date(endDate)) return alert("La date de retour doit être après la date de sortie.")
    
    setIsLoading(true)
    try {
      await (window as any).api.createRental({
        cin: cin.trim().toUpperCase(), // On passe en majuscule au moment de l'enregistrement uniquement
        fullName: fullName.trim(), 
        startDate, 
        endDate, 
        totalAmount: Number(totalPrice), 
        advanceAmount: Number(advanceAmount), 
        stockItemId: scannedItem.id
      })
      alert("Location enregistrée avec succès !")
      setIsBookingModalOpen(false)
      await loadRentals()
    } catch (error: any) { alert("Erreur : " + error.message) }
    finally { setIsLoading(false) }
  }

  const resetBookingForm = () => {
    setScannedItem(null); setCin(''); setFullName('');
    setTotalPrice(''); setAdvanceAmount(''); setStockSearch(''); setAvailableStock([])
  }

  // ==========================================
  // RETOUR D'ARTICLE
  // ==========================================
  const openReturnModal = (rental: any) => {
    setSelectedRental(rental); setConfirmCin('');
    const expectedReturn = new Date(rental.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0); expectedReturn.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - expectedReturn.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    setLateFee(diffDays > 0 ? diffDays * 50 : 0) // 50 DH de pénalité par jour par défaut
    setIsReturnModalOpen(true)
  }

  const handleReturnItem = async (e: React.FormEvent) => {
    e.preventDefault()
    // Comparaison insensible à la casse
    if (confirmCin.trim().toUpperCase() !== selectedRental.customer.cin.toUpperCase()) {
      return alert("ERREUR : La CIN saisie ne correspond pas à celle du client !")
    }

    setIsLoading(true)
    try {
      await (window as any).api.returnRental({ reservationId: selectedRental.id, stockItemId: selectedRental.items[0].stockItemId, lateFee: Number(lateFee) })
      alert("Retour validé ! L'article est de nouveau DISPONIBLE en stock.")
      setPrintData({ barcode: selectedRental.items[0].stockItem.barcode, productName: selectedRental.items[0].stockItem.variant.product.name, color: selectedRental.items[0].stockItem.variant.color })
      setIsReturnModalOpen(false)
      await loadRentals()
      setTimeout(() => { window.print(); setPrintData(null) }, 500)
    } catch (error: any) { alert("Erreur : " + error.message) }
    finally { setIsLoading(false) }
  }

  return (
    <>
      {/* IMPRESSION DU CODE-BARRES RETOUR */}
      {printData && (
        <div className="hidden print:block absolute inset-0 bg-white z-[99999] text-black">
          <style>{`@media print { @page { size: A4; margin: 10mm; } body, html { background: white !important; } }`}</style>
          <div className="flex flex-col items-center justify-center p-10 border border-dashed border-slate-400 rounded-xl max-w-xs mx-auto mt-10">
            <span className="text-sm font-black text-center uppercase mb-1">{printData.productName}</span>
            <span className="text-[11px] font-bold text-slate-600 mb-2">RETOUR LOCATION • {printData.color}</span>
            <Barcode value={printData.barcode} width={1.5} height={50} fontSize={14} background="transparent" />
          </div>
        </div>
      )}

      {/* L'APPLICATION NORMALE */}
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10 print:hidden relative">
        
        {/* ==========================================
            MODAL NOUVELLE LOCATION (DATES + GRILLE + FORM)
        ========================================== */}
        {isBookingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* HEADER */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                <h3 className="font-black text-indigo-800 text-lg">Nouvelle Réservation</h3>
                <button onClick={() => setIsBookingModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 font-bold">✕</button>
              </div>

              {/* BARRE DES DATES */}
              <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex items-center gap-6 shadow-sm z-10 relative">
                <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                  <Icons.Calendar />
                  <span>1. Choisissez la période :</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Sortie</label>
                    <input type="date" value={startDate} onChange={handleStartDateChange} className="p-2 rounded-lg border border-slate-300 font-medium outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Retour</label>
                    <input type="date" value={endDate} onChange={handleEndDateChange} min={startDate} className="p-2 rounded-lg border border-slate-300 font-medium outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-1 overflow-hidden">
                {/* COLONNE GAUCHE : GRILLE DE STOCK */}
                <div className="w-1/2 border-r border-slate-100 bg-slate-50 flex flex-col">
                  <div className="p-4 border-b border-slate-200 shrink-0">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icons.Search /></div>
                      <input 
                        type="text" value={stockSearch} onChange={e => setStockSearch(e.target.value)} 
                        placeholder="Chercher code, produit, couleur..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto">
                    {filteredStock.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <p className="font-medium text-lg">Aucun article disponible</p>
                        <p className="text-sm mt-1">Tout est réservé ou vendu pour ces dates.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {filteredStock.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => selectStockItem(item)}
                            className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex gap-3 items-center ${scannedItem?.id === item.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                          >
                            {item.variant.imagePath ? (
                              <img src={`file://${item.variant.imagePath}`} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0" />
                            )}
                            <div className="overflow-hidden">
                              <p className="font-bold text-sm text-slate-800 truncate">{item.variant.product.name}</p>
                              <p className="text-xs text-slate-500 truncate">{item.variant.color} • {item.variant.size}</p>
                              <p className="font-mono text-[10px] text-indigo-600 mt-1 truncate">{item.barcode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLONNE DROITE : FORMULAIRE CLIENT & PAIEMENT */}
                <div className="w-1/2 p-6 overflow-y-auto bg-white flex flex-col">
                  {!scannedItem ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p className="font-medium text-lg">2. Choisissez un article</p>
                      <p className="text-sm">Cliquez sur un caftan dans la grille à gauche.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateRental} className="flex flex-col h-full">
                      <div className="flex gap-4 items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 mb-6 shrink-0">
                        <Icons.Check />
                        <div>
                          <p className="font-bold text-lg">{scannedItem.variant.product.name} ({scannedItem.variant.color})</p>
                          <p className="text-sm font-mono text-emerald-600">{scannedItem.barcode}</p>
                        </div>
                      </div>

                      <div className="space-y-6 flex-1">
                        <div>
                          <h4 className="font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">3. Informations Client</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">CIN Client</label>
                              {/* 🔴 CORRECTION DU BUG ICI : Plus de .toUpperCase() dans le onChange */}
                              <input type="text" required autoFocus value={cin} onChange={e => setCin(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1 font-mono uppercase" placeholder="Ex: AB123456" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Nom Complet</label>
                              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-800 border-b border-slate-100 pb-2 mb-4">4. Facturation</h4>
                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Prix Total (DH)</label><input type="number" required value={totalPrice} onChange={e => setTotalPrice(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1 font-bold text-lg text-slate-800" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Avance Payée (DH)</label><input type="number" required value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} max={totalPrice || 99999} className="w-full p-2.5 rounded-lg border border-emerald-300 mt-1 font-bold text-lg text-emerald-700 bg-emerald-50 focus:border-emerald-500 outline-none" /></div>
                          </div>
                        </div>
                      </div>

                      <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg mt-6 shrink-0">
                        {isLoading ? 'Enregistrement...' : 'Confirmer la Réservation'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL RETOUR D'ARTICLE (Identique) */}
        {isReturnModalOpen && selectedRental && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                <h3 className="font-black text-lg">Retour d'Article</h3>
                <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>
              
              <form onSubmit={handleReturnItem} className="p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                  <p className="text-slate-500 mb-1">Article loué : <span className="font-bold text-slate-800">{selectedRental.items[0].stockItem.variant.product.name}</span></p>
                  <p className="text-slate-500">Date prévue : <span className="font-bold text-slate-800">{new Date(selectedRental.endDate).toLocaleDateString('fr-FR')}</span></p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Vérification de sécurité</label>
                  {/* 🔴 CORRECTION DU BUG ICI : Plus de .toUpperCase() dans le onChange */}
                  <input type="text" required autoFocus value={confirmCin} onChange={e => setConfirmCin(e.target.value)} placeholder="Saisir la CIN du client" className="w-full p-3 rounded-xl border border-slate-300 mt-1 font-mono text-center tracking-widest text-lg focus:border-slate-800 uppercase" />
                  <p className="text-xs text-slate-400 text-center mt-2">La CIN doit correspondre à <b>{selectedRental.customer.cin}</b></p>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Reste à payer initial :</span>
                    <span className="font-bold text-slate-800">{selectedRental.remainingAmount} DH</span>
                  </div>
                  <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-sm font-bold text-red-600 flex items-center gap-2"><Icons.Alert /> Pénalité de retard (DH)</span>
                    <input type="number" min="0" value={lateFee} onChange={e => setLateFee(Number(e.target.value))} className="w-24 p-1 rounded border border-red-200 text-right font-bold text-red-600 bg-white outline-none" />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-black text-slate-800">Total à encaisser :</span>
                    <span className="text-2xl font-black text-indigo-600">{(selectedRental.remainingAmount || 0) + (lateFee || 0)} DH</span>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg mt-6">
                  {isLoading ? 'Traitement...' : 'Valider le retour et imprimer Code-Barres'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800">Locations & Retours</h2>
            <p className="text-slate-500 mt-1">Gérez les sorties, les retours et les retards en temps réel.</p>
          </div>
          <button onClick={openBookingModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Location
          </button>
        </div>

        {/* TABLEAU DES LOCATIONS ACTIVES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="p-4">Client</th>
                <th className="p-4">Article (Code)</th>
                <th className="p-4">Date Sortie</th>
                <th className="p-4">Date Retour Prévue</th>
                <th className="p-4 text-right">Reste à Payer</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rentals.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Aucune location en cours.</td></tr>
              ) : (
                rentals.map((rental) => {
                  const isLate = new Date() > new Date(rental.endDate)
                  return (
                    <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 uppercase">{rental.customer.fullName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">CIN: {rental.customer.cin}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{rental.items[0].stockItem.variant.product.name}</p>
                        <p className="font-mono text-xs text-indigo-600 mt-0.5">{rental.items[0].stockItem.barcode}</p>
                      </td>
                      <td className="p-4 text-slate-600">{new Date(rental.startDate).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4">
                        <span className={`font-bold ${isLate ? 'text-red-600' : 'text-slate-800'}`}>
                          {new Date(rental.endDate).toLocaleDateString('fr-FR')}
                        </span>
                        {isLate && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-black tracking-wide">Retard</span>}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">{rental.remainingAmount} DH</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">En cours</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => openReturnModal(rental)} className="bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
                          Retourner
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}