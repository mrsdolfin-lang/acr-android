// src/components/DonutChart.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '../utils/theme';

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export default function DonutChart({ data, currency, colors }) {
  const total = useMemo(() => data.reduce((s, [, v]) => s + v, 0) || 1, [data]);
  const fmtS  = v => { v = parseFloat(v || 0); return v >= 1000 ? currency + (v/1000).toFixed(1) + 'k' : currency + v.toFixed(0); };

  const arcs = useMemo(() => {
    let angle = 0;
    return data.map(([cat, val], i) => {
      const sweep = (val / total) * 360;
      const path  = arcPath(65, 65, 56, angle, angle + sweep - 0.5);
      angle += sweep;
      return { cat, val, path, color: colors[i % colors.length] };
    });
  }, [data, total, colors]);

  return (
    <View style={s.wrap}>
      {/* Donut */}
      <View style={s.chartWrap}>
        <Svg width={130} height={130}>
          {arcs.map((a, i) => (
            <Path key={i} d={a.path} fill={a.color} />
          ))}
          {/* Hole */}
          <Circle cx={65} cy={65} r={34} fill={theme.colors.bg2} />
        </Svg>
        <View style={s.center}>
          <Text style={s.centerLabel}>Spent</Text>
          <Text style={s.centerValue}>{fmtS(total)}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {arcs.map((a, i) => (
          <View key={i} style={s.legRow}>
            <View style={[s.legDot, { backgroundColor: a.color }]} />
            <Text style={s.legName}>{a.cat}</Text>
            <Text style={s.legPct}>{((a.val / total) * 100).toFixed(0)}%</Text>
            <Text style={s.legAmt}>{fmtS(a.val)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 20 },
  chartWrap:  { position: 'relative', width: 130, height: 130 },
  center:     { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  centerLabel:{ fontSize: 10, color: theme.colors.t3, marginBottom: 2 },
  centerValue:{ fontSize: 16, fontWeight: '800', color: theme.colors.t1 },
  legend:     { flex: 1, gap: 7 },
  legRow:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legDot:     { width: 8, height: 8, borderRadius: 4 },
  legName:    { flex: 1, fontSize: 12, color: theme.colors.t2 },
  legPct:     { fontSize: 12, fontWeight: '700', color: theme.colors.t1 },
  legAmt:     { fontSize: 10, color: theme.colors.t3, marginLeft: 3, minWidth: 40, textAlign: 'right' },
});
