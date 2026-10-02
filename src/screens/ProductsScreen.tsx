import { useState, useEffect, useMemo } from 'react'
import Barcode from 'react-barcode'
import toast from 'react-hot-toast'

const Icons = {
  Plus: () => <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Image: () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Print: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  Transfer: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  Alert: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Settings: () => <svg className="w-4 h-4 text-slate-500 hover:text-indigo-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}

type VariantForm = { color: string; size: string; quantity: number; imagePath: string; previewUrl: string }
type StockItem = { id: string; barcode: string; variantId: string; stockType: string; status: string }
type ProductVariant = { id: string; productId: string; color: string; size: string; purchasePrice: number | null; salePrice: number | null; rentPrice: number | null; priceStatus: string; imagePath: string | null; stockItems: StockItem[] }
type Product = { id: string; name: string; type: string; description: string | null; variants: ProductVariant[] }

export default function ProductsScreen() {
  const currentUser = JSON.parse(sessionStorage.getItem('caftan_current_user') || localStorage.getItem('caftan_current_user') || '{}')
  const currentUserRole = currentUser.role || 'USER'

  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const [dbCategories, setDbCategories] = useState<{id: string, name: string}[]>([])
  const [dbFabrics, setDbFabrics] = useState<{id: string, name: string}[]>([])
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'CATEGORY' | 'FABRIC'>('CATEGORY')
  const [newItemName, setNewItemName] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [stockType, setStockType] = useState('SALE')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [rentPrice, setRentPrice] = useState('')
  const [variants, setVariants] = useState<VariantForm[]>([{ color: '', size: 'Standard', quantity: 1, imagePath: '', previewUrl: '' }])

  const [editingVariant, setEditingVariant] = useState<any>(null)
  const [editData, setEditData] = useState({ purchasePrice: '', salePrice: '', rentPrice: '', quantity: 1, imagePath: '', previewUrl: '' })
  
  const [transferVariant, setTransferVariant] = useState<ProductVariant | null>(null)
  const [transferQty, setTransferQty] = useState(1)
  const [transferDirection, setTransferDirection] = useState('SALE_TO_RENT')

  const [printData, setPrintData] = useState<{product: Product, variant: ProductVariant, items: StockItem[]} | null>(null)
  const [showMissingPriceFilter, setShowMissingPriceFilter] = useState(false)

  useEffect(() => { 
    loadProducts()
    loadDropdownSettings()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await (window as any).api.getProducts()
      setProducts(data)
    } catch (error) { console.error('Erreur produits', error) }
  }

  const loadDropdownSettings = async () => {
    try {
      if (!(window as any).api.getCategories) return;
      const cats = await (window as any).api.getCategories()
      const fabs = await (window as any).api.getFabrics()
      setDbCategories(cats)
      setDbFabrics(fabs)
      
      if (cats.length > 0) setName(prev => prev || cats[0].name)
      if (fabs.length > 0) setType(prev => prev || fabs[0].name)
    } catch (error) { console.error('Erreur chargement paramètres', error) }
  }

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      if (settingsTab === 'CATEGORY') {
        await (window as any).api.addCategory(newItemName.trim())
        toast.success("Catégorie ajoutée !")
      } else {
        await (window as any).api.addFabric(newItemName.trim())
        toast.success("Tissu ajouté !")
      }
      setNewItemName('')
      await loadDropdownSettings()
    } catch (error) {
      toast.error("Erreur, ce nom existe peut-être déjà.")
    }
  }

  const handleDeleteSetting = async (id: string, tab: 'CATEGORY' | 'FABRIC') => {
    if (!window.confirm("Supprimer cet élément de la liste de choix ? (Les anciens produits le garderont)")) return
    try {
      if (tab === 'CATEGORY') {
        await (window as any).api.deleteCategory(id)
      } else {
        await (window as any).api.deleteFabric(id)
      }
      toast.success("Élément supprimé !")
      await loadDropdownSettings()
    } catch (error) { toast.error("Erreur de suppression.") }
  }

  const tableRows = useMemo(() => {
    const rows: any[] = []
    products.forEach(p => {
      p.variants?.forEach(v => {
        const saleItems = v.stockItems?.filter(i => i.stockType === 'SALE') || []
        const rentItems = v.stockItems?.filter(i => i.stockType === 'RENT') || []
        
        if (saleItems.length > 0) rows.push({ product: p, variant: v, stockType: 'SALE', items: saleItems })
        if (rentItems.length > 0) rows.push({ product: p, variant: v, stockType: 'RENT', items: rentItems })
        if (saleItems.length === 0 && rentItems.length === 0) rows.push({ product: p, variant: v, stockType: 'AUCUN', items: [] })
      })
    })
    return rows
  }, [products])

  const filteredRows = useMemo(() => {
    return tableRows.filter(row => {
      if (showMissingPriceFilter && currentUserRole === 'SUPER_ADMIN') {
        return !row.variant.purchasePrice || row.variant.purchasePrice <= 0;
      }
      return true;
    })
  }, [tableRows, showMissingPriceFilter, currentUserRole])

  const availableForTransfer = transferVariant?.stockItems.filter((i:any) => 
    i.status === 'AVAILABLE' && i.stockType === (transferDirection === 'SALE_TO_RENT' ? 'SALE' : 'RENT')
  ).length || 0

  const handlePrint = (product: Product, variant: ProductVariant, itemsToPrint: StockItem[]) => {
    setPrintData({ product, variant, items: itemsToPrint })
    setTimeout(() => { window.print(); setPrintData(null) }, 500)
  }

  const addVariantRow = () => setVariants([...variants, { color: '', size: 'Standard', quantity: 1, imagePath: '', previewUrl: '' }])
  const removeVariantRow = (index: number) => { const newVariants = [...variants]; newVariants.splice(index, 1); setVariants(newVariants) }
  const updateVariant = (index: number, field: keyof VariantForm, value: string | number) => { const newVariants = [...variants]; newVariants[index] = { ...newVariants[index], [field]: value }; setVariants(newVariants) }
  
  const handleImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const newVariants = [...variants]
      newVariants[index] = { ...newVariants[index], imagePath: (file as any).path || '', previewUrl: URL.createObjectURL(file) }
      setVariants(newVariants)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (variants.length === 0) return toast.error('Veuillez ajouter au moins une variante.')
    if (!name) return toast.error("Veuillez sélectionner un nom de produit.")
    if (!type) return toast.error("Veuillez sélectionner un type de tissu.")

    // 🔴 VÉRIFICATION DU PRIX OBLIGATOIRE POUR TOUS LES UTILISATEURS
    if (stockType === 'SALE' && (!salePrice || Number(salePrice) <= 0)) {
      return toast.error("Le prix de vente est obligatoire pour un article destiné à la vente.")
    }
    if (stockType === 'RENT' && (!rentPrice || Number(rentPrice) <= 0)) {
      return toast.error("Le prix de location est obligatoire pour un article destiné à la location.")
    }

    setIsLoading(true)

    try {
      const newProduct = await (window as any).api.createProduct({ name: name.trim(), type: type.trim(), description: description || null })
      const pCode = name.substring(0, 3).toUpperCase()
      const tCode = type.substring(0, 3).toUpperCase()

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        let savedImagePath = v.imagePath
        if (v.imagePath && !v.imagePath.startsWith('http')) {
          savedImagePath = await (window as any).api.saveImageLocally(v.imagePath)
        }
        const cCode = v.color.substring(0, 3).toUpperCase()
        const sCode = v.size.substring(0, 3).toUpperCase()
        const barcodePrefix = `${pCode}-${tCode}-${cCode}-${sCode}-${Date.now()}-${i + 1}`

        await (window as any).api.createVariant({
          productId: newProduct.id, barcodePrefix, color: v.color, size: v.size, quantity: Number(v.quantity), stockType, imagePath: savedImagePath,
          purchasePrice: purchasePrice.trim() !== '' ? Number(purchasePrice) : null,
          salePrice: salePrice.trim() !== '' ? Number(salePrice) : null,
          rentPrice: rentPrice.trim() !== '' ? Number(rentPrice) : null
        })
      }
      toast.success('Produit généré avec succès !')
      setVariants([{ color: '', size: 'Standard', quantity: 1, imagePath: '', previewUrl: '' }])
      setPurchasePrice(''); setSalePrice(''); setRentPrice('');
      await loadProducts()
    } catch (error: any) { 
      toast.error('Erreur : ' + error.message) 
    } finally { 
      setIsLoading(false) 
    }
  }

  const openEditModal = (v: ProductVariant) => {
    setEditingVariant(v)
    setEditData({
      purchasePrice: v.purchasePrice ? String(v.purchasePrice) : '',
      salePrice: v.salePrice ? String(v.salePrice) : '',
      rentPrice: v.rentPrice ? String(v.rentPrice) : '',
      quantity: v.stockItems?.length || 0,
      imagePath: v.imagePath || '',
      previewUrl: v.imagePath ? (v.imagePath.startsWith('http') ? v.imagePath : `file://${v.imagePath}`) : ''
    })
  }

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setEditData({ ...editData, imagePath: (file as any).path || '', previewUrl: URL.createObjectURL(file) })
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editData.salePrice || Number(editData.salePrice) <= 0) {
      return toast.error("Le prix de vente ne peut pas être vide ou à zéro.")
    }

    setIsLoading(true)
    try {
      let finalImagePath = editData.imagePath
      if (editData.imagePath && !editData.imagePath.startsWith('http') && !editData.imagePath.includes('uploads')) {
        finalImagePath = await (window as any).api.saveImageLocally(editData.imagePath)
      }
      await (window as any).api.updateVariant({
        variantId: editingVariant.id,
        purchasePrice: editData.purchasePrice.trim() !== '' ? Number(editData.purchasePrice) : null,
        salePrice: editData.salePrice.trim() !== '' ? Number(editData.salePrice) : null,
        rentPrice: editData.rentPrice.trim() !== '' ? Number(editData.rentPrice) : null,
        newQuantity: Number(editData.quantity),
        imagePath: finalImagePath
      })
      toast.success('Produit mis à jour avec succès !')
      setEditingVariant(null)
      await loadProducts()
    } catch (error: any) { 
      toast.error("Erreur :\n" + error.message) 
    } finally { 
      setIsLoading(false) 
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferVariant) return
    if (transferQty <= 0 || transferQty > availableForTransfer) return toast.error("Quantité invalide ou insuffisante.")
    setIsLoading(true)
    try {
      await (window as any).api.transferStock({
        variantId: transferVariant.id, quantity: transferQty,
        fromType: transferDirection === 'SALE_TO_RENT' ? 'SALE' : 'RENT',
        toType: transferDirection === 'SALE_TO_RENT' ? 'RENT' : 'SALE'
      })
      toast.success('Transfert de stock réussi !')
      setTransferVariant(null)
      await loadProducts() 
    } catch (error: any) { 
      toast.error("Erreur de transfert : " + error.message) 
    } finally { 
      setIsLoading(false) 
    }
  }

  return (
    <>
      {isSettingsModalOpen && currentUserRole === 'SUPER_ADMIN' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg">Gestion des Listes</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            
            <div className="flex bg-slate-100 p-2">
              <button onClick={() => setSettingsTab('CATEGORY')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${settingsTab === 'CATEGORY' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Noms (Produits)</button>
              <button onClick={() => setSettingsTab('FABRIC')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${settingsTab === 'FABRIC' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Tissus (Types)</button>
            </div>

            <div className="p-5">
              <form onSubmit={handleAddSetting} className="flex gap-2 mb-6">
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ajouter un élément..." className="flex-1 p-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm font-medium" />
                <button type="submit" className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700">+</button>
              </form>

              <div className="h-64 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50 space-y-1">
                {(settingsTab === 'CATEGORY' ? dbCategories : dbFabrics).length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-10 italic">Aucun élément.</p>
                ) : (
                  (settingsTab === 'CATEGORY' ? dbCategories : dbFabrics).map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 shadow-sm">
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      <button onClick={() => handleDeleteSetting(item.id, settingsTab)} className="text-red-400 hover:text-red-600 p-1"><Icons.Trash /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {printData && (
        <div className="hidden print:block absolute inset-0 bg-white z-[99999] text-black">
          <style>{`@media print { @page { size: A4; margin: 10mm; } body, html, #root { height: auto !important; overflow: visible !important; background: white !important; } .w-64 { display: none !important; } .flex-1 { margin: 0 !important; padding: 0 !important; overflow: visible !important; } }`}</style>
          <div className="grid grid-cols-3 gap-6 p-4">
            {printData.items.map((item) => (
              <div key={item.id} className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-400 break-inside-avoid rounded-xl">
                <span className="text-sm font-black text-center uppercase mb-1">{printData.product.name} - {printData.product.type}</span>
                <span className="text-[11px] font-bold text-slate-600 mb-2">
                  {printData.variant.color} • {printData.variant.size} • {item.stockType === 'SALE' ? 'VENTE' : 'LOCATION'}
                </span>
                <Barcode value={item.barcode} width={1.2} height={40} fontSize={12} background="transparent" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500 relative print:hidden">
        
        {editingVariant && currentUserRole === 'SUPER_ADMIN' && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-slate-800 text-lg">Éditer le produit (ADMIN)</h3>
                <button onClick={() => setEditingVariant(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer">
                    {editData.previewUrl ? <img src={editData.previewUrl} alt="preview" className="w-full h-full object-cover" /> : <Icons.Image />}
                    <input type="file" accept="image/*" onChange={handleEditImageSelect} className="absolute inset-0 opacity-0 cursor-pointer" title="Changer l'image" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Quantité Totale Globale</label>
                      <input type="number" min="0" required value={editData.quantity} onChange={e => setEditData({...editData, quantity: Math.max(0, Number(e.target.value))})} className="w-full p-2 rounded-lg border border-slate-300 mt-1 text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prix Achat (DH)</label>
                    <input type="number" value={editData.purchasePrice} onChange={e => setEditData({...editData, purchasePrice: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 mt-1 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prix Vente (DH) *</label>
                    <input type="number" required value={editData.salePrice} onChange={e => setEditData({...editData, salePrice: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 mt-1 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prix Location (DH)</label>
                    <input type="number" value={editData.rentPrice} onChange={e => setEditData({...editData, rentPrice: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 mt-1 text-sm outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg mt-6">
                  {isLoading ? 'Sauvegarde...' : 'Valider les modifications'}
                </button>
              </form>
            </div>
          </div>
        )}

        {transferVariant && currentUserRole === 'SUPER_ADMIN' && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[450px] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-orange-50">
                <h3 className="font-black text-orange-800 text-lg flex items-center gap-2"><Icons.Transfer /> Transférer du stock</h3>
                <button onClick={() => setTransferVariant(null)} className="text-orange-400 hover:text-orange-700 font-bold">✕</button>
              </div>
              <form onSubmit={handleTransferSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Sens du transfert</label>
                  <select value={transferDirection} onChange={e => { setTransferDirection(e.target.value); setTransferQty(1); }} className="w-full p-3 rounded-xl border border-slate-200 mt-1 bg-slate-50 outline-none focus:ring-2 focus:ring-orange-200 font-semibold text-slate-700">
                    <option value="SALE_TO_RENT">De la VENTE vers la LOCATION</option>
                    <option value="RENT_TO_SALE">De la LOCATION vers la VENTE</option>
                  </select>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  Disponibles pour ce transfert : <span className="font-black text-orange-600 ml-2 text-lg">{availableForTransfer}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantité à transférer</label>
                  <input type="number" min="1" max={availableForTransfer || 1} required disabled={availableForTransfer === 0} value={transferQty} onChange={e => setTransferQty(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-300 mt-1 text-xl text-center font-black text-slate-800 outline-none focus:border-orange-500" />
                </div>
                <button type="submit" disabled={isLoading || availableForTransfer === 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg mt-6 disabled:bg-slate-300">
                  {isLoading ? 'Transfert en cours...' : 'Confirmer le transfert'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="border-b border-slate-200 pb-4"><h2 className="text-3xl font-extrabold text-slate-800">Ajouter un Article & Stock</h2></div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">1. Informations Communes du Produit</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-600">Nom du Produit</label>
                  {currentUserRole === 'SUPER_ADMIN' && <div onClick={() => { setSettingsTab('CATEGORY'); setIsSettingsModalOpen(true); }}><Icons.Settings /></div>}
                </div>
                <select value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 font-bold text-slate-700">
                  <option value="" disabled>-- Choisir --</option>
                  {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-600">Type / Tissu</label>
                  {currentUserRole === 'SUPER_ADMIN' && <div onClick={() => { setSettingsTab('FABRIC'); setIsSettingsModalOpen(true); }}><Icons.Settings /></div>}
                </div>
                <select value={type} onChange={e => setType(e.target.value)} required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 font-bold text-slate-700">
                  <option value="" disabled>-- Choisir --</option>
                  {dbFabrics.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-600">Description</label>
                </div>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails (Optionnel)" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            </div>
            
            {/* 🔴 MODIFICATION DE L'AFFICHAGE DES PRIX : Visibles par tout le monde, sauf Achat (réservé Admin) */}
            <div className={`grid grid-cols-1 gap-6 pt-4 border-t border-slate-100 ${currentUserRole === 'SUPER_ADMIN' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div>
                <label className="text-sm font-semibold text-slate-600">Destination Stock</label>
                <select value={stockType} onChange={e => setStockType(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 mt-1 bg-slate-50">
                  <option value="SALE">Vente (VNT)</option><option value="RENT">Location (LOC)</option>
                </select>
              </div>
              
              {currentUserRole === 'SUPER_ADMIN' && (
                <div>
                  <label className="text-sm font-semibold text-slate-600">Prix d'Achat</label>
                  <input type="number" min="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="DH" className="w-full p-3 rounded-xl border border-slate-200 mt-1 bg-slate-50" />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-600">Prix de Vente {stockType === 'SALE' ? '*' : ''}</label>
                <input type="number" min="0" required={stockType === 'SALE'} value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="DH" className={`w-full p-3 rounded-xl mt-1 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 ${stockType === 'SALE' ? 'border-2 border-indigo-300' : 'border border-slate-200'}`} />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-slate-600">Prix de Location {stockType === 'RENT' ? '*' : ''}</label>
                <input type="number" min="0" required={stockType === 'RENT'} value={rentPrice} onChange={e => setRentPrice(e.target.value)} placeholder="DH" className={`w-full p-3 rounded-xl mt-1 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 ${stockType === 'RENT' ? 'border-2 border-indigo-300' : 'border border-slate-200'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-slate-800">2. Déclinaisons (Couleurs, Photos, Quantités)</h3>
              <button type="button" onClick={addVariantRow} className="text-sm bg-indigo-50 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 flex items-center"><Icons.Plus /> Ajouter une couleur</button>
            </div>
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                  <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                    {variant.previewUrl ? <img src={variant.previewUrl} alt="preview" className="w-full h-full object-cover" /> : <Icons.Image />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageSelect(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Couleur</label><input type="text" required value={variant.color} onChange={e => updateVariant(index, 'color', e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1 text-sm" /></div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Taille</label>
                      <select value={variant.size} onChange={e => updateVariant(index, 'size', e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1 text-sm bg-white">
                        <option>Standard</option><option>S</option><option>M</option><option>L</option><option>XL</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Quantité Globale</label><input type="number" min="1" required value={variant.quantity} onChange={e => updateVariant(index, 'quantity', Math.max(1, Number(e.target.value)))} className="w-full p-2.5 rounded-lg border border-slate-300 mt-1 text-sm font-bold text-indigo-700" /></div>
                  </div>
                  {variants.length > 1 && <button type="button" onClick={() => removeVariantRow(index)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Icons.Trash /></button>}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg disabled:bg-slate-400">
            {isLoading ? 'Enregistrement...' : 'Enregistrer le Produit'}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-10">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Catalogue Actuel (Regroupé par Destination)</h3>
            
            {currentUserRole === 'SUPER_ADMIN' && (
              <button
                onClick={() => setShowMissingPriceFilter(!showMissingPriceFilter)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                  showMissingPriceFilter
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Icons.Alert />
                {showMissingPriceFilter ? 'Afficher tout le catalogue' : 'Filtrer Prix Achat Manquant'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="p-4">Image</th>
                  <th className="p-4">Produit</th>
                  <th className="p-4">Couleur / Taille</th>
                  <th className="p-4 text-center">Destination</th>
                  <th className="p-4 text-center">Qté</th>
                  {/* 🔴 CHANGEMENT ICI : La colonne s'appelle différemment selon le rôle */}
                  <th className="p-4 text-center">{currentUserRole === 'SUPER_ADMIN' ? 'Prix (A/V/L)' : 'Prix (V/L)'}</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {showMissingPriceFilter ? "Aucun prix d'achat manquant ! Parfait." : "Aucun produit généré."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isMissingPrice = !row.variant.purchasePrice || row.variant.purchasePrice <= 0;
                    const rowClass = (currentUserRole === 'SUPER_ADMIN' && isMissingPrice) 
                      ? 'bg-red-50/50 hover:bg-red-50 transition-colors border-l-2 border-red-400' 
                      : 'hover:bg-slate-50 transition-colors';

                    return (
                      <tr key={`${row.variant.id}-${row.stockType}-${idx}`} className={rowClass}>
                        <td className="p-4">
                          {row.variant.imagePath ? (
                            <img src={row.variant.imagePath.startsWith('http') ? row.variant.imagePath : `file://${row.variant.imagePath}`} alt="Produit" className="w-10 h-10 rounded object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-xs text-slate-400">N/A</div>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-700">{row.product.name}</p>
                          <p className="text-xs text-slate-400 font-mono">Base: {row.items.length > 0 ? row.items[0].barcode.substring(0, row.items[0].barcode.lastIndexOf('-')) : 'N/A'}</p>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-700">{row.variant.color}</span>
                          <span className="text-slate-400 text-xs ml-2">({row.variant.size})</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.stockType === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {row.stockType === 'SALE' ? 'Vente' : 'Location'}
                          </span>
                        </td>
                        <td className="p-4 font-black text-slate-800 text-base text-center">{row.items.length}</td>
                        
                        <td className="p-4 text-center text-[10px] font-bold text-slate-500">
                          {/* 🔴 AFFICHAGE DU PRIX D'ACHAT (UNIQUEMENT POUR ADMIN) */}
                          {currentUserRole === 'SUPER_ADMIN' && (
                            isMissingPrice ? (
                              <div className="text-red-600 mb-1 flex items-center justify-center gap-1 font-black"><Icons.Alert /> Achat ?</div>
                            ) : (
                              <div className="text-slate-400 mb-1">A: {row.variant.purchasePrice} DH</div>
                            )
                          )}
                          
                          {/* 🔴 PRIX DE VENTE ET LOCATION (VISIBLES POUR TOUS) */}
                          {row.variant.salePrice ? <div>V: {row.variant.salePrice} DH</div> : null}
                          {row.variant.rentPrice ? <div>L: {row.variant.rentPrice} DH</div> : null}
                        </td>
                        
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handlePrint(row.product, row.variant, row.items)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white rounded-lg transition-colors" title={`Imprimer codes ${row.stockType === 'SALE' ? 'Vente' : 'Location'}`}>
                              <Icons.Print />
                            </button>
                            
                            {currentUserRole === 'SUPER_ADMIN' && (
                              <>
                                <button onClick={() => { setTransferVariant(row.variant); setTransferQty(1); setTransferDirection(row.stockType === 'SALE' ? 'SALE_TO_RENT' : 'RENT_TO_SALE'); }} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-colors" title="Transférer Vente ↔ Location">
                                  <Icons.Transfer />
                                </button>
                                <button onClick={() => openEditModal(row.variant)} className={`p-2 rounded-lg transition-colors ${isMissingPrice ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`} title="Éditer Prix et Quantité">
                                  <Icons.Edit />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}