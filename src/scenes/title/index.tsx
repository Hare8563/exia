import React from 'react'
import { signOut } from 'firebase/auth'
import { BellIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'

const CIRCLE: React.CSSProperties = {
  position: 'absolute',
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'rgba(36, 75, 111, 0.7)',
  border: '3px solid #F2F3F5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
}

const FOOTER_TEXT: React.CSSProperties = {
  position: 'absolute',
  height: 40,
  top: 10,
  fontFamily: "'Noto Sans', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  lineHeight: '22px',
  display: 'flex',
  alignItems: 'center',
  color: '#000000',
}

export default function TitleScene() {
  const navigate = useSceneStore(s => s.navigate)
  const uid = auth.currentUser?.uid ?? 'UID'

  const handleLogout = async () => {
    await signOut(auth)
    navigate('sign-in')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#FFFFFF' }}>

      {/* Background image */}
      <img
        src="/images/bgimage/cover.png"
        alt=""
        style={{ position: 'absolute', width: 1331, height: 761, left: -55, top: -20, objectFit: 'fill' }}
      />

      {/* Title logo */}
      <img
        src="/images/bgimage/title.png"
        alt="ブレインハック CULTE SAGA"
        style={{ position: 'absolute', width: 436, height: 142, left: 821, top: 30, objectFit: 'contain' }}
      />

      {/* Left icon panel */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 76, height: 202 }}>
        <button style={{ ...CIRCLE, left: 14, top: 14 }}>
          <BellIcon style={{ width: 32, height: 32, color: '#F2F3F5' }} />
        </button>
        <button style={{ ...CIRCLE, left: 14, top: 77 }}>
          <Cog6ToothIcon style={{ width: 32, height: 32, color: '#F2F3F5' }} />
        </button>
        <button style={{ ...CIRCLE, left: 14, top: 140 }} onClick={() => { void handleLogout() }}>
          <ArrowRightOnRectangleIcon style={{ width: 32, height: 32, color: '#F2F3F5' }} />
        </button>
      </div>

      {/* Bottom section: TOUCH TO START + footer */}
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 13,
        width: 1277,
        height: 143,
        left: 'calc(50% - 638.5px - 1.5px)',
        bottom: 0,
      }}>
        {/* TOUCH TO START */}
        <button
          onClick={() => navigate('novel')}
          style={{
            width: 1277,
            height: 70,
            flexShrink: 0,
            background: 'linear-gradient(90deg, rgba(141, 142, 143, 0) 0%, rgba(141, 142, 143, 0.7) 49.52%, rgba(141, 142, 143, 0) 100%)',
            border: '1px solid #FFFFFF',
            fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            lineHeight: '36px',
            color: '#8D8E8F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          TOUCH TO START
        </button>

        {/* Footer */}
        <div style={{ position: 'relative', width: 1277, height: 60, flexShrink: 0 }}>
          <div style={{ ...FOOTER_TEXT, left: 20, width: 70 }}>
            Ver. 1.0.0
          </div>
          <div style={{ ...FOOTER_TEXT, left: 432, width: 413, justifyContent: 'center' }}>
            @ 2026 Exia. All Rights Reserved.
          </div>
          <div style={{ ...FOOTER_TEXT, left: 845, width: 413, justifyContent: 'flex-end' }}>
            {uid}
          </div>
        </div>
      </div>

    </div>
  )
}
