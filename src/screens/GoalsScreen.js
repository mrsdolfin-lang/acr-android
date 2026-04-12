// src/screens/GoalsScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';

const ICONS = ['🏖','💻','🚗','🏠','📱','✈️','💍','🎓','🏥','🎯','💰','🛍'];

function RingChart({ pct, size = 70, color = '#5effa0', bg = '#262626' }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size/2} cy={size/2} r={r} stroke={bg} strokeWidth={6} fill="none" />
      <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </Svg>
  );
}

export default function GoalsScreen() {
  const { goals, validTx, currency, saveGoal, deleteGoal } = useApp();
  const [modal,      setModal]      = useState(false);
  const [goalName,   setGoalName]   = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved,  setGoalSaved]  = useState('');
  const [goalIcon,   setGoalIcon]   = useState('🎯');

  const fmt  = v => currency + parseFloat(v || 0).toFixed(2);
  const fmtS = v => { v = parseFloat(v||0); return v>=1000?currency+(v/1000).toFixed(1)+'k':currency+v.toFixed(0); };

  const handleSave = async () => {
    if (!goalName.trim()) { Alert.alert('Enter goal name'); return; }
    const target = parseFloat(goalTarget);
    if (!target || target <= 0) { Alert.alert('Enter target amount'); return; }
    await saveGoal({
      name:    goalName.trim(),
      target,
      saved:   Math.min(parseFloat(goalSaved) || 0, target),
      icon:    goalIcon,
      created: new Date().toISOString(),
    });
    setModal(false); setGoalName(''); setGoalTarget(''); setGoalSaved(''); setGoalIcon('🎯');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}>
        <Text style={s.title}>Goals</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnTxt}>＋</Text>
        </TouchableOpacity>
      </View>
      <View style={s.notice}><Text style={s.noticeTxt}>🏆 Track your savings goals. Tap + to create one.</Text></View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {goals.length === 0
            ? <View style={s.empty}><Text style={s.emptyIco}>🏆</Text><Text style={s.emptyT}>No goals yet</Text><Text style={s.emptyS}>Tap + to set a savings goal</Text></View>
            : goals.map(g => {
                const pct = Math.min((g.saved / g.target) * 100, 100);
                const done = pct >= 100;
                return (
                  <View key={g.id} style={s.grow}>
                    <View style={s.growTop}>
                      <RingChart pct={pct} size={62} color={done ? theme.colors.mint : theme.colors.blue} />
                      <View style={s.growInfo}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
                          <Text style={{fontSize:18}}>{g.icon}</Text>
                          <Text style={s.growNm}>{g.name}</Text>
                          {done && <View style={s.doneBadge}><Text style={s.doneTxt}>Done!</Text></View>}
                        </View>
                        <Text style={s.growSub}>{fmt(g.saved)} of {fmt(g.target)}</Text>
                        <View style={s.growBar}>
                          <View style={[s.growFill,{width:`${pct.toFixed(1)}%`,backgroundColor:done?theme.colors.mint:theme.colors.blue}]}/>
                        </View>
                      </View>
                      <View style={s.growRight}>
                        <Text style={[s.growPct,{color:done?theme.colors.mint:theme.colors.t1}]}>{pct.toFixed(0)}%</Text>
                        <TouchableOpacity onPress={()=>Alert.alert('Delete Goal',`Remove "${g.name}"?`,[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteGoal(g.id)}])}>
                          <Text style={{fontSize:16,color:theme.colors.t4,marginTop:6}}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
          }
        </View>
        <View style={{height:24}}/>
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(false)}>
        <View style={s.modal}>
          <View style={s.modalHd}><Text style={s.modalTitle}>New Goal</Text><TouchableOpacity onPress={()=>setModal(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <Text style={s.lbl}>Goal Name</Text>
          <TextInput style={s.input} placeholder="e.g. Emergency Fund, New Phone" placeholderTextColor={theme.colors.t4} value={goalName} onChangeText={setGoalName}/>
          <Text style={s.lbl}>Target Amount</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 50000" placeholderTextColor={theme.colors.t4} value={goalTarget} onChangeText={setGoalTarget}/>
          <Text style={s.lbl}>Already Saved (optional)</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.colors.t4} value={goalSaved} onChangeText={setGoalSaved}/>
          <Text style={s.lbl}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:20}}>
            <View style={{flexDirection:'row',gap:8}}>
              {ICONS.map(ic=>(
                <TouchableOpacity key={ic} style={[s.icBtn,goalIcon===ic&&s.icBtnOn]} onPress={()=>setGoalIcon(ic)}>
                  <Text style={{fontSize:22}}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveTxt}>Create Goal</Text></TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      {flex:1,backgroundColor:theme.colors.bg},
  hd:        {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:     {fontSize:28,fontWeight:'800',color:theme.colors.t1,letterSpacing:-0.8},
  addBtn:    {width:38,height:38,borderRadius:19,backgroundColor:theme.colors.mintBg,borderWidth:1,borderColor:theme.colors.mintBdr,alignItems:'center',justifyContent:'center'},
  addBtnTxt: {fontSize:20,color:theme.colors.mint},
  notice:    {marginHorizontal:16,marginBottom:12,padding:12,backgroundColor:theme.colors.mintBg,borderWidth:1,borderColor:theme.colors.mintBdr,borderRadius:12},
  noticeTxt: {fontSize:13,color:theme.colors.mint},
  card:      {marginHorizontal:16,backgroundColor:theme.colors.bg2,borderWidth:1,borderColor:theme.colors.border,borderRadius:22,overflow:'hidden'},
  empty:     {padding:32,alignItems:'center',gap:8},
  emptyIco:  {fontSize:36,opacity:0.4},
  emptyT:    {fontSize:17,fontWeight:'700',color:theme.colors.t1},
  emptyS:    {fontSize:13,color:theme.colors.t2,textAlign:'center'},
  grow:      {padding:16,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  growTop:   {flexDirection:'row',alignItems:'center',gap:12},
  growInfo:  {flex:1},
  growNm:    {fontSize:15,fontWeight:'700',color:theme.colors.t1},
  growSub:   {fontSize:12,color:theme.colors.t3,marginBottom:6},
  growBar:   {height:5,backgroundColor:theme.colors.bg4,borderRadius:3,overflow:'hidden'},
  growFill:  {height:'100%',borderRadius:3},
  growRight: {alignItems:'center'},
  growPct:   {fontSize:16,fontWeight:'800'},
  doneBadge: {backgroundColor:theme.colors.mintBg,borderWidth:1,borderColor:theme.colors.mintBdr,paddingHorizontal:8,paddingVertical:2,borderRadius:20},
  doneTxt:   {fontSize:10,fontWeight:'700',color:theme.colors.mint},
  modal:     {flex:1,backgroundColor:theme.colors.bg2,padding:20},
  modalHd:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  modalTitle:{fontSize:22,fontWeight:'800',color:theme.colors.t1},
  modalClose:{fontSize:18,color:theme.colors.t2,padding:4},
  lbl:       {fontSize:11,fontWeight:'700',color:theme.colors.t2,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8},
  input:     {backgroundColor:theme.colors.bg3,borderWidth:1,borderColor:theme.colors.border2,borderRadius:16,height:48,paddingHorizontal:14,color:theme.colors.t1,fontSize:15,marginBottom:16},
  icBtn:     {width:48,height:48,borderRadius:14,backgroundColor:theme.colors.bg3,borderWidth:1,borderColor:theme.colors.border,alignItems:'center',justifyContent:'center'},
  icBtnOn:   {borderColor:theme.colors.mint,backgroundColor:theme.colors.mintBg},
  saveBtn:   {height:52,borderRadius:18,backgroundColor:theme.colors.mint,alignItems:'center',justifyContent:'center'},
  saveTxt:   {fontSize:16,fontWeight:'700',color:'#0d0d0d'},
});
