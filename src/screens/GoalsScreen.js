import React, { useState, useMemo } from 'react';
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
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { useTransactionStats } from '../hooks/useTransactionStats';
import { useDateHelpers } from '../hooks/useDateHelpers';
import { generateTxId } from '../utils/parseEngine';

// ─── Add Goal Modal ───────────────────────────────────────────────────────────

function AddGoalModal({ visible, onClose, onSave, colors }) {
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const handleSave = () => {
    const name = goalName.trim();
    const target = parseFloat(targetAmount);

    if (!name) {
      Alert.alert('Missing Name', 'Please give your goal a name.');
      return;
    }
    if (!target || target <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid target amount.');
      return;
    }

    onSave({ id: generateTxId(), name, targetAmount: target, createdAt: new Date().toISOString() });
    setGoalName('');
    setTargetAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.bg2 }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.t1 }]}>New Goal</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.t3, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.label, { color: colors.t3 }]}>Goal Name</Text>
          <TextInput
            value={goalName}
            onChangeText={setGoalName}
            placeholder="e.g. Emergency Fund, New Phone..."
            placeholderTextColor={colors.t4}
            style={[modalStyles.input, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
          />

          <Text style={[modalStyles.label, { color: colors.t3 }]}>Target Amount</Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="e.g. 50000"
            placeholderTextColor={colors.t4}
            keyboardType="decimal-pad"
            style={[modalStyles.input, { backgroundColor: colors.bg3, color: colors.t1, borderColor: colors.border }]}
          />

          <TouchableOpacity
            style={[modalStyles.saveBtn, { backgroundColor: colors.mint }]}
            onPress={handleSave}
          >
            <Text style={modalStyles.saveBtnText}>Create Goal</Text>
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
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 16 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, availableSavings, onDelete, format, colors }) {
  const progressAmount = Math.min(availableSavings, goal.targetAmount);
  const percentage =
    goal.targetAmount > 0
      ? Math.round((progressAmount / goal.targetAmount) * 100)
      : 0;

  const isComplete = percentage >= 100;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.nameRow}>
          <Text style={{ fontSize: 20 }}>{isComplete ? '🏆' : '🎯'}</Text>
          <Text style={[cardStyles.name, { color: colors.t1 }]}>{goal.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Delete Goal',
              `Delete "${goal.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ]
            )
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: colors.t4, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[cardStyles.track, { backgroundColor: colors.bg4 }]}>
        <View
          style={[
            cardStyles.fill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isComplete ? colors.mint : colors.blue,
            },
          ]}
        />
      </View>

      <View style={cardStyles.amountRow}>
        <Text style={[cardStyles.progress, { color: colors.t2 }]}>
          {format(progressAmount)}
        </Text>
        <Text style={[cardStyles.pct, { color: isComplete ? colors.mint : colors.t3 }]}>
          {percentage}%
        </Text>
        <Text style={[cardStyles.target, { color: colors.t3 }]}>
          of {format(goal.targetAmount)}
        </Text>
      </View>

      {isComplete && (
        <View style={[cardStyles.badge, { backgroundColor: colors.mint + '20' }]}>
          <Text style={[cardStyles.badgeText, { color: colors.mint }]}>
            ✓ Goal Achieved!
          </Text>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  progress: { fontSize: 13, fontWeight: '600' },
  pct: { fontSize: 13, fontWeight: '700' },
  target: { fontSize: 12 },
  badge: { marginTop: 10, padding: 8, borderRadius: 8, alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { validTx, goals, addGoal, deleteGoal } = useApp();
  const format = useFormatCurrency();
  const dateHelpers = useDateHelpers();

  const [showAddModal, setShowAddModal] = useState(false);

  // Available savings = total income minus total spending across all time
  const allTimeStats = useTransactionStats(validTx);
  const availableSavings = allTimeStats.net > 0 ? allTimeStats.net : 0;

  // Also show this month's numbers for context
  const { start, end } = dateHelpers.currentMonthRange();
  const monthTransactions = useMemo(
    () => validTx.filter((tx) => {
      const d = new Date(tx.timestamp);
      return d >= start && d <= end;
    }),
    [validTx, start, end]
  );
  const monthStats = useTransactionStats(monthTransactions);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.t1 }]}>Goals</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.mint }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ New Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Available Savings Card */}
        <View style={[styles.savingsCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[styles.savingsLabel, { color: colors.t3 }]}>Available Savings</Text>
          <Text style={[styles.savingsAmount, { color: colors.mint }]}>
            {format(availableSavings)}
          </Text>
          <Text style={[styles.savingsSubtitle, { color: colors.t4 }]}>
            This month: {format(monthStats.income)} earned · {format(monthStats.spent)} spent
          </Text>
        </View>

        {/* Goals */}
        <View style={styles.goalsContainer}>
          {goals.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏆</Text>
              <Text style={[styles.emptyTitle, { color: colors.t1 }]}>No goals yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.t3 }]}>
                Set a savings goal and track your progress here
              </Text>
            </View>
          ) : (
            goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                availableSavings={availableSavings}
                onDelete={() => deleteGoal(goal.id)}
                format={format}
                colors={colors}
              />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <AddGoalModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addGoal}
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
  savingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  savingsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  savingsSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  goalsContainer: { paddingHorizontal: 16 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
