// שרת-הדגמה מקומי אמיתי ל-SuperNav AI (Express + קובץ-JSON).
// לא פרוס לאינטרנט — רץ מקומית לצד הלקוח, ניתן להרצה/בדיקה מלאה כאן.

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/household.js';
import productRoutes from './routes/products.js';
import imageSearchRoutes from './routes/imageSearch.js';
import venueRoutes from './routes/venues.js';
import tripRoutes from './routes/trips.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/products', productRoutes);
app.use('/api/image-search', imageSearchRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/trips', tripRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`SuperNav AI server (demo, local-only) listening on http://localhost:${PORT}`);
});
