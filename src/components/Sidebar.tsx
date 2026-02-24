import { useState } from 'react';
import { Plus, X, BarChart3, TrendingUp, Check } from 'lucide-react';
import { ViewMode } from '../App';
import clsx from 'clsx';

interface SidebarProps {
  tickers: string[];
  onAddTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  managers: { id: string; name: string }[];
  selectedManagers: string[];
  onToggleManager: (managerId: string) => void;
}

export function Sidebar({ 
  tickers, 
  onAddTicker, 
  onRemoveTicker, 
  viewMode, 
  onViewModeChange,
  managers,
  selectedManagers,
  onToggleManager
}: SidebarProps) {
  const [newTicker, setNewTicker] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTicker.trim()) {
      onAddTicker(newTicker.trim());
      setNewTicker('');
    }
  };

  return (
    <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">View Mode</h2>
        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800/50">
          <button
            onClick={() => onViewModeChange('portfolio')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'portfolio' 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Portfolio %
          </button>
          <button
            onClick={() => onViewModeChange('change')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'change' 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Change %
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Managers</h2>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {managers.map(manager => {
            const isSelected = selectedManagers.includes(manager.id);
            return (
              <button
                key={manager.id}
                onClick={() => onToggleManager(manager.id)}
                className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors text-left group"
              >
                <div className={clsx(
                  "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                  isSelected 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : "border-zinc-700 group-hover:border-zinc-500"
                )}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
                <span className={clsx(
                  "text-sm truncate",
                  isSelected ? "text-zinc-200" : "text-zinc-400"
                )}>
                  {manager.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-5">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Add Ticker</h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="e.g. AAPL"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 uppercase"
            />
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 p-1.5 rounded-md transition-colors border border-zinc-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Selected Tickers
            </h2>
            <span className="text-xs font-medium text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
              {tickers.length}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {tickers.map((ticker) => (
              <div 
                key={ticker}
                className="group flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 py-1 px-2.5 rounded-md text-sm text-zinc-300 hover:border-zinc-700 transition-colors"
              >
                <span className="font-mono font-medium">{ticker}</span>
                <button
                  onClick={() => onRemoveTicker(ticker)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
