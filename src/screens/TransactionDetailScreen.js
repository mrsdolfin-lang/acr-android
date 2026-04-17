// src/screens/TransactionDetailScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

export default function TransactionDetailScreen({ route, navigation }) {
  const { txId } = route.params || {};
  const { validTx, deleteTransaction, saveOverride, currency } = useApp();
  const { colors } = useTheme();
  const tx = validTx.find(t => t.id === txId);

  if (!tx) {
    return (
      <SafeAreaView style={[s.safe,{backgroundColor:colors.bg}]}>
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:colors.t2}}>Transaction not found</Text>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={{marginTop:12}}>
            <Text style={{color:colors.mint}}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDebit = tx.type === 'debit';
  const fmt = v => currency + parseFloat(v||0).toFixed(2);

  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        await deleteTransaction(tx.id);
        navigation.goBack();
      }},
    ]);
  };

  const handleOverride = (newCat) => {
    Alert.alert('Update Category', `Change to "${newCat}" for all "${tx.merchant}" transactions?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Update', onPress: async () => {
        await saveOverride(tx.merchant, newCat);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:colors.bg2}]} edges={['top']}>
      <View style={s.hd}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
          <Text style={{fontSize:22,color:colors.t2}}>←</Text>
        </TouchableOpacity>
        <Text style={[s.hdTitle,{color:colors.t1}]}>Detail</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={{fontSize:13,color:colors.red,fontWeight:'600'}}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Amount card */}
        <View style={[s.amtCard,{backgroundColor:isDebit?colors.redBg:colors.mintBg,borderColor:isDebit?colors.redBdr:colors.mintBdr}]}>
          <Text style={{fontSize:44}}>{CATEGORY_ICONS[tx.category]||'📦'}</Text>
          <Text style={[s.amtVal,{color:isDebit?colors.red:colors.mint}]}>
            {isDebit?'−':'+'}{fmt(tx.amount)}
          </Text>
          <Text style={[s.amtMerch,{color:colors.t1}]}>{tx.merchant}</Text>
          <Text style={[s.amtTime,{color:colors.t3}]}>{new Date(tx.timestamp).toLocaleString()}</Text>
          <View style={s.chips}>
            <View style={[s.chip,{backgroundColor:colors.bg3,borderColor:colors.border}]}>
              <Text style={{fontSize:11,fontWeight:'600',color:colors.t1}}>{tx.category}</Text>
            </View>
            <View style={[s.chip,{backgroundColor:colors.bg3,borderColor:colors.border}]}>
              <Text style={{fontSize:11,fontWeight:'600',color:colors.t1}}>{tx.source||'Manual'}</Text>
            </View>
          </View>
        </View>

        {/* Raw text */}
        {!!tx.raw && (
          <View style={[s.rawCard,{backgroundColor:colors.bg,borderColor:colors.border}]}>
            <Text style={[s.rawLbl,{color:colors.t3}]}>ORIGINAL TEXT</Text>
            <Text style={[s.rawTxt,{color:colors.t2}]}>{tx.raw}</Text>
          </View>
        )}

        {/* Category override */}
        <View style={s.ovSec}>
          <Text style={[s.ovLbl,{color:colors.t3}]}>RECATEGORIZE (tap to change)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection:'row',gap:6,paddingBottom:4}}>
              {CATS.map(c=>(
                <TouchableOpacity key={c}
                  style={[s.ovBtn,{
                    borderColor:colors.border2,
                    backgroundColor: tx.category===c ? colors.mint : colors.bg3
                  }]}
                  onPress={()=>c!==tx.category&&handleOverride(c)}
                >
                  <Text style={{fontSize:13}}>{CATEGORY_ICONS[c]}</Text>
                  <Text style={{fontSize:11,fontWeight:'600',color:tx.category===c?'#0d0d0d':colors.t2}}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={{height:24}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    {flex:1},
  hd:      {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:14},
  hdTitle: {fontSize:17,fontWeight:'700'},
  amtCard: {margin:16,borderRadius:24,borderWidth:1,padding:24,alignItems:'center',gap:8},
  amtVal:  {fontSize:36,fontWeight:'900',letterSpacing:-1},
  amtMerch:{fontSize:18,fontWeight:'700'},
  amtTime: {fontSize:12},
  chips:   {flexDirection:'row',gap:8,marginTop:4},
  chip:    {paddingHorizontal:10,paddingVertical:3,borderRadius:20,borderWidth:1},
  rawCard: {marginHorizontal:16,marginBottom:14,padding:14,borderRadius:16,borderWidth:1},
  rawLbl:  {fontSize:10,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',marginBottom:6},
  rawTxt:  {fontSize:12,lineHeight:18},
  ovSec:   {paddingHorizontal:16,marginBottom:14},
  ovLbl:   {fontSize:10,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',marginBottom:10},
  ovBtn:   {flexDirection:'row',alignItems:'center',gap:5,height:34,paddingHorizontal:12,borderRadius:20,borderWidth:1},
});
