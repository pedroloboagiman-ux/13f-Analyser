import { useMemo, useState } from 'react';
import { ViewMode, ManagerData } from '../App';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface DataTableProps {
  data: Record<string, ManagerData>;
  managers: { id: string; name: string }[];
  tickers: string[];
  viewMode: ViewMode;
}

function parseChange(changeStr: string): number {
  if (!changeStr) return 0;
  const match = changeStr.match(/([+-]?\d+\.?\d*)%/);
  if (match) {
    let val = parseFloat(match[1]);
    if (changeStr.toLowerCase().includes('reduce') || changeStr.toLowerCase().includes('sell')) {
      val = -Math.abs(val);
    }
    return val;
  }
  return 0;
}

function getAbsoluteChange(portfolioShare: number, changeStr: string): number {
  if (!changeStr) return 0;
  if (changeStr.toLowerCase().includes('new')) return portfolioShare;
  
  const match = changeStr.match(/([+-]?\d+\.?\d*)%/);
  if (match) {
    let c = parseFloat(match[1]) / 100;
    if (changeStr.toLowerCase().includes('reduce') || changeStr.toLowerCase().includes('sell')) {
      c = -Math.abs(c);
    }
    // P2 - P1 = P2 - P2 / (1 + c)
    // Absolute change in portfolio percentage points
    return portfolioShare - (portfolioShare / (1 + c));
  }
  return 0;
}

function getHeatmapStyle(value: number, min: number, max: number, mode: ViewMode): React.CSSProperties {
  if (value === 0) return {};

  if (mode === 'portfolio') {
    const intensity = Math.min(1, Math.max(0, value / (max || 1)));
    const alpha = 0.1 + (intensity * 0.8);
    return {
      backgroundColor: `rgba(16, 185, 129, ${alpha})`, // emerald-500
      color: intensity > 0.5 ? '#fff' : '#a7f3d0' // emerald-100 or white
    };
  } else {
    if (value > 0) {
      const intensity = Math.min(1, Math.max(0, value / (max || 1)));
      const alpha = 0.1 + (intensity * 0.8);
      return {
        backgroundColor: `rgba(16, 185, 129, ${alpha})`,
        color: intensity > 0.5 ? '#fff' : '#a7f3d0'
      };
    } else {
      const intensity = Math.min(1, Math.max(0, Math.abs(value) / (Math.abs(min) || 1)));
      const alpha = 0.1 + (intensity * 0.8);
      return {
        backgroundColor: `rgba(239, 68, 68, ${alpha})`, // red-500
        color: intensity > 0.5 ? '#fff' : '#fecaca' // red-200 or white
      };
    }
  }
}

export function DataTable({ data, managers, tickers, viewMode }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const tableData = useMemo(() => {
    let globalMax = 0;
    let globalMin = 0;

    const rows = tickers.map(ticker => {
      const rowData: Record<string, number> = {};
      let sum = 0;

      managers.forEach(manager => {
        const managerData = data[manager.id]?.[ticker];
        let val = 0;
        if (managerData) {
          if (viewMode === 'portfolio') {
            val = managerData.portfolio_share;
          } else if (viewMode === 'change') {
            val = parseChange(managerData.change);
          } else if (viewMode === 'absolute_change') {
            val = getAbsoluteChange(managerData.portfolio_share, managerData.change);
          }
        }
        
        rowData[manager.id] = val;
        sum += val;

        if (val > globalMax) globalMax = val;
        if (val < globalMin) globalMin = val;
      });

      return {
        ticker,
        values: rowData,
        sum,
        avg: managers.length > 0 ? sum / managers.length : 0
      };
    });

    let sortedRows = [...rows];
    if (sortConfig) {
      sortedRows.sort((a, b) => {
        let aVal: any;
        let bVal: any;
        if (sortConfig.key === 'ticker') {
          aVal = a.ticker;
          bVal = b.ticker;
        } else if (sortConfig.key === 'avg') {
          aVal = a.avg;
          bVal = b.avg;
        } else {
          aVal = a.values[sortConfig.key] || 0;
          bVal = b.values[sortConfig.key] || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Calculate column sums
    const colSums: Record<string, number> = {};
    managers.forEach(manager => {
      let colSum = 0;
      sortedRows.forEach(row => {
        const val = row.values[manager.id];
        if (val !== 0) {
          colSum += val;
        }
      });
      colSums[manager.id] = colSum;
    });

    return { rows: sortedRows, colSums, globalMax, globalMin };
  }, [data, managers, tickers, viewMode, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-emerald-400" />
      : <ArrowDown className="w-3 h-3 text-emerald-400" />;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-zinc-400 uppercase tracking-wider bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th 
                className="px-3 py-2.5 font-medium sticky left-0 bg-zinc-950/90 backdrop-blur z-10 border-r border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                onClick={() => handleSort('ticker')}
              >
                <div className="flex items-center justify-between gap-2">
                  Ticker
                  <SortIcon columnKey="ticker" />
                </div>
              </th>
              {managers.map(m => (
                <th 
                  key={m.id} 
                  className="px-3 py-2.5 font-medium text-right min-w-[100px] cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                  onClick={() => handleSort(m.id)}
                >
                  <div className="flex items-center justify-end gap-2">
                    <SortIcon columnKey={m.id} />
                    {m.name}
                  </div>
                </th>
              ))}
              <th 
                className="px-3 py-2.5 font-medium text-right bg-zinc-900/50 border-l border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                onClick={() => handleSort('avg')}
              >
                <div className="flex items-center justify-end gap-2">
                  <SortIcon columnKey="avg" />
                  Average
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {tableData.rows.map((row) => (
              <tr key={row.ticker} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-3 py-1.5 font-mono font-medium text-zinc-200 sticky left-0 bg-zinc-900 group-hover:bg-zinc-800/80 transition-colors border-r border-zinc-800 z-10">
                  {row.ticker}
                </td>
                {managers.map(m => {
                  const val = row.values[m.id];
                  return (
                    <td key={m.id} className="p-1">
                      <div 
                        className={clsx(
                          "px-2 py-1 rounded text-right font-mono text-[11px] transition-colors",
                          val === 0 && "text-zinc-600"
                        )}
                        style={getHeatmapStyle(val, tableData.globalMin, tableData.globalMax, viewMode)}
                      >
                        {val === 0 ? '-' : `${val > 0 && viewMode !== 'portfolio' ? '+' : ''}${val.toFixed(2)}%`}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-mono text-zinc-300 font-medium bg-zinc-900/30 border-l border-zinc-800 text-xs">
                  {row.avg === 0 ? '-' : `${row.avg > 0 && viewMode !== 'portfolio' ? '+' : ''}${row.avg.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-950/80 border-t border-zinc-800 text-zinc-400 font-medium text-xs">
            <tr>
              <td className="px-3 py-2.5 sticky left-0 bg-zinc-950/90 backdrop-blur z-10 border-r border-zinc-800">
                Sum
              </td>
              {managers.map(m => {
                const val = tableData.colSums[m.id];
                return (
                  <td key={m.id} className="px-3 py-2.5 text-right font-mono text-[11px]">
                    {val === 0 ? '-' : `${val > 0 && viewMode !== 'portfolio' ? '+' : ''}${val.toFixed(2)}%`}
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-right font-mono bg-zinc-900/50 border-l border-zinc-800 text-[11px]">
                -
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
