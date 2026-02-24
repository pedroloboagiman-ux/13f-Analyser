import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: any, res: any) {
  const { manager_id } = req.query;
  
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

    res.status(200).json({ period, holdings: data });
  } catch (error: any) {
    console.error(`Error fetching data for ${manager_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
