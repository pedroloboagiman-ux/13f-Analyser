import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const res = await axios.get('https://www.dataroma.com/m/m_activity.php?m=GA&typ=s', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    $('#grid tbody tr').slice(0, 5).each((i, el) => {
      console.log($(el).text().replace(/\s+/g, ' ').trim());
    });
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}
test();
