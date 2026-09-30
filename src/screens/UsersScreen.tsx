import { useState, useEffect } from 'react'

const Icons = {
  UserPlus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Shield: () => <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  User: () => <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'USER',
    isActive: true
  })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const data = await (window as any).api.getUsers()
      setUsers(data)
    } catch (error) { console.error("Erreur de chargement", error) }
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', role: 'USER', isActive: true })
    setIsModalOpen(true)
  }

  const openEditModal = (user: any) => {
    setEditingUser(user)
    setFormData({ 
      username: user.username, 
      password: '', // On laisse vide pour ne pas l'écraser s'il ne tape rien
      role: user.role, 
      isActive: user.isActive 
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingUser) {
        await (window as any).api.updateUser({
          id: editingUser.id,
          ...formData
        })
        alert("Utilisateur mis à jour avec succès !")
      } else {
        if (!formData.password) return alert("Le mot de passe est obligatoire pour un nouvel utilisateur.")
        await (window as any).api.createUser(formData)
        alert("Utilisateur créé avec succès !")
      }
      setIsModalOpen(false)
      await loadUsers()
    } catch (error: any) {
      alert("Erreur (le nom d'utilisateur existe peut-être déjà) : " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Équipe & Accès</h2>
          <p className="text-slate-500 mt-1">Gérez les administrateurs et les employés de la boutique.</p>
        </div>
        <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <Icons.UserPlus />
          Nouvel Utilisateur
        </button>
      </div>

      {/* MODAL AJOUT/ÉDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[450px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg">{editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nom d'utilisateur (Login)</label>
                <input 
                  type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                  className="w-full p-3 rounded-xl border border-slate-300 mt-1 font-bold outline-none focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Mot de passe {editingUser && <span className="text-slate-400 font-normal lowercase">(Laisser vide pour ne pas modifier)</span>}
                </label>
                <input 
                  type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                  className="w-full p-3 rounded-xl border border-slate-300 mt-1 outline-none focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Rôle / Permissions</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div 
                    onClick={() => setFormData({...formData, role: 'SUPER_ADMIN'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'SUPER_ADMIN' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                  >
                    <Icons.Shield />
                    <span className={`text-xs font-black ${formData.role === 'SUPER_ADMIN' ? 'text-emerald-700' : 'text-slate-500'}`}>ADMINISTRATEUR</span>
                  </div>
                  <div 
                    onClick={() => setFormData({...formData, role: 'USER'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'USER' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <Icons.User />
                    <span className={`text-xs font-black ${formData.role === 'USER' ? 'text-blue-700' : 'text-slate-500'}`}>EMPLOYÉ</span>
                  </div>
                </div>
              </div>

              {editingUser && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Compte Actif (Autorisé à se connecter)</label>
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    className="w-5 h-5 accent-indigo-600"
                  />
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg mt-6">
                {isLoading ? 'Sauvegarde...' : 'Valider'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LISTE DES UTILISATEURS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Rôle</th>
              <th className="p-4 text-center">Statut</th>
              <th className="p-4">Date de Création</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun utilisateur trouvé.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-black text-slate-800 text-base">{user.username}</td>
                  <td className="p-4">
                    {user.role === 'SUPER_ADMIN' ? (
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-max border border-emerald-100">
                        <Icons.Shield /> Admin (Accès Total)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded w-max border border-blue-100">
                        <Icons.User /> Employé (Vente/Loc)
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {user.isActive ? (
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">Actif</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">Désactivé</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 font-medium">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => openEditModal(user)} 
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center"
                      title="Modifier les accès"
                    >
                      <Icons.Edit />
                    </button>
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