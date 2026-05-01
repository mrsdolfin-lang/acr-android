import { useMemo } from 'react';

export function useDateHelpers() {
  const helpers = useMemo(() => ({
    currentWeekRange() {
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
    currentMonthRange() {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    },
    previousMonthRange() {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
        end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    },
    currentYearRange() {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    },
    getGroupLabel(isoTimestamp) {
      const date = new Date(isoTimestamp);
      if (isNaN(date)) return 'Unknown';
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const txDay = new Date(date); txDay.setHours(0, 0, 0, 0);
      if (txDay.getTime() === today.getTime())     return 'Today';
      if (txDay.getTime() === yesterday.getTime()) return 'Yesterday';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatShort(isoTimestamp) {
      const date = new Date(isoTimestamp);
      if (isNaN(date)) return '';
      return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    },
    formatFull(isoTimestamp) {
      const date = new Date(isoTimestamp);
      if (isNaN(date)) return '';
      return date.toLocaleString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    },
    /** Returns ISO week label "Week 1", "Week 2" etc. for bar grouping */
    getWeekLabel(isoTimestamp) {
      const date = new Date(isoTimestamp);
      const dayOfMonth = date.getDate();
      return `Wk ${Math.ceil(dayOfMonth / 7)}`;
    },
    /** Returns abbreviated month name for year bar chart */
    getMonthLabel(isoTimestamp) {
      return new Date(isoTimestamp).toLocaleDateString('en-IN', { month: 'short' });
    },
    /** Returns day abbreviation for week bar chart */
    getDayLabel(isoTimestamp) {
      return new Date(isoTimestamp).toLocaleDateString('en-IN', { weekday: 'short' });
    },
  }), []);

  return helpers;
}
