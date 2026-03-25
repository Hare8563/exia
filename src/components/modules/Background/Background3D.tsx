import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useScenarioStore } from '@/states/scenarioStore';

export const Background3D: React.FC = () => {
  const { scenario } = useScenarioStore();
  const { viewport } = useThree();

  const bgFile = scenario.currentLine?.backgroundFile || scenario.backgroundFile;
  const texture = useTexture(bgFile ? `/images/backgrounds/${bgFile}` : '/images/backgrounds/bg_01.webp');

  // 計算してobject-coverのような挙動を実現
  const scale = useMemo(() => {
    const viewportAspect = viewport.width / viewport.height;
    const img = texture.image as HTMLImageElement | null;
    const imageAspect = img ? img.width / img.height : 1;
    
    if (viewportAspect > imageAspect) {
      return [viewport.width, viewport.width / imageAspect, 1];
    } else {
      return [viewport.height * imageAspect, viewport.height, 1];
    }
  }, [viewport.width, viewport.height, texture]);

  return (
    <mesh position={[0, 0, 0]} scale={scale as [number, number, number]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
};
