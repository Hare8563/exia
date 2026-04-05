import React, { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { BellIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'
import { useThreeContentStore } from '@/states/threeContentStore'
import { assetManager } from '@/utils/assetManager'
import { TitleLayers } from './TitleLayers'

const FOOTER_TEXT: React.CSSProperties = {
  fontFamily: "'Noto Sans', sans-serif",
  fontWeight: 700,
  fontSize: 14,
  lineHeight: '22px',
  display: 'flex',
  alignItems: 'center',
  color: 'rgba(255, 255, 255, 0.8)',
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
}

export default function TitleScene() {
  const navigate = useSceneStore(s => s.navigate)
  const setSceneThreeComponent = useThreeContentStore(s => s.setSceneThreeComponent)
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([])
  const [isFlash, setIsFlash] = useState(false)
  const uid = auth.currentUser?.uid ?? 'UID'

  useEffect(() => {
    setSceneThreeComponent(TitleLayers)
    return () => setSceneThreeComponent(null)
  }, [setSceneThreeComponent])

  const handleStart = (e: React.MouseEvent) => {
    // Ripple effect
    const rippleId = Date.now()
    setRipples(prev => [...prev, { id: rippleId, x: e.clientX, y: e.clientY }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== rippleId)), 600)

    // Flash and SE
    setIsFlash(true)
    const se = new Audio(assetManager.resolve('se_001.wav', 'sounds/se'))
    se.play().catch(e => console.error("SE play failed", e))

    setTimeout(() => {
      navigate('novel')
    }, 500)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('sign-in')
  }

  const logoUrl = "/images/bgimage/title.png"

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* Screen Flash Overlay */}
      {isFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-pulse" style={{ opacity: 0.8 }} />
      )}

      {/* Ripple Effects Container */}
      {ripples.map(ripple => (
        <div 
          key={ripple.id}
          className="ripple-effect z-40"
          style={{ left: ripple.x - 50, top: ripple.y - 50, width: 100, height: 100 }}
        />
      ))}

      {/* Title logo with Entrance and Masked Gloss */}
      <div 
        className="animate-float-up"
        style={{ 
            position: 'absolute', 
            width: 480, 
            height: 160, 
            right: 50, 
            top: 40,
            zIndex: 30
        }}
      >
        <img
          src={logoUrl}
          alt="Exia"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {/* Gloss Overlay Container with Masking */}
        <div 
            className="absolute inset-0 pointer-events-none"
            style={{
                WebkitMaskImage: `url(${logoUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${logoUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
            }}
        >
            <div 
                className="absolute inset-0 animate-shine"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
      </div>

      {/* Left sidebar UI */}
      <div style={{ position: 'absolute', left: 24, top: 24, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 40 }}>
        <button className="fantasy-button-gold w-14 h-14 rounded-xl flex items-center justify-center">
          <BellIcon className="w-8 h-8 text-amber-200" />
        </button>
        <button className="fantasy-button-gold w-14 h-14 rounded-xl flex items-center justify-center">
          <Cog6ToothIcon className="w-8 h-8 text-amber-200" />
        </button>
        <button 
          onClick={() => { void handleLogout() }}
          className="fantasy-button-gold w-14 h-14 rounded-xl flex items-center justify-center mt-auto"
        >
          <ArrowRightOnRectangleIcon className="w-8 h-8 text-amber-200" />
        </button>
      </div>

      {/* TOUCH TO START + Footer */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 48,
        zIndex: 30
      }}>
        {/* TOUCH TO START Container */}
        <div className="relative group cursor-pointer" onClick={handleStart}>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors rounded-full blur-xl -m-4" />
            <div
                className="animate-glow-pulse px-24 py-4 relative"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                    fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
                    fontWeight: 800,
                    fontSize: 32,
                    color: '#ffffff',
                    letterSpacing: '0.25em',
                    textShadow: '0 0 15px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)',
                    WebkitTextStroke: '1px rgba(255,255,255,0.2)'
                }}
            >
                TOUCH TO START
            </div>
            {/* Decoration line */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-2 opacity-60 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>

        {/* Footer info - Horizontal Flex */}
        <div style={{ 
          width: '100%', 
          maxWidth: 1400, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 60px' 
        }}>
          <div style={FOOTER_TEXT}>Ver. 1.1.0</div>
          <div style={{ ...FOOTER_TEXT, opacity: 0.5 }}>@ 2026 Exia. All Rights Reserved.</div>
          <div style={FOOTER_TEXT}>{uid}</div>
        </div>
      </div>

    </div>
  )
}
