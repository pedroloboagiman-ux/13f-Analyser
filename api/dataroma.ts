import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: any, res: any) {
  const { manager_id } = req.query;
  
  if (!manager_id) {
    return res.status(400).json({ error: 'Missing manager_id' });
  }

  try {
    const [holdingsResponse, activityResponse] = await Promise.all([
      axios.get(`https://www.dataroma.com/m/holdings.php?m=${manager_id}`, {
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

    // Parse activity data for the latest quarter
    const $activity = cheerio.load(activityResponse.data);
    const latestActivities: Record<string, { change: string; abs_change: number }> = {};
    let isFirstQuarter = true;

    $activity('#grid tbody tr').each((i, el) => {
      const isQuarterRow = $activity(el).find('td').length === 1 && $activity(el).find('td').attr('colspan') === '5';
      if (isQuarterRow) {
        if (i > 0) isFirstQuarter = false;
      } else if (isFirstQuarter) {
        const tds = $activity(el).find('td');
        if (tds.length >= 4) {
          const stockText = $activity(tds[1]).find('a').text().trim();
          const ticker = stockText.split('-')[0].trim();
          const changeText = $activity(tds[2]).text().trim();
          const absChangeText = $activity(tds[4]).text().trim();
          
          if (ticker) {
            let absChange = parseFloat(absChangeText) || 0;
            if (changeText.toLowerCase().includes('reduce') || changeText.toLowerCase().includes('sell')) {
              absChange = -Math.abs(absChange);
            }
            latestActivities[ticker] = {
              change: changeText,
              abs_change: absChange
            };
          }
        }
      }
    });

    const $ = cheerio.load(holdingsResponse.data);
    const data: Record<string, { portfolio_share: number; change: string; abs_change: number }> = {};
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
        
        if (ticker) {
          const activity = latestActivities[ticker] || { change: '', abs_change: 0 };
          data[ticker] = {
            portfolio_share: parseFloat(portfolioShareText) || 0,
            change: activity.change,
            abs_change: activity.abs_change
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
