// src/App.tsx
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN, CONFIG } from '@/constants'
import { Layout } from '@/components/Layout'
import { DebugMenu } from '@/components/DebugMenu'
import { StartScreen } from '@/components/screens/StartScreen'
import { MainScreen } from '@/components/screens/MainScreen'
import { EndingScreen } from '@/components/screens/EndingScreen'
import { SignInScreen } from '@/components/screens/SignInScreen'
import { AssetUpdater } from '@/components/modules/AssetUpdater'

const App = () => {
  const { screenState, setScreen } = useScreenStore()
  const { screen } = screenState

  // Redirect to SIGN_IN if Firebase Auth session expires
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) setScreen({ screen: SCREEN.SIGN_IN })
    })
    return unsubscribe
  }, [setScreen])

  return (
    <Layout>
      {screen === SCREEN.SIGN_IN       && <SignInScreen />}
      {screen === SCREEN.ASSET_UPDATE  && <AssetUpdater />}
      {screen === SCREEN.START_SCREEN  && <StartScreen />}
      {screen === SCREEN.MAIN_SCREEN   && <MainScreen />}
      {screen === SCREEN.ENDING_SCREEN && <EndingScreen />}
      {CONFIG.DEBUG && <DebugMenu />}
    </Layout>
  )
}

export default App
