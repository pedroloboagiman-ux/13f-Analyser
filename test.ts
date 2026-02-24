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
    const rows = $('#grid tbody tr').slice(0, 5).map((i, el) => {
      return $(el).text().replace(/\s+/g, ' ').trim();
    }).get();
    console.log("Rows:", rows);
    
    // Let's also get the exact HTML of the first row to see the structure
    console.log("First row HTML:", $('#grid tbody tr').first().html());
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
