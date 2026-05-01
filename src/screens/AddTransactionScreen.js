import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import { parseMessage, generateTxId, CATEGORY_ICONS } from '../utils/parseEngine';

const CATEGORIES = Object.keys(CATEGORY_ICONS);
const SOURCES = ['Manual', 'SMS', 'Email', 'Notification'];

export default function AddTransactionScreen({ navigation }) {
  const { colors } = useTheme();
  const { addTransaction, currency, overrides } = useApp();

  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState('debit');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Others');
  const [source, setSource] = useState('Manual');

  const handlePaste = useCallback((text) => {
    setRawText(text);
    if (text.trim().length > 5) {
      const result = parseMessage(text, currency, overrides);
      setParsed(result);
      if (result) {
        setAmount(String(result.amount));
        setType(result.type);
        setMerchant(result.merchant || '');
        setCategory(result.category);
        setSource('SMS');
      }
    } else {
      setParsed(null);
    }
  }, [currency, overrides]);

  const handleAdd = useCallback(() => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing Merchant', 'Please enter a merchant name.');
      return;
    }

    const tx = {
      id: generateTxId(),
      timestamp: new Date().toISOString(),
      amount: num,
      currency,
      type,
      category,
      merchant: merchant.trim(),
      source,
      raw: rawText.slice(0, 200),
      is_dup: false,
    };

    addTransaction(tx);
    navigation.goBack();
  }, [amount, merchant, type, category, source, rawText, currency, addTransaction, navigation]);

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrap}
      >
        <View style={[styles.sheet, { backgroundColor: colors.bg2 }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.t1 }]}>Add Transaction</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ color: colors.t3, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Auto-parse */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Paste SMS / Email</Text>
            <TextInput
              value={rawText}
              onChangeText={handlePaste}
              placeholder="Paste message for auto-detection..."
              placeholderTextColor={colors.t4}
              multiline
              numberOfLines={3}
              style={[styles.textarea, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
            />
            {parsed && (
              <View style={[styles.previewBox, { backgroundColor: colors.mint + '15', borderColor: colors.mint }]}>
                <Text style={[styles.previewTxt, { color: colors.mint }]}>
                  ✓ Parsed: {parsed.type === 'debit' ? '-' : '+'}{parsed.currency}{parsed.amount} · {parsed.merchant} · {parsed.category}
                </Text>
              </View>
            )}

            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Amount *</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.t4}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
            />

            {/* Type */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Type</Text>
            <View style={styles.typeRow}>
              {['debit', 'credit'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: type === t
                        ? (t === 'debit' ? colors.red : colors.mint)
                        : colors.bg3,
                      borderColor: type === t
                        ? (t === 'debit' ? colors.red : colors.mint)
                        : colors.border,
                    },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnTxt, { color: type === t ? '#fff' : colors.t2 }]}>
                    {t === 'debit' ? '↑ Debit' : '↓ Credit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Merchant */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Merchant *</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="e.g. Swiggy, Amazon..."
              placeholderTextColor={colors.t4}
              style={[styles.input, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
            />

            {/* Category */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: category === c ? colors.blue : colors.bg3,
                        borderColor: category === c ? colors.blue : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[styles.catChipTxt, { color: category === c ? '#fff' : colors.t2 }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Source */}
            <Text style={[styles.fieldLabel, { color: colors.t3 }]}>Source</Text>
            <View style={styles.sourceRow}>
              {SOURCES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sourcePill, {
                    backgroundColor: source === s ? colors.yellow + '33' : colors.bg3,
                    borderColor: source === s ? colors.yellow : colors.border,
                  }]}
                  onPress={() => setSource(s)}
                >
                  <Text style={[styles.sourceTxt, { color: source === s ? colors.yellow : colors.t3 }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.mint }]}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnTxt}>Add Transaction</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  kavWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  textarea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  previewBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewTxt: { fontSize: 12, fontWeight: '600' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnTxt: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  catChipTxt: { fontSize: 12, fontWeight: '600' },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  sourceTxt: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnTxt: { fontSize: 16, fontWeight: '700', color: '#000' },
});
