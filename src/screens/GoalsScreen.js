// src/screens/GoalsScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';

export default function GoalsScreen() {
  const { validTx, currency, goals, setCurrency: _setCurrency } = useApp();
  const { colors } = useTheme();
  const [modal,    setModal]    = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalAmt,  setGoalAmt]  = useState('');
  const [localGoals, setLocalGoals] = useState(goals || []);

  const totalSaved = validTx.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0)
                  - validTx.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0);

  const addGoal = () => {
    if (!goalName.trim() || !parseFloat(goalAmt)) {
      Alert.alert('Error','Enter name and target amount'); return;
    }
    const updated = [...localGoals, {
      id:     'g_'+Date.now(),
      name:   goalName.trim(),
      target: parseFloat(goalAmt),
      saved:  0,
      created:new Date().toISOString(),
    }];
    setLocalGoals(updated);
    setModal(false); setGoalName(''); setGoalAmt('');
  };

  const fmt = v => currency + parseFloat(v||0).toFixed(0);

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:colors.bg}]} edges={['top']}>
      <View style={s.hd}>
        <Text style={[s.title,{color:colors.t1}]}>Goals</Text>
        <TouchableOpacity
          style={[s.addBtn,{backgroundColor:colors.mintBg,borderColor:colors.mintBdr}]}
          onPress={()=>setModal(true)}
        >
          <Text style={{fontSize:20,color:colors.mint}}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Net savings card */}
      <View style={[s.savCard,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
        <Text style={[s.savLbl,{color:colors.t3}]}>Available Savings</Text>
        <Text style={[s.savVal,{color:totalSaved>=0?colors.mint:colors.red}]}>
          {totalSaved>=0?'+':''}{fmt(totalSaved)}
        </Text>
        <Text style={[s.savSub,{color:colors.t3}]}>Income minus all spending</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {localGoals.length === 0 ? (
          <View style={s.empty}>
            <Text style={{fontSize:40,opacity:0.3}}>🏆</Text>
            <Text style={[s.emptyT,{color:colors.t1}]}>No savings goals</Text>
            <Text style={[s.emptyS,{color:colors.t2}]}>Tap + to create a goal</Text>
          </View>
        ) : (
          <View style={{paddingHorizontal:16}}>
            {localGoals.map((g,i) => {
              const pct = Math.min((g.saved/g.target)*100, 100);
              return (
                <View key={g.id} style={[s.goalCard,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
                  <View style={s.goalTop}>
                    <Text style={[s.goalName,{color:colors.t1}]}>{g.name}</Text>
                    <Text style={[s.goalPct,{color:colors.mint}]}>{pct.toFixed(0)}%</Text>
                  </View>
                  <View style={[s.track,{backgroundColor:colors.bg4}]}>
                    <View style={[s.fill,{width:`${pct.toFixed(1)}%`,backgroundColor:colors.mint}]}/>
                  </View>
                  <View style={s.goalBot}>
                    <Text style={[s.goalSaved,{color:colors.mint}]}>{fmt(g.saved)} saved</Text>
                    <Text style={[s.goalTarget,{color:colors.t3}]}>of {fmt(g.target)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{height:24}}/>
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(false)}>
        <SafeAreaView style={[s.modal,{backgroundColor:colors.bg2}]}>
          <View style={s.modalHd}>
            <Text style={[s.modalTitle,{color:colors.t1}]}>New Goal</Text>
            <TouchableOpacity onPress={()=>setModal(false)}>
              <Text style={{fontSize:20,color:colors.t2}}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{padding:20,gap:14}}>
            <View>
              <Text style={[s.lbl,{color:colors.t3}]}>GOAL NAME</Text>
              <TextInput
                style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
                placeholder="Emergency fund, New phone..."
                placeholderTextColor={colors.t4}
                value={goalName} onChangeText={setGoalName}
              />
            </View>
            <View>
              <Text style={[s.lbl,{color:colors.t3}]}>TARGET AMOUNT ({currency})</Text>
              <TextInput
                style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
                keyboardType="decimal-pad" placeholder="10000"
                placeholderTextColor={colors.t4}
                value={goalAmt} onChangeText={setGoalAmt}
              />
            </View>
            <TouchableOpacity style={[s.saveBtn,{backgroundColor:colors.mint}]} onPress={addGoal}>
              <Text style={{fontSize:16,fontWeight:'700',color:'#0d0d0d'}}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      {flex:1},
  hd:        {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:     {fontSize:28,fontWeight:'800',letterSpacing:-0.8},
  addBtn:    {width:38,height:38,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},
  savCard:   {marginHorizontal:16,marginBottom:16,borderWidth:1,borderRadius:22,padding:20,alignItems:'center'},
  savLbl:    {fontSize:12,marginBottom:6},
  savVal:    {fontSize:36,fontWeight:'900',letterSpacing:-1},
  savSub:    {fontSize:11,marginTop:4},
  empty:     {alignItems:'center',paddingVertical:48,gap:8},
  emptyT:    {fontSize:18,fontWeight:'700'},
  emptyS:    {fontSize:13,textAlign:'center'},
  goalCard:  {borderWidth:1,borderRadius:18,padding:16,marginBottom:10},
  goalTop:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  goalName:  {fontSize:15,fontWeight:'700'},
  goalPct:   {fontSize:13,fontWeight:'700'},
  track:     {height:6,borderRadius:3,overflow:'hidden',marginBottom:8},
  fill:      {height:'100%',borderRadius:3},
  goalBot:   {flexDirection:'row',justifyContent:'space-between'},
  goalSaved: {fontSize:13,fontWeight:'600'},
  goalTarget:{fontSize:12},
  modal:     {flex:1},
  modalHd:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16},
  modalTitle:{fontSize:22,fontWeight:'800'},
  lbl:       {fontSize:10,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',marginBottom:7},
  input:     {borderWidth:1,borderRadius:14,height:46,paddingHorizontal:14,fontSize:15},
  saveBtn:   {height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},
});
