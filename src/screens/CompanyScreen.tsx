import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function CompanyScreen() {
  const [companyInfo, setCompanyInfo] = useState({ name: '', address: '', phone: '', email: '', ice: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await (window as any).api.getCompany()
        if (data) setCompanyInfo(data)
      } catch (error) { console.error(error) }
    }
    fetchCompany()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await (window as any).api.updateCompany({
        name: companyInfo.name,
        address: companyInfo.address,
        phone: companyInfo.phone,
        email: companyInfo.email,
        ice: companyInfo.ice,
        message: companyInfo.message
      })
      toast.success("Informations enregistrées avec succès !")
    } catch (error) {
      toast.error("Erreur de sauvegarde.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Profil de l'Entreprise</h2>
          <p className="text-slate-500 mt-1">Ces informations apparaîtront sur les tickets de caisse thermiques.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de la Boutique / Enseigne *</label>
              <input type="text" name="name" required value={companyInfo.name || ''} onChange={handleChange} className="w-full p-4 rounded-xl border border-slate-200 mt-2 font-bold text-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse Complète</label>
              <input type="text" name="address" value={companyInfo.address || ''} onChange={handleChange} className="w-full p-3.5 rounded-xl border border-slate-200 mt-2" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
              <input type="text" name="phone" value={companyInfo.phone || ''} onChange={handleChange} className="w-full p-3.5 rounded-xl border border-slate-200 mt-2 font-mono" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input type="email" name="email" value={companyInfo.email || ''} onChange={handleChange} className="w-full p-3.5 rounded-xl border border-slate-200 mt-2" />
            </div>
            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numéro de Registre / ICE / RC</label>
              <input type="text" name="ice" value={companyInfo.ice || ''} onChange={handleChange} className="w-full p-3.5 rounded-xl border border-slate-200 mt-2 font-mono" />
            </div>
            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message de fin de ticket</label>
              <textarea name="message" value={companyInfo.message || ''} onChange={handleChange} rows={2} className="w-full p-3.5 rounded-xl border border-slate-200 mt-2 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg transition-all text-lg">
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder les informations'}
          </button>
        </form>
      </div>
    </div>
  )
}