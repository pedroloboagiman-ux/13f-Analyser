import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const res = await axios.get('https://www.dataroma.com/m/holdings.php?m=BRK', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const $ = cheerio.load(res.data);
  console.log("Title:", $('title').text());
  console.log("H1:", $('h1').text());
  console.log("H2:", $('h2').text());
  console.log("H3:", $('h3').text());
  console.log("div#title:", $('#title').text());
  console.log("div.f16:", $('.f16').text());
  console.log("p:", $('p').first().text());
  console.log("b:", $('b').first().text());
}
test();
