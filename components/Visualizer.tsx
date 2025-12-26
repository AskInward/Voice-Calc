import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryItem, OperationType } from '../types';

interface VisualizerProps {
  history: HistoryItem[];
  initialTotal: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ history }) => {
  // Compute running totals for the chart
  const data = React.useMemo(() => {
    let runningTotal = 0;
    const points = [{ name: 'Start', total: 0 }];

    history.forEach((h, idx) => {
        if (h.operation === OperationType.RESET) {
            runningTotal = 0;
        } else if (h.operation === OperationType.ADD) {
            runningTotal += h.value;
        } else if (h.operation === OperationType.SUBTRACT) {
            runningTotal -= h.value;
        } else if (h.operation === OperationType.MULTIPLY) {
            runningTotal *= h.value;
        } else if (h.operation === OperationType.DIVIDE) {
            // Avoid division by zero weirdness in chart
            if (h.value !== 0) runningTotal /= h.value;
        }
        points.push({ name: `${idx + 1}`, total: runningTotal });
    });
    return points;
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="w-full h-48 mt-4 bg-surface rounded-xl border border-gray-700 p-2 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" hide />
          <YAxis tick={{fill: '#94a3b8', fontSize: 10}} stroke="#475569" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ color: '#818cf8' }}
            formatter={(value: number) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), 'Total']}
          />
          <Area type="monotone" dataKey="total" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Visualizer;