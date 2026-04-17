// src/screens/AddTransactionScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { parseMessage, generateTxId, CATEGORY_ICONS } from '../utils/parseEngine';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

export default function AddTransactionScreen({ navigation }) {
  const { addTransaction, currency, overrides } = useApp();
  const { colors } = useTheme();

  const [rawText, setRawText]   = useState('');
  const [amount,  setAmount]    = useState('');
  const [type,    setType]      = useState('debit');
  const [cat,     setCat]       = useState('Others');
  const [merchant,setMerchant]  = useState('');
  const [source,  setSource]    = useState('Manual');
  const [hint,    setHint]      = useState(null);

  const onRawChange = (text) => {
    setRawText(text);
    if (!text.trim()) { setHint(null); return; }
    const p = parseMessage(text, currency, overrides);
    if (p) {
      setAmount(String(p.amount));
      setType(p.type);
      setCat(p.category);
      setMerchant(p.merchant !== 'Unknown' ? p.merchant : '');
      setHint({ ok:true, msg:`✓ ${p.type} ${currency}${p.amount} · ${p.merchant} · ${p.category}` });
    } else {
      setHint({ ok:false, msg:'⚠ Could not parse — fill manually' });
    }
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Error','Enter a valid amount'); return; }

    const tx = {
      id:        generateTxId(),
      timestamp: new Date().toISOString(),
      amount:    amt,
      currency,
      type,
      category:  cat,
      merchant:  merchant.trim() || 'Unknown',
      source,
      raw:       rawText.slice(0,200),
      is_dup:    false,
    };
    await addTransaction(tx);
    navigation.goBack();
  };

  const Input = ({ label, children }) => (
    <View style={s.fg}>
      <Text style={[s.lbl, {color:colors.t3}]}>{label}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:colors.bg2}]} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.hd}>
          <Text style={[s.title,{color:colors.t1}]}>Add Transaction</Text>
          <TouchableOpacity onPress={()=>navigation.goBack()}>
            <Text style={{fontSize:22,color:colors.t2,padding:4}}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Auto-parse */}
          <Input label="AUTO-PARSE (paste SMS or email)">
            <TextInput
              style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
              placeholder="Paste bank SMS or email text..."
              placeholderTextColor={colors.t4}
              multiline numberOfLines={2}
              value={rawText} onChangeText={onRawChange}
            />
          </Input>
          {hint && (
            <View style={[s.hint,{backgroundColor:hint.ok?colors.mintBg:colors.yellowBg,
              borderColor:hint.ok?colors.mintBdr:colors.yellow+'44'}]}>
              <Text style={{color:hint.ok?colors.mint:colors.yellow,fontSize:13}}>{hint.msg}</Text>
            </View>
          )}

          <View style={s.divRow}>
            <View style={[s.divLine,{backgroundColor:colors.border}]}/>
            <Text style={[s.divTxt,{color:colors.t4}]}>OR MANUAL</Text>
            <View style={[s.divLine,{backgroundColor:colors.border}]}/>
          </View>

          {/* Amount + Type */}
          <View style={s.row2}>
            <View style={[s.fg,{flex:1}]}>
              <Text style={[s.lbl,{color:colors.t3}]}>AMOUNT ({currency})</Text>
              <TextInput
                style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
                keyboardType="decimal-pad" placeholder="0.00"
                placeholderTextColor={colors.t4}
                value={amount} onChangeText={setAmount}
              />
            </View>
            <View style={[s.fg,{flex:1}]}>
              <Text style={[s.lbl,{color:colors.t3}]}>TYPE</Text>
              <View style={s.typeRow}>
                {['debit','credit'].map(t=>(
                  <TouchableOpacity key={t}
                    style={[s.typeBtn,{flex:1,
                      backgroundColor: type===t?(t==='debit'?colors.redBg:colors.mintBg):colors.bg3,
                      borderColor: type===t?(t==='debit'?colors.redBdr:colors.mintBdr):colors.border2
                    }]}
                    onPress={()=>setType(t)}
                  >
                    <Text style={{fontSize:11,fontWeight:'700',color:type===t?(t==='debit'?colors.red:colors.mint):colors.t2}}>
                      {t==='debit'?'Spent':'Received'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Input label="MERCHANT / DESCRIPTION">
            <TextInput
              style={[s.input,{backgroundColor:colors.bg3,borderColor:colors.border2,color:colors.t1}]}
              placeholder="Amazon, Zomato, Netflix..."
              placeholderTextColor={colors.t4}
              value={merchant} onChangeText={setMerchant}
            />
          </Input>

          <Input label="CATEGORY">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:4}}>
              <View style={{flexDirection:'row',gap:6,paddingBottom:4}}>
                {CATS.map(c=>(
                  <TouchableOpacity key={c}
                    style={[s.catBtn,{borderColor:colors.border2,backgroundColor:cat===c?colors.mint:colors.bg3}]}
                    onPress={()=>setCat(c)}
                  >
                    <Text style={{fontSize:14}}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[s.catTxt,{color:cat===c?'#0d0d0d':colors.t2}]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Input>

          <Input label="SOURCE">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{flexDirection:'row',gap:6}}>
                {['Manual','SMS','Email','Notification'].map(src=>(
                  <TouchableOpacity key={src}
                    style={[s.pill,{borderColor:colors.border2,backgroundColor:source===src?colors.mint:colors.bg3}]}
                    onPress={()=>setSource(src)}
                  >
                    <Text style={{fontSize:12,fontWeight:'600',color:source===src?'#0d0d0d':colors.t2}}>{src}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Input>

          <TouchableOpacity
            style={[s.saveBtn,{backgroundColor:colors.mint}]}
            onPress={handleSave}
          >
            <Text style={s.saveTxt}>Add Transaction</Text>
          </TouchableOpacity>
          <View style={{height:32}}/>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    {flex:1},
  hd:      {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:14},
  title:   {fontSize:22,fontWeight:'800'},
  fg:      {paddingHorizontal:16,marginBottom:14},
  lbl:     {fontSize:10,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',marginBottom:7},
  input:   {borderWidth:1,borderRadius:14,height:46,paddingHorizontal:14,fontSize:15},
  hint:    {marginHorizontal:16,marginBottom:12,padding:10,borderWidth:1,borderRadius:12},
  divRow:  {flexDirection:'row',alignItems:'center',paddingHorizontal:16,marginBottom:14,gap:10},
  divLine: {flex:1,height:1},
  divTxt:  {fontSize:10,fontWeight:'700',letterSpacing:0.6},
  row2:    {flexDirection:'row',gap:10,paddingHorizontal:16,marginBottom:14},
  typeRow: {flexDirection:'row',gap:6,marginTop:4},
  typeBtn: {height:46,borderWidth:1,borderRadius:14,alignItems:'center',justifyContent:'center'},
  catBtn:  {flexDirection:'row',alignItems:'center',gap:5,height:36,paddingHorizontal:12,borderRadius:20,borderWidth:1},
  catTxt:  {fontSize:12,fontWeight:'600'},
  pill:    {height:34,paddingHorizontal:14,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  saveBtn: {marginHorizontal:16,marginTop:8,height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},
  saveTxt: {fontSize:16,fontWeight:'700',color:'#0d0d0d'},
});
