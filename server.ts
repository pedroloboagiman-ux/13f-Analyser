import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

app.get('/api/dataroma/:manager_id', async (req, res) => {
  const { manager_id } = req.params;
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
