// שרת SuperNav AI — Express + סופרבייס (Postgres אמיתי, לא קובץ-JSON
// מקומי יותר) — ר' server/supabaseClient.js ו-server/supabase-schema.sql.

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/household.js';
import groupsRoutes from './routes/groups.js';
import productRoutes from './routes/products.js';
import imageSearchRoutes from './routes/imageSearch.js';
import venueRoutes from './routes/venues.js';
import tripRoutes from './routes/trips.js';
import priceObservationRoutes from './routes/priceObservations.js';
import priceImportRoutes from './routes/priceImport.js';
import dealsRoutes from './routes/deals.js';
import recognizeProductRoutes from './routes/recognizeProduct.js';
import priceDataRoutes from './routes/priceData.js';
import { seedProducts } from './seedProducts.js';
import { supabase } from './supabaseClient.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // תמונת-מוצר כ-base64 (זיהוי-Gemini) גדולה יותר מבקשת JSON רגילה

app.use('/api/auth', authRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/image-search', imageSearchRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/price-observations', priceObservationRoutes);
app.use('/api/price-import', priceImportRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/recognize-product', recognizeProductRoutes);
app.use('/api/price-data', priceDataRoutes);

app.get('/api/health', async (req, res) => {
  let shoppingItemsRealtime = false;
  try {
    const { error } = await supabase.from('shopping_items').select('id').limit(1);
    shoppingItemsRealtime = !error;
  } catch { /* הסכמה הישנה עדיין פעילה */ }
  res.json({ ok: true, shoppingItemsRealtime });
});

const PORT = process.env.PORT || 8787;

seedProducts()
  .catch((err) => console.error('SuperNav AI: product seeding failed —', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`SuperNav AI server listening on http://localhost:${PORT}`);
    });
  });
