// src/components/DonutChart.js — fixed for light/dark, no word wrap, all categories shown
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, start, end) {
  if (end - start >= 359.9) end = start + 359.9;
  const s    = polarToXY(cx, cy, r, start);
  const e    = polarToXY(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

export default function DonutChart({ data, currency }) {
  const { colors, chartColors, isDark } = useTheme();
  const total = useMemo(() => data.reduce((s,[,v]) => s+v, 0) || 1, [data]);

  const fmtS = v => {
    v = parseFloat(v||0);
    return v >= 1000 ? currency+(v/1000).toFixed(1)+'k' : currency+v.toFixed(0);
  };

  const arcs = useMemo(() => {
    let angle = 0;
    return data.map(([cat, val], i) => {
      const sweep = (val / total) * 360;
      const path  = arcPath(65, 65, 56, angle, angle + Math.max(sweep - 0.5, 0.1));
      angle += sweep;
      return { cat, val, path, color: chartColors[i % chartColors.length] };
    });
  }, [data, total, chartColors]);

  const textColor    = isDark ? '#f0f0f0' : '#0d0d0d';
  const subTextColor = isDark ? '#888888' : '#555555';
  const centerBg     = colors.bg2;

  return (
    <View>
      <View style={s.row}>
        {/* Donut */}
        <View style={s.chartWrap}>
          <Svg width={130} height={130}>
            {arcs.map((a, i) => (
              <Path key={i} d={a.path} fill={a.color}/>
            ))}
            <Circle cx={65} cy={65} r={34} fill={centerBg}/>
          </Svg>
          <View style={[s.center, {backgroundColor:'transparent'}]}>
            <Text style={[s.cLabel, {color:subTextColor}]}>Spent</Text>
            <Text style={[s.cVal,   {color:textColor}]}>{fmtS(total)}</Text>
          </View>
        </View>

        {/* Legend — all categories, scrollable */}
        <ScrollView style={s.legend} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {arcs.map((a, i) => (
            <View key={i} style={s.legRow}>
              <View style={[s.dot, {backgroundColor:a.color}]}/>
              <Text style={[s.legName, {color:textColor}]} numberOfLines={1} ellipsizeMode="tail">
                {a.cat}
              </Text>
              <Text style={[s.legPct, {color:textColor}]}>
                {((a.val/total)*100).toFixed(0)}%
              </Text>
              <Text style={[s.legAmt, {color:subTextColor}]}>
                {fmtS(a.val)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:       {flexDirection:'row', alignItems:'flex-start', gap:12},
  chartWrap: {width:130, height:130, flexShrink:0, position:'relative'},
  center:    {position:'absolute', inset:0, alignItems:'center', justifyContent:'center'},
  cLabel:    {fontSize:10, marginBottom:2},
  cVal:      {fontSize:15, fontWeight:'800'},
  legend:    {flex:1, maxHeight:130},
  legRow:    {flexDirection:'row', alignItems:'center', gap:5, marginBottom:7},
  dot:       {width:8, height:8, borderRadius:4, flexShrink:0},
  legName:   {flex:1, fontSize:11, fontWeight:'500'},
  legPct:    {fontSize:11, fontWeight:'700', width:32, textAlign:'right'},
  legAmt:    {fontSize:10, width:42, textAlign:'right'},
});
