import React, { useRef, useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScenarioStore } from '@/states/scenarioStore';
import type { ScenarioCutIn } from '@/types';

const FADE_SPEED = 10; // フェードイン・アウト速度 (~800ms で完了)

interface CutInSpriteProps {
  cutIn: ScenarioCutIn;
  visible: boolean;
  onHidden: () => void;
}

const CutInSprite: React.FC<CutInSpriteProps> = ({ cutIn, visible, onHidden }) => {
  const { viewport } = useThree();
  const texture = useTexture(`/images/cut_ins/${cutIn.imageFile}`);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

  const img = texture.image as HTMLImageElement | null;
  const imageAspect = img && img.height > 0 ? img.width / img.height : viewport.width / viewport.height;

  let planeW: number;
  let planeH: number;

  if (cutIn.isFullScreen) {
    // object-cover: 画面全体を埋め、はみ出しはクロップ
    const viewportAspect = viewport.width / viewport.height;
    if (imageAspect > viewportAspect) {
      planeH = viewport.height;
      planeW = viewport.height * imageAspect;
    } else {
      planeW = viewport.width;
      planeH = viewport.width / imageAspect;
    }
  } else {
    // object-contain: コンテナ内に収まるようにフィット
    const containerW = viewport.width  * 0.5;
    const containerH = viewport.height * 0.5;
    const containerAspect = containerW / containerH;
    if (imageAspect > containerAspect) {
      planeW = containerW;
      planeH = containerW / imageAspect;
    } else {
      planeH = containerH;
      planeW = containerH * imageAspect;
    }
  }

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const targetOpacity = visible ? 1 : 0;
    const alpha = 1 - Math.exp(-delta * FADE_SPEED);
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, alpha);

    // フェードアウト完了時に親へ通知
    if (!visible && matRef.current.opacity < 0.01) {
      matRef.current.opacity = 0;
      setTimeout(() => onHiddenRef.current(), 0);
    }
  });

  return (
    <mesh position={[0, 0, 0.1]}>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={0} />
    </mesh>
  );
};

export const CutIn3D: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;
  const cutIn = (currentLine && currentLine.type !== 2 ? currentLine.cutIn : undefined) ?? null;

  // フェードアウト中も旧データを保持するために useState で管理
  const [displayed, setDisplayed] = useState<ScenarioCutIn | null>(cutIn);

  useEffect(() => {
    if (cutIn) {
      setDisplayed(cutIn); // 新しいカットイン → 表示データを更新してフェードイン
    }
    // cutIn が null になった場合は displayed を維持したままフェードアウトさせる
  }, [cutIn]);

  if (!displayed) return null;

  return (
    <CutInSprite
      cutIn={displayed}
      visible={!!cutIn}
      onHidden={() => setDisplayed(null)} // フェードアウト完了後にアンマウント
    />
  );
};
