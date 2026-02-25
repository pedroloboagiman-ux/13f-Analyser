import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const res = await axios.get('https://www.dataroma.com/m/holdings.php?m=BRK', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    $('#grid tbody tr').slice(0, 10).each((i, el) => {
      const tds = $(el).find('td');
      console.log($(tds[1]).text().trim(), '->', $(tds[3]).text().trim());
    });
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}
test();
