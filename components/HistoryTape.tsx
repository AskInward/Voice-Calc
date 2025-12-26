import React, { useEffect, useRef } from 'react';
import { HistoryItem, OperationType } from '../types';

interface HistoryTapeProps {
  history: HistoryItem[];
}

const getOpSymbol = (op: OperationType) => {
  switch (op) {
    case OperationType.ADD: return '+';
    case OperationType.SUBTRACT: return '-';
    case OperationType.MULTIPLY: return '×';
    case OperationType.DIVIDE: return '÷';
    case OperationType.RESET: return '↺';
    default: return '?';
  }
};

const HistoryTape: React.FC<HistoryTapeProps> = ({ history }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 italic">
        History is empty. Start speaking...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 p-2">
      {history.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center space-x-3">
             <span className={`flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold 
                ${item.operation === OperationType.ADD ? 'bg-blue-500/20 text-blue-400' : ''}
                ${item.operation === OperationType.SUBTRACT ? 'bg-red-500/20 text-red-400' : ''}
                ${item.operation === OperationType.MULTIPLY ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${item.operation === OperationType.DIVIDE ? 'bg-orange-500/20 text-orange-400' : ''}
                ${item.operation === OperationType.RESET ? 'bg-gray-500/20 text-gray-400' : ''}
             `}>
               {getOpSymbol(item.operation)}
             </span>
             <span className="text-gray-300 font-mono text-lg">{item.value.toLocaleString()}</span>
          </div>
          <span className="text-xs text-gray-600 font-mono">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default HistoryTape;