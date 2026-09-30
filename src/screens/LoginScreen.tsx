import { useState } from 'react'

export default function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Appel direct au backend (qui vérifie Abdoo ou la BDD)
      const user = await (window as any).api.login({ username, password })
      onLogin(user) // Transmet l'utilisateur connecté à l'application
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Design de fond abstrait */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-slate-100 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Espace Réservé</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Veuillez vous identifier pour accéder au système.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center mb-6 border border-red-100 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identifiant</label>
            <input 
              type="text" required autoFocus
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 mt-1 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all bg-slate-50"
              placeholder="Entrez votre identifiant"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</label>
            <input 
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 mt-1 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all bg-slate-50"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 mt-8 transition-all disabled:bg-slate-400"
          >
            {isLoading ? 'Connexion en cours...' : 'Déverrouiller le système'}
          </button>
        </form>
      </div>
    </div>
  )
}