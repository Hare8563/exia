import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function SignInScene() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useSceneStore(s => s.navigate)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('asset-update')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <form onSubmit={e => { void handleSubmit(e) }} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold text-center">サインイン</h1>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'サインイン'}
        </button>
      </form>
    </div>
  )
}
