import React, { Suspense } from 'react'
import { Background3D } from './Background3D'
import { ForegroundLayer } from '../ForegroundLayer/ForegroundLayer'

export const NovelLayers: React.FC = () => (
  <Suspense fallback={null}>
    <Background3D />
    <ForegroundLayer />
  </Suspense>
)
