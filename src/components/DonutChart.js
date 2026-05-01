/**
 * DonutChart — SVG donut with center total + scrollable legend
 *
 * Fixes:
 *  - Null-guard on data prop (crash when no transactions)
 *  - Single-category renders as full circle (clamp 359.9999)
 *  - data.reduce crash when data is undefined
 *  - currency undefined guard
 *  - chartColors fallback when theme returns empty array
 */

import React, { useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';

const SIZE   = 176;
const STROKE = 28;
const R      = (SIZE - STROKE) / 2;
const CX     = SIZE / 2;
const CY     = SIZE / 2;

// Fallback chart colors used if theme returns empty array
const FALLBACK_COLORS = [
  '#1A6FD4','#00A651','#D97706','#7C3AED',
  '#D92D2D','#0891B2','#BE185D','#047857',
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const clampedEnd = endDeg >= 360 ? 359.9999 : endDeg;
  const start      = polarToCartesian(cx, cy, r, clampedEnd);
  const end        = polarToCartesian(cx, cy, r, startDeg);
  const largeArc   = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function DonutChart({ data, currency }) {
  const { colors, chartColors: themeChartColors } = useTheme();
  const chartColors = (themeChartColors && themeChartColors.length > 0)
    ? themeChartColors
    : FALLBACK_COLORS;

  // Safely compute total — guard against null/undefined data
  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(([, v]) => typeof v === 'number' && v > 0);
  }, [data]);

  const total = useMemo(
    () => safeData.reduce((s, [, v]) => s + v, 0),
    [safeData]
  );

  const slices = useMemo(() => {
    if (total === 0 || safeData.length === 0) return [];
    let currentDeg = 0;
    return safeData.map(([cat, val], i) => {
      const pct    = val / total;
      const sweep  = pct * 360;
      const start  = currentDeg;
      currentDeg  += sweep;
      return {
        cat,
        val,
        pct: Math.round(pct * 100),
        path: arcPath(CX, CY, R, start, currentDeg),
        color: chartColors[i % chartColors.length],
      };
    });
  }, [safeData, total, chartColors]);

  const safeCurrency = currency || '₹';

  // Empty state
  if (safeData.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg3 }]}>
        <Text style={{ color: colors.t3, fontSize: 13 }}>
          No expense data this month
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* SVG Donut */}
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background track */}
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={colors.bg4}
            strokeWidth={STROKE}
          />
          {/* Segments */}
          {slices.map((s, i) => (
            <Path
              key={i}
              d={s.path}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE - 3}
              strokeLinecap="butt"
            />
          ))}
        </Svg>

        {/* Center text — absolute overlay */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: colors.t3 }]}>Total</Text>
          <Text
            style={[styles.centerAmount, { color: colors.t1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {safeCurrency}
            {total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <ScrollView
        style={styles.legend}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {slices.map((s, i) => (
          <View key={i} style={[styles.legendRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text
              style={[styles.legendCat, { color: colors.t2 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {s.cat}
            </Text>
            <Text style={[styles.legendPct, { color: colors.t3 }]}>{s.pct}%</Text>
            <Text style={[styles.legendAmt, { color: colors.t1 }]}>
              {safeCurrency}
              {s.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  centerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  centerLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  centerAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 80,
    textAlign: 'center',
  },
  legend: { width: '100%', maxHeight: 220 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10, flexShrink: 0 },
  legendCat: { flex: 1, fontSize: 13 },
  legendPct: { fontSize: 12, width: 38, textAlign: 'right', marginRight: 10 },
  legendAmt: { fontSize: 12, fontWeight: '600', width: 76, textAlign: 'right' },
  empty: {
    height: 90,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
});
