import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, hayBackend } from '../lib/supabase'

/**
 * El usuario y la contraseña los valida Supabase Auth del lado del servidor.
 * En el front no hay ninguna contraseña escrita: si alguien abre el código
 * fuente de la página, no encuentra nada que le sirva.
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const ir = useNavigate()

  useEffect(() => {
    if (!hayBackend) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) ir('/panel', { replace: true })
    })
  }, [ir])

  async function entrar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    setEnviando(false)
    if (error) {
      setError('El usuario o la contraseña no coinciden.')
      return
    }
    ir('/panel', { replace: true })
  }

  if (!hayBackend) {
    return (
      <Marco>
        <p className="text-sm leading-relaxed text-gris">
          Falta conectar la base de datos. Copiá <code>.env.example</code> a <code>.env</code>,
          poné la URL y la clave del proyecto de Supabase, y volvé a levantar el servidor.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm underline">Volver al catálogo</Link>
      </Marco>
    )
  }

  return (
    <Marco>
      <form onSubmit={entrar} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-500">Usuario</label>
          <input
            id="email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-linea bg-white px-3 py-3 text-base
                       focus:border-verde focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="clave" className="block text-sm font-500">Contraseña</label>
          <input
            id="clave" type="password" autoComplete="current-password" required
            value={clave} onChange={(e) => setClave(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-linea bg-white px-3 py-3 text-base
                       focus:border-verde focus:outline-none"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <button
          type="submit" disabled={enviando}
          className="w-full rounded-lg bg-verdeOsc py-3.5 text-base font-600 text-white
                     disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <Link to="/" className="mt-6 inline-block text-sm underline">Volver al catálogo</Link>
    </Marco>
  )
}

function Marco({ children }) {
  return (
    <div className="min-h-dvh bg-papel">
      <div className="mx-auto max-w-sm px-5 pt-16">
        <h1 className="font-cond text-2xl font-700">Panel de administración</h1>
        <p className="mb-8 mt-1 text-sm text-gris">
          Solo para el dueño y el encargado.
        </p>
        {children}
      </div>
    </div>
  )
}
