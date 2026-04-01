import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { assetManager } from '@/utils/assetManager'
import { useSceneStore } from '@/scene-manager/sceneStore'
import type { FirestorePack } from '@/types/asset'

export default function AssetUpdateScene() {
  const [status, setStatus] = useState<'checking' | 'downloading' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('アップデートを確認中...')
  const [progress, setProgress] = useState(0)
  const navigate = useSceneStore(s => s.navigate)

  useEffect(() => { void run() }, [])

  async function run() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) { setStatus('error'); setMessage('未サインイン'); return }

      const userDoc = await getDoc(doc(db, 'users', uid))
      const roles: string[] = userDoc.exists() ? (userDoc.data().roles ?? []) : []

      const updates: FirestorePack[] = await assetManager.checkUpdates(roles)
      if (updates.length === 0) {
        navigate('title')
        return
      }

      setStatus('downloading')
      for (let i = 0; i < updates.length; i++) {
        const pack = updates[i]
        setMessage(`ダウンロード中: ${pack.name} (${i + 1}/${updates.length})`)
        await assetManager.downloadPack(pack, pct => {
          setProgress(Math.round(((i + pct / 100) / updates.length) * 100))
        })
      }

      setStatus('done')
      setMessage('完了')
      setTimeout(() => navigate('title'), 800)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="flex flex-col items-center gap-6 w-80">
        <p className="text-lg">{message}</p>
        {status === 'downloading' && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === 'error' && (
          <button
            onClick={() => void run()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  )
}
