import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { supabase } from './supabaseClient.js';

const script = fileURLToPath(new URL('../scripts/price_import/northern_feed.py', import.meta.url));
const { stdout, stderr } = await promisify(execFile)(process.env.PRICE_IMPORT_PYTHON || 'python', ['-X', 'utf8', script], {
  maxBuffer: 128 * 1024 * 1024, timeout: 600000,
});
if (stderr) process.stderr.write(stderr);
const data = JSON.parse(stdout);
const tables = [['price_cities', 'cities', 'code'], ['retail_chains', 'chains', 'id'],
  ['retail_stores', 'stores', 'id'], ['retail_products', 'products', 'barcode'], ['retail_prices', 'prices', 'barcode,store_id']];
if (data.products.length < 100 || data.stores.length < 2) throw new Error('Incomplete feed; database not changed');
if (!process.argv.includes('--write')) {
  console.log(JSON.stringify({ dryRun: true, products: data.products.length, prices: data.prices.length, stores: data.stores.map(s => ({ name: s.name, city: s.city_name })) }));
} else {
  for (const [table, key, conflict] of tables) {
    for (let start = 0; start < data[key].length; start += 300) {
      const { error } = await supabase.from(table).upsert(data[key].slice(start, start + 300), { onConflict: conflict });
      if (error) throw error;
    }
  }
  console.log(JSON.stringify({ imported: true, products: data.products.length, prices: data.prices.length, stores: data.stores.length }));
}
