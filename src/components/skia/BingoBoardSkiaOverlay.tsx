import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { getSkiaTheme, SkiaThemeName } from './theme';

export type BingoBoardSkiaOverlayProps = {
  size: number;
  gridSize?: number; // default 5
  gap?: number; // spacing between cells
  theme?: SkiaThemeName; // 'physical' | 'neon'
  showFreeCenter?: boolean; // unused per spec (B)
};

const BingoBoardSkiaOverlay = ({
  size,
  gridSize = 5,
  gap = 8,
  theme = 'physical',
}: BingoBoardSkiaOverlayProps) => {
  const t = getSkiaTheme(theme);

  const cell = (size - (gridSize - 1) * gap) / gridSize;
  const lineW = Math.max(1, Math.min(2, Math.round(gap * 0.6)));

  const lines: { x: number; y: number; w: number; h: number; color: string }[] = [];

  // Horizontal separators (in the center of gaps)
  for (let r = 1; r < gridSize; r++) {
    const y = r * cell + (r - 0.5) * gap;
    lines.push({ x: 0, y: y - lineW / 2, w: size, h: lineW, color: t.gridDark });
  }

  // Vertical separators
  for (let c = 1; c < gridSize; c++) {
    const x = c * cell + (c - 0.5) * gap;
    lines.push({ x: x - lineW / 2, y: 0, w: lineW, h: size, color: t.gridDark });
  }

  return (
    <View style={StyleSheet.flatten([{ width: size, height: size }])} pointerEvents="none">
      <Canvas style={{ width: size, height: size }}>
        {lines.map((l, idx) => (
          <Rect key={`l-${idx}`} x={l.x} y={l.y} width={l.w} height={l.h} color={t.gridDark} />
        ))}
      </Canvas>
    </View>
  );
};

export default memo(BingoBoardSkiaOverlay);
