import React, { useMemo } from 'react';
import { Stats, HistoryItem } from '../types';

interface StatsPanelProps {
  history: HistoryItem[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ history }) => {
  const stats = useMemo<Stats>(() => {
    // We only calculate stats on the VALUES added/subtracted, 
    // effectively treating the calculator as a list builder.
    // Excluding resets.
    const values = history
        .filter(h => h.operation !== 'RESET' && h.operation !== 'UNKNOWN')
        .map(h => {
             // If operation was subtract, we might consider the value negative for summation context,
             // but usually stats like "Min/Max" refer to the input numbers themselves.
             // However, for a "Sum a bunch of numbers" app, we likely want the signed value.
             if (h.operation === 'SUBTRACT') return -h.value;
             // Logic: Times/Divide are transformations, not really "items in a set".
             // But let's include them as their impact value for now or filter them out.
             // Simplest for "Sum a bunch of numbers": Just take the signed magnitude.
             return h.value; 
        });

    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return { min, max, avg, median, count: values.length };
  }, [history]);

  const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className="bg-surface p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center shadow-lg">
      <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{label}</span>
      <span className={`text-2xl font-mono font-bold ${color}`}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-6">
      <StatCard label="Count" value={stats.count} color="text-gray-200" />
      <StatCard label="Average" value={stats.avg} color="text-blue-400" />
      <StatCard label="Median" value={stats.median} color="text-purple-400" />
      <StatCard label="Min / Max" value={`${stats.min} / ${stats.max}`} color="text-emerald-400" />
    </div>
  );
};

export default StatsPanel;