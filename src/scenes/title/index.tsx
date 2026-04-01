import { useSceneStore } from '@/scene-manager/sceneStore'

export default function TitleScene() {
  const navigate = useSceneStore(s => s.navigate)
  return (
    <button onClick={() => navigate('novel')}>
      Start
    </button>
  )
}
