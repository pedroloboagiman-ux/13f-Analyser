import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: any, res: any) {
  const { manager_id } = req.query;
  
  if (!manager_id) {
    return res.status(400).json({ error: 'Missing manager_id' });
  }

  try {
    const [historyResponse, activityResponse] = await Promise.all([
      axios.get(`https://www.dataroma.com/m/hist/p_hist.php?f=${manager_id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }),
      axios.get(`https://www.dataroma.com/m/m_activity.php?m=${manager_id}&typ=a`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
    ]);
    
    // Parse activity data
    const $activity = cheerio.load(activityResponse.data);
    const activities: Record<string, Record<string, { change: string; abs_change: number }>> = {};
    let currentQuarter = '';

    $activity('#grid tbody tr').each((i, el) => {
      const isQuarterRow = $activity(el).find('td').length === 1 && $activity(el).find('td').attr('colspan') === '5';
      if (isQuarterRow) {
        const rawQuarter = $activity(el).text().trim().replace(/\s+/g, ' ');
        // Convert "Q4 2025" to "2025 Q4" to match the history page format
        const match = rawQuarter.match(/(Q\d)\s+(\d{4})/);
        if (match) {
          currentQuarter = `${match[2]} ${match[1]}`;
        } else {
          currentQuarter = rawQuarter;
        }
        activities[currentQuarter] = {};
      } else {
        const tds = $activity(el).find('td');
        if (tds.length >= 4) {
          const stockText = $activity(tds[1]).find('a').text().trim();
          const ticker = stockText.split('-')[0].trim();
          const changeText = $activity(tds[2]).text().trim();
          const absChangeText = $activity(tds[4]).text().trim();
          
          if (ticker && currentQuarter) {
            let absChange = parseFloat(absChangeText) || 0;
            if (changeText.toLowerCase().includes('reduce') || changeText.toLowerCase().includes('sell')) {
              absChange = -Math.abs(absChange);
            }
            activities[currentQuarter][ticker] = {
              change: changeText,
              abs_change: absChange
            };
          }
        }
      }
    });

    // Parse history data
    const $ = cheerio.load(historyResponse.data);
    const quarters: any[] = [];

    $('#grid tbody tr').each((i, el) => {
      const periodCell = $(el).find('td.period').text().trim().replace(/\s+/g, ' ');
      const valueCell = $(el).find('td').eq(1).text().trim();
      
      if (!periodCell) return;

      const holdings: Record<string, { portfolio_share: number; change: string; abs_change: number }> = {};
      $(el).find('td.sym').each((j, symEl) => {
        const ticker = $(symEl).find('a').text().trim();
        if (!ticker) return;
        
        const htmlContent = $(symEl).find('div').html() || '';
        const percentMatch = htmlContent.match(/<br>([\d.]+)%/);
        const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;
        
        // Find change from activity data
        let change = 'N/A';
        let abs_change = 0;
        if (activities[periodCell] && activities[periodCell][ticker]) {
          change = activities[periodCell][ticker].change;
          abs_change = activities[periodCell][ticker].abs_change;
        }
        
        holdings[ticker] = {
          portfolio_share: percent,
          change: change,
          abs_change: abs_change
        };
      });

      quarters.push({
        period: periodCell,
        portfolio_value: valueCell,
        holdings
      });
    });

    res.status(200).json({ quarters });
  } catch (error: any) {
    console.error(`Error fetching history for ${manager_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
}
