// src/screens/BudgetScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

export default function BudgetScreen() {
  const { validTx, budgets, currency, saveBudget, deleteBudget } = useApp();
  const [modal,  setModal]  = useState(false);
  const [selCat, setSelCat] = useState('Food');
  const [limAmt, setLimAmt] = useState('');

  const fmtS = v => { v = parseFloat(v || 0); return v >= 1000 ? currency + (v/1000).toFixed(1)+'k' : currency + v.toFixed(0); };
  const fmt  = v => currency + parseFloat(v || 0).toFixed(2);

  const monthSpent = useMemo(() => {
    const now = new Date(), map = {};
    validTx.filter(t => { const d = new Date(t.timestamp); return t.type === 'debit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [validTx]);

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalSpent  = Object.keys(budgets).reduce((s, c) => s + (monthSpent[c] || 0), 0);

  const handleSave = async () => {
    const amt = parseFloat(limAmt);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    await saveBudget(selCat, amt);
    setModal(false); setLimAmt('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}>
        <Text style={s.title}>Budget</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnTxt}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={s.notice}>
        <Text style={s.noticeTxt}>ℹ Set monthly spending limits. Alerts at 80% and 100%.</Text>
      </View>

      {/* Summary */}
      <View style={s.sumRow}>
        {[{l:'Budget',v:fmtS(totalBudget),c:theme.colors.yellow},{l:'Spent',v:fmtS(totalSpent),c:theme.colors.red},{l:'Left',v:fmtS(Math.max(totalBudget-totalSpent,0)),c:theme.colors.mint}].map((sc,i) => (
          <View key={i} style={s.sc}><Text style={s.scL}>{sc.l}</Text><Text style={[s.scV,{color:sc.c}]}>{sc.v}</Text></View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {Object.keys(budgets).length === 0
            ? <View style={s.empty}><Text style={s.emptyIco}>🎯</Text><Text style={s.emptyT}>No budget set</Text><Text style={s.emptyS}>Tap + to add category limits</Text></View>
            : Object.entries(budgets).map(([cat, limit]) => {
                const spent = monthSpent[cat] || 0;
                const pct   = Math.min((spent / limit) * 100, 100);
                const clr   = pct >= 100 ? theme.colors.red : pct >= 80 ? theme.colors.yellow : theme.colors.mint;
                return (
                  <View key={cat} style={s.brow}>
                    <View style={s.browTop}>
                      <View style={s.browL}>
                        <View style={[s.browIco, {backgroundColor: theme.colors.mintBg}]}><Text style={{fontSize:14}}>{CATEGORY_ICONS[cat]||'📦'}</Text></View>
                        <View><Text style={s.browNm}>{cat}</Text><Text style={s.browPc}>{pct.toFixed(0)}% used</Text></View>
                      </View>
                      <View style={s.browR}>
                        <Text style={[s.browSp,{color:clr}]}>{fmt(spent)}</Text>
                        <Text style={s.browLm}>of {fmt(limit)}</Text>
                      </View>
                    </View>
                    <View style={s.track}><View style={[s.fill,{width:`${pct.toFixed(1)}%`,backgroundColor:clr}]}/></View>
                    <TouchableOpacity onPress={() => { Alert.alert('Delete Budget', `Remove ${cat} budget?`, [{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteBudget(cat)}]); }} style={{alignSelf:'flex-end',marginTop:4}}>
                      <Text style={{fontSize:11,color:theme.colors.t4}}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
          }
        </View>
        <View style={{height:24}}/>
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <View style={s.modal}>
          <View style={s.modalHd}><Text style={s.modalTitle}>Set Budget</Text><TouchableOpacity onPress={() => setModal(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <Text style={s.lbl}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={{flexDirection:'row',gap:6}}>
              {CATS.map(c => (
                <TouchableOpacity key={c} style={[s.catBtn,selCat===c&&s.catBtnOn]} onPress={() => setSelCat(c)}>
                  <Text style={[s.catTxt,selCat===c&&s.catTxtOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={s.lbl}>Monthly Limit</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 5000" placeholderTextColor={theme.colors.t4} value={limAmt} onChangeText={setLimAmt}/>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveTxt}>Save Budget</Text></TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     {flex:1,backgroundColor:theme.colors.bg},
  hd:       {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:    {fontSize:28,fontWeight:'800',color:theme.colors.t1,letterSpacing:-0.8},
  addBtn:   {width:38,height:38,borderRadius:19,backgroundColor:theme.colors.mintBg,borderWidth:1,borderColor:theme.colors.mintBdr,alignItems:'center',justifyContent:'center'},
  addBtnTxt:{fontSize:20,color:theme.colors.mint},
  notice:   {marginHorizontal:16,marginBottom:12,padding:12,backgroundColor:theme.colors.blueBg,borderWidth:1,borderColor:theme.colors.blueB||'rgba(92,158,255,.2)',borderRadius:12},
  noticeTxt:{fontSize:13,color:theme.colors.blue},
  sumRow:   {flexDirection:'row',gap:10,paddingHorizontal:16,marginBottom:14},
  sc:       {flex:1,backgroundColor:theme.colors.bg2,borderWidth:1,borderColor:theme.colors.border,borderRadius:16,padding:14},
  scL:      {fontSize:10,color:theme.colors.t3,textTransform:'uppercase',marginBottom:4},
  scV:      {fontSize:18,fontWeight:'800'},
  card:     {marginHorizontal:16,backgroundColor:theme.colors.bg2,borderWidth:1,borderColor:theme.colors.border,borderRadius:22,overflow:'hidden'},
  empty:    {padding:32,alignItems:'center',gap:8},
  emptyIco: {fontSize:36,opacity:0.4},
  emptyT:   {fontSize:17,fontWeight:'700',color:theme.colors.t1},
  emptyS:   {fontSize:13,color:theme.colors.t2,textAlign:'center'},
  brow:     {padding:16,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  browTop:  {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  browL:    {flexDirection:'row',alignItems:'center',gap:10},
  browIco:  {width:30,height:30,borderRadius:10,alignItems:'center',justifyContent:'center'},
  browNm:   {fontSize:14,fontWeight:'600',color:theme.colors.t1},
  browPc:   {fontSize:11,color:theme.colors.t3,marginTop:1},
  browR:    {alignItems:'flex-end'},
  browSp:   {fontSize:14,fontWeight:'700'},
  browLm:   {fontSize:11,color:theme.colors.t3},
  track:    {height:5,backgroundColor:theme.colors.bg4,borderRadius:3,overflow:'hidden'},
  fill:     {height:'100%',borderRadius:3},
  modal:    {flex:1,backgroundColor:theme.colors.bg2,padding:20},
  modalHd:  {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  modalTitle:{fontSize:22,fontWeight:'800',color:theme.colors.t1},
  modalClose:{fontSize:18,color:theme.colors.t2,padding:4},
  lbl:      {fontSize:11,fontWeight:'700',color:theme.colors.t2,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8},
  catBtn:   {height:34,paddingHorizontal:14,borderRadius:20,borderWidth:1,borderColor:theme.colors.border2,alignItems:'center',justifyContent:'center'},
  catBtnOn: {backgroundColor:theme.colors.mint,borderColor:'transparent'},
  catTxt:   {fontSize:13,fontWeight:'600',color:theme.colors.t2},
  catTxtOn: {color:'#0d0d0d'},
  input:    {backgroundColor:theme.colors.bg3,borderWidth:1,borderColor:theme.colors.border2,borderRadius:16,height:48,paddingHorizontal:14,color:theme.colors.t1,fontSize:15,marginBottom:20},
  saveBtn:  {height:52,borderRadius:18,backgroundColor:theme.colors.mint,alignItems:'center',justifyContent:'center'},
  saveTxt:  {fontSize:16,fontWeight:'700',color:'#0d0d0d'},
});
