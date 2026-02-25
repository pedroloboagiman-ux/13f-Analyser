import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: any, res: any) {
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

    res.status(200).json({ quarters });
  } catch (error: any) {
    console.error(`Error fetching quarters:`, error.message);
    res.status(500).json({ error: 'Failed to fetch quarters' });
  }
}
