// src/screens/MoreScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';

const CURRENCIES = [
  {sym:'₹',l:'INR ₹'},{sym:'$',l:'USD $'},{sym:'€',l:'EUR €'},
  {sym:'£',l:'GBP £'},{sym:'AED',l:'AED'},{sym:'CAD',l:'CAD'},
  {sym:'AUD',l:'AUD'},{sym:'¥',l:'JPY ¥'},
];

export default function MoreScreen({ navigation }) {
  const { user, validTx, currency, budgets, goals, overrides, setCurrency, signOut, doSync, syncing } = useApp();
  const { colors, isDark, toggle } = useTheme();
  const [smsOn, setSmsOn] = useState(true);

  const exportJSON = async () => {
    try {
      const data = JSON.stringify({ transactions:validTx, budgets, goals, currency, exportDate:new Date().toISOString() }, null, 2);
      await Share.share({ message: data, title: 'ACROM Backup' });
    } catch(e) { Alert.alert('Export Failed', e.message); }
  };

  const exportCSV = async () => {
    try {
      const header = 'Date,Merchant,Category,Type,Amount,Currency,Source\n';
      const rows = validTx.map(t =>
        `${new Date(t.timestamp).toLocaleDateString()},"${t.merchant}",${t.category},${t.type},${t.amount.toFixed(2)},${t.currency||currency},${t.source||'Manual'}`
      ).join('\n');
      await Share.share({ message: header+rows, title: 'ACROM Transactions.csv' });
    } catch(e) { Alert.alert('Export Failed', e.message); }
  };

  // Two-step logout confirmation
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => {
          Alert.alert(
            'Confirm Sign Out',
            'This will disconnect cloud sync. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, Sign Out', style: 'destructive', onPress: signOut },
            ]
          );
        }},
      ]
    );
  };

  const Row = ({ icon, iconBg, title, sub, right, onPress, danger }) => (
    <TouchableOpacity
      style={[s.sr, {borderBottomColor:colors.border}]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={s.srL}>
        <View style={[s.srIco, {backgroundColor: iconBg || colors.bg4}]}>
          <Text style={{fontSize:16}}>{icon}</Text>
        </View>
        <View style={s.srInfo}>
          <Text style={[s.srTitle, {color: danger ? colors.red : colors.t1}]}>{title}</Text>
          {sub ? <Text style={[s.srSub, {color:colors.t3}]}>{sub}</Text> : null}
        </View>
      </View>
      {right || (onPress ? <Text style={[s.srArr, {color:colors.t4}]}>›</Text> : null)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, {backgroundColor:colors.bg}]} edges={['top']}>
      <View style={s.hd}><Text style={[s.title, {color:colors.t1}]}>More</Text></View>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Theme */}
        <View style={s.sg}>
          <Text style={[s.sgLbl, {color:colors.t3}]}>Appearance</Text>
          <View style={[s.sgCard, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            <Row icon={isDark?'☀️':'🌙'} iconBg={colors.bg4}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              sub="Toggle app theme"
              right={<Switch value={!isDark} onValueChange={toggle}
                trackColor={{false:colors.bg4, true:colors.mint}} thumbColor="#fff"/>}/>
          </View>
        </View>

        {/* Account */}
        <View style={s.sg}>
          <Text style={[s.sgLbl, {color:colors.t3}]}>Account</Text>
          <View style={[s.sgCard, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            {user ? (
              <>
                <View style={[s.sr, {borderBottomColor:colors.border}]}>
                  <View style={s.srL}>
                    <View style={[s.srIco, {backgroundColor:colors.mintBg}]}>
                      <Text style={{fontSize:16}}>👤</Text>
                    </View>
                    <View style={s.srInfo}>
                      <Text style={[s.srTitle, {color:colors.t1}]}>{user.displayName||'User'}</Text>
                      <Text style={[s.srSub, {color:colors.t3}]}>{user.email}</Text>
                    </View>
                  </View>
                  <View style={[s.badge, {backgroundColor:colors.mintBg, borderColor:colors.mintBdr}]}>
                    <Text style={[s.badgeTxt, {color:colors.mint}]}>☁ Synced</Text>
                  </View>
                </View>
                <Row icon="↺" iconBg={colors.mintBg} title="Sync Now"
                  sub={syncing?'Syncing…':'Pull latest from cloud'} onPress={doSync}/>
                <Row icon="🚪" iconBg={colors.redBg} title="Sign Out" danger onPress={handleSignOut}/>
              </>
            ) : (
              <Row icon="🔐" iconBg={colors.blueBg} title="Sign In with Google"
                sub="Enable cloud sync" onPress={()=>navigation.navigate('Login')}/>
            )}
          </View>
        </View>

        {/* Currency */}
        <View style={s.sg}>
          <Text style={[s.sgLbl, {color:colors.t3}]}>Currency</Text>
          <View style={[s.sgCard, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding:12,gap:8}}>
              {CURRENCIES.map(c=>(
                <TouchableOpacity key={c.sym}
                  style={[s.curBtn, {
                    borderColor:colors.border2,
                    backgroundColor: currency===c.sym ? colors.mint : 'transparent'
                  }]}
                  onPress={()=>setCurrency(c.sym)}>
                  <Text style={[s.curTxt, {color: currency===c.sym ? '#0d0d0d' : colors.t2}]}>{c.l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Data Export */}
        <View style={s.sg}>
          <Text style={[s.sgLbl, {color:colors.t3}]}>Data Export</Text>
          <View style={[s.sgCard, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            <Row icon="📤" iconBg={colors.blueBg} title="Export as JSON" sub="Full backup file" onPress={exportJSON}/>
            <Row icon="📊" iconBg={colors.mintBg} title="Export as CSV" sub="Spreadsheet format" onPress={exportCSV}/>
          </View>
        </View>

        {/* About */}
        <View style={s.sg}>
          <Text style={[s.sgLbl, {color:colors.t3}]}>About</Text>
          <View style={[s.sgCard, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
            <View style={[s.sr, {borderBottomColor:'transparent'}]}>
              <View style={s.srInfo}>
                <Text style={[s.srTitle, {color:colors.t1}]}>ACROM AutoExpense v4.0</Text>
                <Text style={[s.srSub, {color:colors.t3}]}>Smart SMS Parsing · Private · Local + Cloud</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    {flex:1},
  hd:      {paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:   {fontSize:28,fontWeight:'800',letterSpacing:-0.8},
  sg:      {marginHorizontal:16,marginBottom:14},
  sgLbl:   {fontSize:11,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginBottom:8,paddingLeft:4},
  sgCard:  {borderWidth:1,borderRadius:20,overflow:'hidden'},
  sr:      {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1},
  srL:     {flexDirection:'row',alignItems:'center',gap:12,flex:1},
  srIco:   {width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},
  srInfo:  {flex:1},
  srTitle: {fontSize:14,fontWeight:'500',marginBottom:1},
  srSub:   {fontSize:12},
  srArr:   {fontSize:20},
  badge:   {borderWidth:1,paddingHorizontal:8,paddingVertical:3,borderRadius:20},
  badgeTxt:{fontSize:9,fontWeight:'700'},
  curBtn:  {height:34,paddingHorizontal:14,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  curTxt:  {fontSize:12,fontWeight:'600'},
});
