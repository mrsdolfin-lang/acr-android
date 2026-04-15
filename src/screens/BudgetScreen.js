// src/screens/BudgetScreen.js
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

async function sendBudgetAlert(category, pct, amount, limit, currency) {
  await Notifications.requestPermissionsAsync();
  const isOver = pct >= 100;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isOver ? `🚨 Budget Exceeded — ${category}` : `⚠️ Budget Warning — ${category}`,
      body:  isOver
        ? `You have exceeded your ${category} budget of ${currency}${limit}. Spent: ${currency}${amount.toFixed(0)}`
        : `You've used ${pct.toFixed(0)}% of your ${category} budget. ${currency}${(limit-amount).toFixed(0)} remaining.`,
      sound: true,
    },
    trigger: null, // immediate
  });
}

export default function BudgetScreen() {
  const { validTx, budgets, currency, saveBudget, deleteBudget } = useApp();
  const { colors } = useTheme();
  const [modal,  setModal]  = useState(false);
  const [selCat, setSelCat] = useState('Food');
  const [limAmt, setLimAmt] = useState('');

  const fmtS = v => { v=parseFloat(v||0); return v>=1000?currency+(v/1000).toFixed(1)+'k':currency+v.toFixed(0); };
  const fmt  = v => currency+parseFloat(v||0).toFixed(2);

  const monthSpent = useMemo(()=>{
    const now=new Date(), map={};
    validTx.filter(t=>{
      const d=new Date(t.timestamp);
      return t.type==='debit' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
    return map;
  },[validTx]);

  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const totalSpent  = Object.keys(budgets).reduce((s,c)=>s+(monthSpent[c]||0),0);

  const handleSave = async () => {
    const amt = parseFloat(limAmt);
    if (!amt||amt<=0) { Alert.alert('Enter a valid amount'); return; }
    await saveBudget(selCat, amt);
    setModal(false); setLimAmt('');
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}>
        <Text style={s.title}>Budget</Text>
        <TouchableOpacity style={s.addBtn} onPress={()=>setModal(true)}>
          <Text style={[s.addBtnTxt,{color:colors.mint}]}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.notice,{backgroundColor:colors.blueBg,borderColor:colors.blue+'33'}]}>
        <Text style={[s.noticeTxt,{color:colors.blue}]}>
          Set monthly spending limits. You will receive a push notification alert at 80% and 100%.
        </Text>
      </View>

      <View style={s.sumRow}>
        {[
          {l:'Budget', v:fmtS(totalBudget),  c:colors.yellow},
          {l:'Spent',  v:fmtS(totalSpent),   c:colors.red},
          {l:'Left',   v:fmtS(Math.max(totalBudget-totalSpent,0)), c:colors.mint},
        ].map((sc,i)=>(
          <View key={i} style={s.sc}>
            <Text style={[s.scL,{color:colors.t3}]}>{sc.l}</Text>
            <Text style={[s.scV,{color:sc.c}]}>{sc.v}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {Object.keys(budgets).length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIco}>🎯</Text>
              <Text style={[s.emptyT,{color:colors.t1}]}>No budget set</Text>
              <Text style={[s.emptyS,{color:colors.t2}]}>Tap + to add spending limits</Text>
            </View>
          ) : (
            Object.entries(budgets).map(([cat,limit])=>{
              const spent = monthSpent[cat]||0;
              const pct   = Math.min((spent/limit)*100, 100);
              const clr   = pct>=100?colors.red:pct>=80?colors.yellow:colors.mint;

              // Send notification if threshold crossed
              if (pct>=80) {
                sendBudgetAlert(cat, pct, spent, limit, currency).catch(()=>{});
              }

              return (
                <View key={cat} style={s.brow}>
                  <View style={s.browTop}>
                    <View style={s.browL}>
                      <View style={[s.browIco,{backgroundColor:colors.mintBg}]}>
                        <Text style={{fontSize:14}}>{CATEGORY_ICONS[cat]||'📦'}</Text>
                      </View>
                      <View>
                        <Text style={[s.browNm,{color:colors.t1}]}>{cat}</Text>
                        <Text style={[s.browPc,{color:colors.t3}]}>{pct.toFixed(0)}% used</Text>
                      </View>
                    </View>
                    <View style={{alignItems:'flex-end'}}>
                      <Text style={[s.browSp,{color:clr}]}>{fmt(spent)}</Text>
                      <Text style={[s.browLm,{color:colors.t3}]}>of {fmt(limit)}</Text>
                    </View>
                  </View>
                  <View style={[s.track,{backgroundColor:colors.bg4}]}>
                    <View style={[s.fill,{width:`${pct.toFixed(1)}%`,backgroundColor:clr}]}/>
                  </View>
                  <TouchableOpacity
                    onPress={()=>Alert.alert('Remove Budget',`Remove ${cat} budget?`,[
                      {text:'Cancel'},
                      {text:'Remove',style:'destructive',onPress:()=>deleteBudget(cat)}
                    ])}
                    style={{alignSelf:'flex-end',marginTop:4}}
                  >
                    <Text style={{fontSize:11,color:colors.t4}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{height:24}}/>
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(false)}>
        <View style={[s.modal,{backgroundColor:colors.bg2}]}>
          <View style={s.modalHd}>
            <Text style={[s.modalTitle,{color:colors.t1}]}>Set Budget Limit</Text>
            <TouchableOpacity onPress={()=>setModal(false)}>
              <Text style={{fontSize:18,color:colors.t2,padding:4}}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.lbl,{color:colors.t2}]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={{flexDirection:'row',gap:6}}>
              {CATS.map(c=>(
                <TouchableOpacity
                  key={c}
                  style={[s.catBtn,{borderColor:colors.border2,backgroundColor:selCat===c?colors.mint:'transparent'}]}
                  onPress={()=>setSelCat(c)}
                >
                  <Text style={[s.catTxt,{color:selCat===c?'#0d0d0d':colors.t2}]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[s.lbl,{color:colors.t2}]}>Monthly Limit ({currency})</Text>
          <TextInput
            style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000"
            placeholderTextColor={colors.t4}
            value={limAmt}
            onChangeText={setLimAmt}
          />
          <TouchableOpacity style={[s.saveBtn,{backgroundColor:colors.mint}]} onPress={handleSave}>
            <Text style={s.saveTxt}>Save Budget</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    safe:       {flex:1, backgroundColor:c.bg},
    hd:         {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:10, paddingBottom:14},
    title:      {fontSize:28, fontWeight:'800', color:c.t1, letterSpacing:-0.8},
    addBtn:     {width:38, height:38, borderRadius:19, backgroundColor:c.mintBg, borderWidth:1, borderColor:c.mintBdr, alignItems:'center', justifyContent:'center'},
    addBtnTxt:  {fontSize:20},
    notice:     {marginHorizontal:16, marginBottom:12, padding:12, borderWidth:1, borderRadius:12},
    noticeTxt:  {fontSize:13},
    sumRow:     {flexDirection:'row', gap:10, paddingHorizontal:16, marginBottom:14},
    sc:         {flex:1, backgroundColor:c.bg2, borderWidth:1, borderColor:c.border, borderRadius:16, padding:14},
    scL:        {fontSize:10, textTransform:'uppercase', marginBottom:4, letterSpacing:0.5},
    scV:        {fontSize:18, fontWeight:'800'},
    card:       {marginHorizontal:16, backgroundColor:c.bg2, borderWidth:1, borderColor:c.border, borderRadius:22, overflow:'hidden'},
    empty:      {padding:32, alignItems:'center', gap:8},
    emptyIco:   {fontSize:36, opacity:0.4},
    emptyT:     {fontSize:17, fontWeight:'700'},
    emptyS:     {fontSize:13, textAlign:'center'},
    brow:       {padding:16, borderBottomWidth:1, borderBottomColor:c.border},
    browTop:    {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8},
    browL:      {flexDirection:'row', alignItems:'center', gap:10},
    browIco:    {width:30, height:30, borderRadius:10, alignItems:'center', justifyContent:'center'},
    browNm:     {fontSize:14, fontWeight:'600'},
    browPc:     {fontSize:11, marginTop:1},
    browSp:     {fontSize:14, fontWeight:'700'},
    browLm:     {fontSize:11},
    track:      {height:5, borderRadius:3, overflow:'hidden'},
    fill:       {height:'100%', borderRadius:3},
    modal:      {flex:1, padding:20},
    modalHd:    {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20},
    modalTitle: {fontSize:22, fontWeight:'800'},
    lbl:        {fontSize:11, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase', marginBottom:8},
    catBtn:     {height:34, paddingHorizontal:14, borderRadius:20, borderWidth:1, alignItems:'center', justifyContent:'center'},
    catTxt:     {fontSize:13, fontWeight:'600'},
    input:      {borderWidth:1, borderRadius:16, height:48, paddingHorizontal:14, fontSize:15, marginBottom:20},
    saveBtn:    {height:52, borderRadius:18, alignItems:'center', justifyContent:'center'},
    saveTxt:    {fontSize:16, fontWeight:'700', color:'#0d0d0d'},
  });
}
