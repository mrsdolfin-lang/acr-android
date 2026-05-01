import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { useDateHelpers } from '../hooks/useDateHelpers';
import { BUDGET_ALERT_THRESHOLDS, TRANSACTION_TYPES } from '../constants';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATEGORIES = Object.keys(CATEGORY_ICONS);

// ─── Notification Setup ───────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function sendBudgetNotification(category, percentage) {
  const isOver = percentage >= BUDGET_ALERT_THRESHOLDS.CRITICAL;
  const emoji = CATEGORY_ICONS[category] || '📦';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isOver
        ? `${emoji} Budget Exceeded — ${category}`
        : `${emoji} Budget Warning — ${category}`,
      body: isOver
        ? `You've exceeded your ${category} budget (${percentage}% used).`
        : `You've used ${percentage}% of your ${category} budget.`,
    },
    trigger: null, // immediate
  });
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function BudgetProgressBar({ percentage, colors }) {
  let fillColor = colors.mint;
  if (percentage >= BUDGET_ALERT_THRESHOLDS.CRITICAL) fillColor = colors.red;
  else if (percentage >= BUDGET_ALERT_THRESHOLDS.WARNING) fillColor = colors.yellow;

  return (
    <View style={[progressStyles.track, { backgroundColor: colors.bg4 }]}>
      <View
        style={[
          progressStyles.fill,
          {
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({ category, budgetAmount, spentAmount, onDelete, format, colors }) {
  const percentage = budgetAmount > 0
    ? Math.round((spentAmount / budgetAmount) * 100)
    : 0;
  const remaining = budgetAmount - spentAmount;
  const isOver = percentage >= BUDGET_ALERT_THRESHOLDS.CRITICAL;
  const isWarning = percentage >= BUDGET_ALERT_THRESHOLDS.WARNING && !isOver;

  const statusColor = isOver ? colors.red : isWarning ? colors.yellow : colors.mint;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.labelRow}>
          <Text style={cardStyles.emoji}>{CATEGORY_ICONS[category] || '📦'}</Text>
          <Text style={[cardStyles.category, { color: colors.t1 }]}>{category}</Text>
        </View>
        <View style={cardStyles.actions}>
          <View style={[cardStyles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[cardStyles.statusText, { color: statusColor }]}>{percentage}%</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Remove Budget',
                `Remove the ${category} budget?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onDelete },
                ]
              )
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: colors.t4, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BudgetProgressBar percentage={percentage} colors={colors} />

      <View style={cardStyles.amountRow}>
        <Text style={[cardStyles.spent, { color: colors.t2 }]}>
          {format(spentAmount)} spent
        </Text>
        <Text style={[cardStyles.remaining, { color: remaining >= 0 ? colors.t3 : colors.red }]}>
          {remaining >= 0 ? `${format(remaining)} left` : `${format(Math.abs(remaining))} over`}
        </Text>
        <Text style={[cardStyles.budget, { color: colors.t3 }]}>of {format(budgetAmount)}</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 18 },
  category: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  amountRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  spent: { fontSize: 12, fontWeight: '600' },
  remaining: { fontSize: 12 },
  budget: { fontSize: 12 },
});

// ─── Add Budget Modal ─────────────────────────────────────────────────────────

function AddBudgetModal({ visible, onClose, onSave, existingCategories, colors }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [inputAmount, setInputAmount] = useState('');

  const availableCategories = CATEGORIES.filter(
    (c) => !existingCategories.includes(c)
  );

  const handleSave = () => {
    const amount = parseFloat(inputAmount);
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a category first.');
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
      return;
    }
    onSave(selectedCategory, amount);
    setSelectedCategory('');
    setInputAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.bg2 }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.t1 }]}>Set Budget</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.t3, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.label, { color: colors.t3 }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      modalStyles.catChip,
                      {
                        backgroundColor: isSelected ? colors.mint : colors.bg3,
                        borderColor: isSelected ? colors.mint : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[cat]}</Text>
                    <Text
                      style={[
                        modalStyles.catChipText,
                        { color: isSelected ? '#000' : colors.t2 },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={[modalStyles.label, { color: colors.t3 }]}>Monthly Budget</Text>
          <TextInput
            value={inputAmount}
            onChangeText={setInputAmount}
            placeholder="e.g. 5000"
            placeholderTextColor={colors.t4}
            keyboardType="decimal-pad"
            style={[modalStyles.input, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
          />

          <TouchableOpacity
            style={[modalStyles.saveBtn, { backgroundColor: colors.mint }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={modalStyles.saveBtnText}>Save Budget</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, gap: 5 },
  catChipText: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 16 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const { colors } = useTheme();
  const { validTx, budgets, saveBudget, deleteBudget } = useApp();
  const format = useFormatCurrency();
  const dateHelpers = useDateHelpers();

  const [showAddModal, setShowAddModal] = useState(false);

  /**
   * Track which alerts have been sent this session.
   * Using useRef prevents re-renders and ensures the Set persists between renders.
   */
  const sentAlertKeys = useRef(new Set());

  // Current month debit transactions only
  const { start, end } = dateHelpers.currentMonthRange();
  const monthlyDebits = validTx.filter((tx) => {
    const date = new Date(tx.timestamp);
    return tx.type === TRANSACTION_TYPES.DEBIT && date >= start && date <= end;
  });

  // Compute spending per category for this month
  const spentByCategory = monthlyDebits.reduce((acc, tx) => {
    const cat = tx.category || 'Others';
    acc[cat] = (acc[cat] || 0) + tx.amount;
    return acc;
  }, {});

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalSpent = Object.keys(budgets).reduce(
    (s, cat) => s + (spentByCategory[cat] || 0),
    0
  );
  const totalLeft = totalBudget - totalSpent;

  // Fire notifications when thresholds are crossed — once per threshold per session
  useEffect(() => {
    if (Object.keys(budgets).length === 0) return;

    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      for (const [category, budgetAmount] of Object.entries(budgets)) {
        const spent = spentByCategory[category] || 0;
        if (budgetAmount <= 0) continue;

        const percentage = Math.round((spent / budgetAmount) * 100);
        const warningKey = `${category}_${BUDGET_ALERT_THRESHOLDS.WARNING}`;
        const criticalKey = `${category}_${BUDGET_ALERT_THRESHOLDS.CRITICAL}`;

        if (
          percentage >= BUDGET_ALERT_THRESHOLDS.CRITICAL &&
          !sentAlertKeys.current.has(criticalKey)
        ) {
          sentAlertKeys.current.add(criticalKey);
          await sendBudgetNotification(category, percentage);
        } else if (
          percentage >= BUDGET_ALERT_THRESHOLDS.WARNING &&
          !sentAlertKeys.current.has(warningKey)
        ) {
          sentAlertKeys.current.add(warningKey);
          await sendBudgetNotification(category, percentage);
        }
      }
    })();
  }, [budgets, spentByCategory]);

  const budgetCategories = Object.keys(budgets);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.t1 }]}>Budget</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.mint }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Set Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Notification notice */}
        <View style={[styles.notice, { backgroundColor: colors.blue + '15', borderColor: colors.blue + '40' }]}>
          <Text style={[styles.noticeText, { color: colors.blue }]}>
            🔔 You'll get one notification at 80% and one at 100% per category per session.
          </Text>
        </View>

        {/* Summary */}
        {budgetCategories.length > 0 && (
          <View style={[styles.summaryRow, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.t3 }]}>Budget</Text>
              <Text style={[styles.summaryValue, { color: colors.t1 }]}>{format(totalBudget)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.t3 }]}>Spent</Text>
              <Text style={[styles.summaryValue, { color: colors.red }]}>{format(totalSpent)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.t3 }]}>Left</Text>
              <Text style={[styles.summaryValue, { color: totalLeft >= 0 ? colors.mint : colors.red }]}>
                {format(totalLeft)}
              </Text>
            </View>
          </View>
        )}

        {/* Budget Cards */}
        <View style={styles.cardsContainer}>
          {budgetCategories.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🎯</Text>
              <Text style={[styles.emptyTitle, { color: colors.t1 }]}>No budgets set</Text>
              <Text style={[styles.emptySubtitle, { color: colors.t3 }]}>
                Set category budgets to track your spending limits
              </Text>
            </View>
          ) : (
            budgetCategories.map((category) => (
              <BudgetCard
                key={category}
                category={category}
                budgetAmount={budgets[category]}
                spentAmount={spentByCategory[category] || 0}
                onDelete={() => deleteBudget(category)}
                format={format}
                colors={colors}
              />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <AddBudgetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={saveBudget}
        existingCategories={budgetCategories}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { fontSize: 13, fontWeight: '700', color: '#000' },
  notice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: { fontSize: 12, lineHeight: 18 },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, marginHorizontal: 8 },
  cardsContainer: { paddingHorizontal: 16 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
