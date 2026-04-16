// src/screens/BudgetScreen.js — with notification dedup
import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

const CATS = ['Food','Shopping','Transport','Utilities','Recharge',
              'Entertainment','Health','Education','SaaS','Others'];

export default function BudgetScreen() {
  const { validTx, budgets, currency, saveBudget, deleteBudget } = useApp();
  const { colors } = useTheme();
  const [modal,  setModal]  = useState(false);
  const [selCat, setSelCat] = useState('Food');
  const [limAmt, setLimAmt] = useState('');
  // Track which alerts already sent this session — prevent spam
  const sentAlerts = useRef(new Set());

  const fmtS = v => { v=parseFloat(v||0); return v>=1000?currency+(v/1000).toFixed(1)+'k':currency+v.toFixed(0); };
  const fmt  = v => currency+parseFloat(v||0).toFixed(2);

  const monthSpent = useMemo(() => {
    const now=new Date(), map={};
    validTx.filter(t => {
      const d = new Date(t.timestamp);
      return t.type==='debit' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).forEach(t => { map[t.category]=(map[t.category]||0)+t.amount; });
    return map;
  }, [validTx]);

  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v, 0);
  const totalSpent  = Object.keys(budgets).reduce((s,c)=>s+(monthSpent[c]||0), 0);

  const triggerAlert = async (cat, pct, spent, limit) => {
    // Each category only ONE notification per threshold crossing
    const key80  = `${cat}_80`;
    const key100 = `${cat}_100`;
    const isOver = pct >= 100;
    const alertKey = isOver ? key100 : key80;
    if (sentAlerts.current.has(alertKey)) return;
    if (pct < 80) return;
    sentAlerts.current.add(alertKey);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isOver ? `🚨 Budget Exceeded — ${cat}` : `⚠️ Budget Warning — ${cat}`,
          body:  isOver
            ? `${cat} budget of ${fmt(limit)} exceeded. Spent: ${fmt(spent)}`
            : `${pct.toFixed(0)}% of ${cat} budget used. ${fmt(limit-spent)} remaining.`,
          sound: true,
        },
        trigger: null,
      });
    } catch(e) {}
  };

  const handleSave = async () => {
    const amt = parseFloat(limAmt);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    await saveBudget(selCat, amt);
    sentAlerts.current.delete(`${selCat}_80`);
    sentAlerts.current.delete(`${selCat}_100`);
    setModal(false); setLimAmt('');
  };

  const handleDelete = (cat) => {
    Alert.alert(
      'Remove Budget',
      `Remove ${cat} budget limit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          deleteBudget(cat);
          sentAlerts.current.delete(`${cat}_80`);
          sentAlerts.current.delete(`${cat}_100`);
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={[s.safe, {backgroundColor:colors.bg}]} edges={['top']}>
      <View style={s.hd}>
        <Text style={[s.title, {color:colors.t1}]}>Budget</Text>
        <TouchableOpacity style={[s.addBtn, {backgroundColor:colors.mintBg, borderColor:colors.mintBdr}]} onPress={()=>setModal(true)}>
          <Text style={[s.addBtnTxt, {color:colors.mint}]}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.notice, {backgroundColor:colors.blueBg, borderColor:colors.blue+'44'}]}>
        <Text style={[s.noticeTxt, {color:colors.blue}]}>
          Set monthly spending limits. One notification at 80%, one at 100%.
        </Text>
      </View>

      <View style={s.sumRow}>
        {[
          {l:'Budget', v:fmtS(totalBudget), c:colors.yellow},
          {l:'Spent',  v:fmtS(totalSpent),  c:colors.red},
          {l:'Left',   v:fmtS(Math.max(totalBudget-totalSpent,0)), c:colors.mint},
        ].map((sc,i)=>(
          <View key={i} style={[s.sc, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            <Text style={[s.scL, {color:colors.t3}]}>{sc.l}</Text>
            <Text style={[s.scV, {color:sc.c}]}>{sc.v}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[s.card, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
          {Object.keys(budgets).length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIco}>🎯</Text>
              <Text style={[s.emptyT, {color:colors.t1}]}>No budgets set</Text>
              <Text style={[s.emptyS, {color:colors.t2}]}>Tap + to add spending limits</Text>
            </View>
          ) : (
            Object.entries(budgets).map(([cat, limit]) => {
              const spent = monthSpent[cat]||0;
              const pct   = (spent/limit)*100;
              const clr   = pct>=100?colors.red:pct>=80?colors.yellow:colors.mint;
              // Trigger alert (deduplicated)
              triggerAlert(cat, pct, spent, limit);
              return (
                <View key={cat} style={[s.brow, {borderBottomColor:colors.border}]}>
                  <View style={s.browTop}>
                    <View style={s.browL}>
                      <View style={[s.browIco, {backgroundColor:colors.bg4}]}>
                        <Text style={{fontSize:14}}>{CATEGORY_ICONS[cat]||'📦'}</Text>
                      </View>
                      <View>
                        <Text style={[s.browNm, {color:colors.t1}]}>{cat}</Text>
                        <Text style={[s.browPc, {color:colors.t3}]}>{Math.min(pct,100).toFixed(0)}% used</Text>
                      </View>
                    </View>
                    <View style={{alignItems:'flex-end'}}>
                      <Text style={[s.browSp, {color:clr}]}>{fmt(spent)}</Text>
                      <Text style={[s.browLm, {color:colors.t3}]}>of {fmt(limit)}</Text>
                    </View>
                  </View>
                  <View style={[s.track, {backgroundColor:colors.bg4}]}>
                    <View style={[s.fill, {width:`${Math.min(pct,100).toFixed(1)}%`, backgroundColor:clr}]}/>
                  </View>
                  <TouchableOpacity onPress={()=>handleDelete(cat)} style={{alignSelf:'flex-end',marginTop:6}}>
                    <Text style={{fontSize:11, color:colors.t4}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{height:24}}/>
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(false)}>
        <View style={[s.modal, {backgroundColor:colors.bg2}]}>
          <View style={s.modalHd}>
            <Text style={[s.modalTitle, {color:colors.t1}]}>Set Budget Limit</Text>
            <TouchableOpacity onPress={()=>setModal(false)} style={s.closeBtn}>
              <Text style={{fontSize:18, color:colors.t2}}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.lbl, {color:colors.t3}]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
            <View style={{flexDirection:'row', gap:6, paddingBottom:4}}>
              {CATS.map(c=>(
                <TouchableOpacity
                  key={c}
                  style={[s.catBtn, {
                    borderColor:colors.border2,
                    backgroundColor: selCat===c ? colors.mint : colors.bg3
                  }]}
                  onPress={()=>setSelCat(c)}
                >
                  <Text style={[s.catTxt, {color:selCat===c?'#0d0d0d':colors.t1}]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[s.lbl, {color:colors.t3}]}>Monthly Limit ({currency})</Text>
          <TextInput
            style={[s.input, {backgroundColor:colors.bg3, borderColor:colors.border2, color:colors.t1}]}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000"
            placeholderTextColor={colors.t4}
            value={limAmt}
            onChangeText={setLimAmt}
          />
          <TouchableOpacity style={[s.saveBtn, {backgroundColor:colors.mint}]} onPress={handleSave}>
            <Text style={s.saveTxt}>Save Budget</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       {flex:1},
  hd:         {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:      {fontSize:28,fontWeight:'800',letterSpacing:-0.8},
  addBtn:     {width:38,height:38,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},
  addBtnTxt:  {fontSize:20},
  notice:     {marginHorizontal:16,marginBottom:12,padding:12,borderWidth:1,borderRadius:12},
  noticeTxt:  {fontSize:12,lineHeight:18},
  sumRow:     {flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:14},
  sc:         {flex:1,borderWidth:1,borderRadius:16,padding:12},
  scL:        {fontSize:9,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3},
  scV:        {fontSize:17,fontWeight:'800'},
  card:       {marginHorizontal:16,borderWidth:1,borderRadius:22,overflow:'hidden'},
  empty:      {padding:32,alignItems:'center',gap:8},
  emptyIco:   {fontSize:36,opacity:0.4},
  emptyT:     {fontSize:17,fontWeight:'700'},
  emptyS:     {fontSize:13,textAlign:'center'},
  brow:       {padding:16,borderBottomWidth:1},
  browTop:    {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  browL:      {flexDirection:'row',alignItems:'center',gap:10},
  browIco:    {width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},
  browNm:     {fontSize:14,fontWeight:'600'},
  browPc:     {fontSize:11,marginTop:1},
  browSp:     {fontSize:15,fontWeight:'700'},
  browLm:     {fontSize:11},
  track:      {height:5,borderRadius:3,overflow:'hidden'},
  fill:       {height:'100%',borderRadius:3},
  modal:      {flex:1,padding:20},
  modalHd:    {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  modalTitle: {fontSize:22,fontWeight:'800'},
  closeBtn:   {padding:4},
  lbl:        {fontSize:11,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',marginBottom:8},
  catBtn:     {height:34,paddingHorizontal:14,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  catTxt:     {fontSize:13,fontWeight:'600'},
  input:      {borderWidth:1,borderRadius:16,height:48,paddingHorizontal:14,fontSize:15,marginBottom:20},
  saveBtn:    {height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},
  saveTxt:    {fontSize:16,fontWeight:'700',color:'#0d0d0d'},
});
