import { useMemo } from 'react';
import { ViewMode, ManagerData } from '../App';
import clsx from 'clsx';

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
  const tableData = useMemo(() => {
    let globalMax = 0;
    let globalMin = 0;

    const rows = tickers.map(ticker => {
      const rowData: Record<string, number> = {};
      let sum = 0;
      let count = 0;

      managers.forEach(manager => {
        const managerData = data[manager.id]?.[ticker];
        let val = 0;
        if (managerData) {
          val = viewMode === 'portfolio' 
            ? managerData.portfolio_share 
            : parseChange(managerData.change);
        }
        
        rowData[manager.id] = val;
        sum += val;
        if (val !== 0) count++;

        if (val > globalMax) globalMax = val;
        if (val < globalMin) globalMin = val;
      });

      return {
        ticker,
        values: rowData,
        sum,
        avg: count > 0 ? sum / count : 0
      };
    });

    // Calculate column sums
    const colSums: Record<string, number> = {};
    managers.forEach(manager => {
      let colSum = 0;
      rows.forEach(row => {
        const val = row.values[manager.id];
        if (val !== 0) {
          colSum += val;
        }
      });
      colSums[manager.id] = colSum;
    });

    return { rows, colSums, globalMax, globalMin };
  }, [data, managers, tickers, viewMode]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-zinc-400 uppercase tracking-wider bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-2.5 font-medium sticky left-0 bg-zinc-950/90 backdrop-blur z-10 border-r border-zinc-800">
                Ticker
              </th>
              {managers.map(m => (
                <th key={m.id} className="px-3 py-2.5 font-medium text-right min-w-[100px]">
                  {m.name}
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium text-right bg-zinc-900/50 border-l border-zinc-800">
                Average
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
                        {val === 0 ? '-' : `${val > 0 && viewMode === 'change' ? '+' : ''}${val.toFixed(2)}%`}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-mono text-zinc-300 font-medium bg-zinc-900/30 border-l border-zinc-800 text-xs">
                  {row.avg === 0 ? '-' : `${row.avg > 0 && viewMode === 'change' ? '+' : ''}${row.avg.toFixed(2)}%`}
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
                    {val === 0 ? '-' : `${val > 0 && viewMode === 'change' ? '+' : ''}${val.toFixed(2)}%`}
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
