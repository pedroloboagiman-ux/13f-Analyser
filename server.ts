import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

app.get('/api/dataroma', async (req, res) => {
  const manager_id = req.query.manager_id as string;
  
  if (!manager_id) {
    return res.status(400).json({ error: 'Missing manager_id' });
  }

  try {
    const response = await axios.get(`https://www.dataroma.com/m/holdings.php?m=${manager_id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const data: Record<string, { portfolio_share: number; change: string }> = {};
    let period = '';

    const pText = $('p').first().text();
    const periodMatch = pText.match(/Period:\s*(.+)/);
    if (periodMatch) {
      period = periodMatch[1].trim();
    }

    $('#grid tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 4) {
        const stockText = $(tds[1]).find('a').text().trim();
        const ticker = stockText.split('-')[0].trim();
        const portfolioShareText = $(tds[2]).text().trim();
        const changeText = $(tds[3]).text().trim();

        if (ticker) {
          data[ticker] = {
            portfolio_share: parseFloat(portfolioShareText) || 0,
            change: changeText
          };
        }
      }
    });

    res.json({ period, holdings: data });
  } catch (error: any) {
    console.error(`Error fetching data for ${manager_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/api/history', async (req, res) => {
  const manager_id = req.query.manager_id as string;
  
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
    const activities: Record<string, Record<string, string>> = {};
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
          if (ticker && currentQuarter) {
            activities[currentQuarter][ticker] = changeText;
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

      const holdings: Record<string, { portfolio_share: number; change: string }> = {};
      $(el).find('td.sym').each((j, symEl) => {
        const ticker = $(symEl).find('a').text().trim();
        if (!ticker) return;
        
        const htmlContent = $(symEl).find('div').html() || '';
        const percentMatch = htmlContent.match(/<br>([\d.]+)%/);
        const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;
        
        // Find change from activity data
        let change = 'N/A';
        if (activities[periodCell] && activities[periodCell][ticker]) {
          change = activities[periodCell][ticker];
        }
        
        holdings[ticker] = {
          portfolio_share: percent,
          change: change
        };
      });

      quarters.push({
        period: periodCell,
        portfolio_value: valueCell,
        holdings
      });
    });

    res.json({ quarters });
  } catch (error: any) {
    console.error(`Error fetching history for ${manager_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

app.get('/api/quarters', async (req, res) => {
  try {
    const response = await axios.get(`https://www.dataroma.com/m/hist/p_hist.php?f=BRK`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const quarters: string[] = [];

    $('#grid tbody tr').each((i, el) => {
      const periodCell = $(el).find('td.period').text().trim().replace(/\s+/g, ' ');
      if (periodCell) {
        quarters.push(periodCell);
      }
    });

    res.json({ quarters });
  } catch (error: any) {
    console.error(`Error fetching quarters:`, error.message);
    res.status(500).json({ error: 'Failed to fetch quarters' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
