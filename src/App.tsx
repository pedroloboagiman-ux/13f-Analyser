import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { DataTable } from './components/DataTable';
import { Loader2, Calendar, ChevronDown } from 'lucide-react';

export const DEFAULT_MANAGERS = [
  { id: 'BRK', name: 'Warren Buffett (BRK)' },
  { id: 'GA', name: 'Greenhaven (GA)' },
  { id: 'ABC', name: 'David Abrams (ABC)' },
  { id: 'BAUPOST', name: 'Seth Klarman (BAUPOST)' },
  { id: 'GLRE', name: 'David Einhorn (GLRE)' },
  { id: 'PC', name: 'Norbert Lou (PC)' },
  { id: 'PSC', name: 'Bill Ackman (PSC)' },
  { id: 'PZFVX', name: 'Richard Pzena (PZFVX)' }
];

const DEFAULT_TICKERS = [
  'LEA', 'G', 'ARW', 'GOOGL', 'GOOG', 'GPN', 'C', 'JAZZ', 'SIG', 'FOR', 
  'ABG', 'BAX', 'DVA', 'STZ', 'PVH', 'PHM', 'GPK', 'CNXC', 'UNH', 'BRKB', 'ARE'
];

export type ViewMode = 'portfolio' | 'change' | 'absolute_change';
export type TabMode = 'my-selection' | 'all-holdings';

export interface ManagerData {
  [ticker: string]: {
    portfolio_share: number;
    change: string;
  };
}

export default function App() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [selectedManagers, setSelectedManagers] = useState<string[]>(DEFAULT_MANAGERS.map(m => m.id));
  const [viewMode, setViewMode] = useState<ViewMode>('portfolio');
  const [activeTab, setActiveTab] = useState<TabMode>('my-selection');
  const [data, setData] = useState<Record<string, ManagerData>>({});
  const [period, setPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [availableQuarters, setAvailableQuarters] = useState<string[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Latest');
  const [isQuarterDropdownOpen, setIsQuarterDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchQuarters() {
      try {
        const res = await fetch('/api/quarters');
        if (res.ok) {
          const json = await res.json();
          if (json.quarters) {
            setAvailableQuarters(json.quarters);
          }
        }
      } catch (e) {
        console.error("Failed to fetch quarters", e);
      }
    }
    fetchQuarters();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const newData: Record<string, ManagerData> = {};
      let commonPeriod = '';
      
      try {
        await Promise.all(
          DEFAULT_MANAGERS.map(async (manager) => {
            if (selectedQuarter === 'Latest') {
              const response = await fetch(`/api/dataroma?manager_id=${manager.id}`);
              if (response.ok) {
                const result = await response.json();
                newData[manager.id] = result.holdings;
                if (result.period && !commonPeriod) {
                  commonPeriod = result.period;
                }
              } else {
                newData[manager.id] = {};
              }
            } else {
              const response = await fetch(`/api/history?manager_id=${manager.id}`);
              if (response.ok) {
                const result = await response.json();
                const quarterData = result.quarters.find((q: any) => q.period === selectedQuarter);
                newData[manager.id] = quarterData ? quarterData.holdings : {};
                commonPeriod = selectedQuarter;
              } else {
                newData[manager.id] = {};
              }
            }
          })
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setData(newData);
        if (commonPeriod) setPeriod(commonPeriod);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedQuarter]);

  const handleAddTicker = (ticker: string) => {
    if (!tickers.includes(ticker.toUpperCase())) {
      setTickers([...tickers, ticker.toUpperCase()]);
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setTickers(tickers.filter(t => t !== ticker));
  };

  const handleClearTickers = () => {
    setTickers([]);
  };

  const handleToggleManager = (managerId: string) => {
    setSelectedManagers(prev => 
      prev.includes(managerId) 
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    );
  };

  const activeManagers = DEFAULT_MANAGERS.filter(m => selectedManagers.includes(m.id));

  const allHoldingsTickers = useMemo(() => {
    const tickerMap = new Map<string, number>();
    activeManagers.forEach(manager => {
      const managerHoldings = data[manager.id];
      if (managerHoldings) {
        Object.entries(managerHoldings).forEach(([ticker, holding]) => {
          const currentSum = tickerMap.get(ticker) || 0;
          tickerMap.set(ticker, currentSum + holding.portfolio_share);
        });
      }
    });
    
    return Array.from(tickerMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by total portfolio share descending
      .map(([ticker]) => ticker);
  }, [data, activeManagers]);

  const displayedTickers = activeTab === 'my-selection' ? tickers : allHoldingsTickers;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
      <Sidebar 
        tickers={tickers} 
        onAddTicker={handleAddTicker} 
        onRemoveTicker={handleRemoveTicker}
        onClearTickers={handleClearTickers}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        managers={DEFAULT_MANAGERS}
        selectedManagers={selectedManagers}
        onToggleManager={handleToggleManager}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <main className="flex-1 overflow-auto p-6 bg-zinc-950/50">
        <div className="max-w-[1600px] mx-auto">
          <header className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-zinc-100">
                {activeTab === 'my-selection' ? 'My Selection' : 'All Holdings'}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                {activeTab === 'my-selection' 
                  ? 'Dataroma Portfolio Analysis for selected tickers' 
                  : 'All stocks held by selected managers'}
                {selectedQuarter !== 'Latest' && ' (Top 20 Holdings Only)'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {period && selectedQuarter === 'Latest' && (
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800/50">
                  <Calendar className="w-4 h-4" />
                  <span>Period: {period}</span>
                </div>
              )}
              
              <div className="relative">
                <button 
                  onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  {selectedQuarter === 'Latest' ? 'Latest Quarter' : selectedQuarter}
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>
                
                {isQuarterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsQuarterDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                      <button
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${selectedQuarter === 'Latest' ? 'text-emerald-400 bg-zinc-800/50 font-medium' : 'text-zinc-300'}`}
                        onClick={() => {
                          setSelectedQuarter('Latest');
                          setIsQuarterDropdownOpen(false);
                        }}
                      >
                        Latest Quarter (Full)
                      </button>
                      <div className="h-px bg-zinc-800 my-1" />
                      {availableQuarters.map(q => (
                        <button
                          key={q}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${selectedQuarter === q ? 'text-emerald-400 bg-zinc-800/50 font-medium' : 'text-zinc-300'}`}
                          onClick={() => {
                            setSelectedQuarter(q);
                            setIsQuarterDropdownOpen(false);
                          }}
                        >
                          {q} (Top 20)
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
              <p className="text-sm text-zinc-500 font-medium">Fetching 13F data from Dataroma...</p>
            </div>
          ) : (
            <DataTable 
              data={data} 
              managers={activeManagers} 
              tickers={displayedTickers} 
              viewMode={viewMode} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
