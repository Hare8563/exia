import React, { useRef, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScenarioStore } from '@/states/scenarioStore';
import type { ScenarioCharacter } from '@/types';

interface CharacterSpriteProps {
  character: ScenarioCharacter;
  defaultX: number;  // マウント時の初期X座標
  targetX: number;   // アニメーション先のX座標
  anchorY: number;
  isActive: boolean;
}

// スケール・明るさのアニメーション速度
const EFFECT_ANIM_SPEED = 8;

// 位置移動のアニメーション速度
const POSITION_ANIM_SPEED = 8;

// 発話時に中央 (x=0) まで移動 (1.0 = 完全に中央)
const ACTIVE_CENTER_RATIO = 1.0;

const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  character,
  defaultX,
  targetX,
  anchorY,
  isActive,
}) => {
  const { viewport } = useThree();
  const texture = useTexture(`/images/characters/${character.imageFile}`);

  // x は useFrame で完全制御するため ref で管理
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  // targetX の最新値を closure に捕捉させず ref で参照
  const targetXRef = useRef(defaultX);
  targetXRef.current = targetX;

  const height = viewport.height * 0.8;
  const img = texture.image as HTMLImageElement | null;
  const aspectRatio = img && img.height > 0 ? img.width / img.height : 0.56;
  const width = height * aspectRatio;

  // マウント時に初期X位置を設定（prop の position で管理しないことで再レンダー時のジャンプを防ぐ）
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.x = defaultX;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const posAlpha = 1 - Math.exp(-delta * POSITION_ANIM_SPEED);
    const fxAlpha  = 1 - Math.exp(-delta * EFFECT_ANIM_SPEED);

    if (groupRef.current) {
      // X位置: targetXRef.current に向けてスムーズに移動
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetXRef.current,
        posAlpha,
      );

      const targetScale = isActive ? 1.05 : 1.0;
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, fxAlpha);
      groupRef.current.scale.set(s, s, 1);
    }

    if (matRef.current) {
      const targetBrightness = isActive ? 1.0 : 0.75;
      const b = THREE.MathUtils.lerp(matRef.current.color.r, targetBrightness, fxAlpha);
      matRef.current.color.setRGB(b, b, b);
    }
  });

  return (
    // x は useFrame で制御。y/z は静的なので外側の group で宣言的に管理
    <group position={[0, anchorY, 0.05]}>
      <group ref={groupRef}>
        <mesh position={[0, height / 2, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial ref={matRef} map={texture} transparent />
        </mesh>
      </group>
    </group>
  );
};

export const Character3D: React.FC = () => {
  const { scenario } = useScenarioStore();
  const { viewport } = useThree();
  const { characters, currentCharacterIndex } = scenario;

  if (!characters || characters.length === 0) return null;

  const visibleCharacters = characters.filter((c) => c.isShow);
  if (visibleCharacters.length === 0) return null;

  const anchorY = -viewport.height / 2;

  return (
    <>
      {visibleCharacters.map((character, i) => {
        const defaultX = (i - (visibleCharacters.length - 1) / 2) * viewport.width * 0.3;
        const isNotActiveX = (i - (visibleCharacters.length - 1) / 2) * viewport.width * 0.5;
        const isMonologue = currentCharacterIndex === -1;
        const isActive = currentCharacterIndex === character.index;
        console.log(currentCharacterIndex);
        const targetX = isMonologue ? defaultX : isActive ? defaultX * (1 - ACTIVE_CENTER_RATIO) : isNotActiveX;

        return (
          <CharacterSprite
            key={character.index}
            character={character}
            defaultX={defaultX}
            targetX={targetX}
            anchorY={anchorY}
            isActive={isActive}
          />
        );
      })}
    </>
  );
};
