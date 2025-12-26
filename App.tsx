import React, { useState, useCallback } from 'react';
import { OperationType, HistoryItem } from './types';
import { useLiveMath } from './hooks/useLiveMath';
import StatsPanel from './components/StatsPanel';
import HistoryTape from './components/HistoryTape';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>("");

  const handleOperation = useCallback((op: OperationType, value: number) => {
    setCurrentTotal((prevTotal) => {
      let newTotal = prevTotal;
      switch (op) {
        case OperationType.ADD:
          newTotal += value;
          break;
        case OperationType.SUBTRACT:
          newTotal -= value;
          break;
        case OperationType.MULTIPLY:
          newTotal *= value;
          break;
        case OperationType.DIVIDE:
          if (value !== 0) newTotal /= value;
          break;
        case OperationType.RESET:
          newTotal = 0;
          break;
      }

      // If reset, we might want to clear history or just add a reset marker
      if (op === OperationType.RESET) {
          setHistory([]); // Hard reset for this app
          return 0;
      } else {
        setHistory(prev => [
            ...prev, 
            { 
                id: crypto.randomUUID(), 
                operation: op, 
                value: value, 
                timestamp: Date.now() 
            }
        ]);
      }
      return newTotal;
    });
  }, []);

  const handleTranscript = useCallback((text: string) => {
      setLastTranscript(text);
  }, []);

  const { connect, disconnect, isConnected, isConnecting, error } = useLiveMath({
    onOperation: handleOperation,
    onTranscriptUpdate: handleTranscript
  });

  return (
    <div className="min-h-screen bg-dark text-gray-100 p-4 md:p-8 flex flex-col items-center font-sans">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Header Section */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              VoiceCalc AI
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              "Add 50", "Multiply by 2", "Minus 10"...
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-mono text-gray-400">
                {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </header>

        {/* Main Display - Sticky at top for mobile friendliness */}
        <div className="sticky top-4 z-10 bg-surface/95 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-2xl flex flex-col items-end">
            <span className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-2">Current Total</span>
            <div className="text-6xl md:text-8xl font-bold font-mono text-white tracking-tighter">
                {currentTotal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
             <div className="h-6 mt-2">
                 {lastTranscript && isConnected && (
                     <p className="text-sm text-primary animate-pulse font-mono">
                         Hearing: "{lastTranscript}"
                     </p>
                 )}
            </div>
        </div>

        {/* Error Message */}
        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm">
                Error: {error}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: History & Visuals */}
            <div className="lg:col-span-2 space-y-6">
                 {/* Visualizer Graph */}
                <Visualizer history={history} initialTotal={0} />

                 {/* Stats Panel */}
                <StatsPanel history={history} />
            </div>

            {/* Right Column: History List */}
            <div className="bg-surface rounded-2xl border border-gray-700 overflow-hidden flex flex-col h-[500px]">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <h3 className="font-semibold text-gray-200">Operation Tape</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <HistoryTape history={history} />
                </div>
            </div>
        </div>

        {/* Control Bar - Sticky Bottom */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            {!isConnected ? (
                <button 
                    onClick={connect}
                    disabled={isConnecting}
                    className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-indigo-600 active:scale-95 transition-all rounded-full shadow-lg shadow-indigo-500/30 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isConnecting ? (
                       <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                   ) : (
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                   )}
                   {isConnecting ? 'Connecting...' : 'Start Voice Session'}
                </button>
            ) : (
                <button 
                    onClick={disconnect}
                    className="flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 active:scale-95 transition-all rounded-full shadow-lg shadow-red-500/30 text-white font-bold text-lg"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   End Session
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default App;