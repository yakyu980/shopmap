import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabase, h } from '../supabaseClient.js';
import { pricesForBarcode, searchProducts, selectedCityCode } from '../priceData.js';

const router = Router();

router.use(requireAuth);

router.get('/cities', h(async (req, res) => {
  const [{ data: cities, error }, cityCode] = await Promise.all([
    supabase.from('price_cities').select('*').order('name'),
    selectedCityCode(req.household.id),
  ]);
  if (error) throw error;
  res.json({ cities: (cities || []).map((city) => ({ code: city.code, name: city.name })), selectedCityCode: cityCode });
}));

router.put('/preferences', h(async (req, res) => {
  const cityCode = String(req.body?.cityCode || '').trim();
  const { data: city, error: cityError } = await supabase.from('price_cities').select('*').eq('code', cityCode).maybeSingle();
  if (cityError) throw cityError;
  if (!city) return res.status(400).json({ error: 'העיר שנבחרה אינה זמינה במאגר המחירים' });
  const { error } = await supabase.from('household_price_preferences').upsert({
    household_id: req.household.id,
    city_code: cityCode,
    updated_at: Date.now(),
  }, { onConflict: 'household_id' });
  if (error) throw error;
  res.json({ city: { code: city.code, name: city.name } });
}));

router.get('/products/search', h(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ products: [] });
  res.json(await searchProducts(req.household.id, q));
}));

router.get('/products/:barcode', h(async (req, res) => {
  res.json(await pricesForBarcode(req.household.id, req.params.barcode));
}));

router.get('/status', h(async (req, res) => {
  const cityCode = await selectedCityCode(req.household.id);
  const { data: runs, error } = await supabase.from('price_import_runs').select('*').order('started_at', { ascending: false }).limit(100);
  if (error) throw error;
  const latest = new Map();
  for (const run of runs || []) if (run.chain_id && !latest.has(run.chain_id)) latest.set(run.chain_id, run);
  const chainIds = [...latest.keys()];
  const { data: chains, error: chainError } = chainIds.length
    ? await supabase.from('retail_chains').select('*').in('id', chainIds)
    : { data: [], error: null };
  if (chainError) throw chainError;
  const chainById = new Map((chains || []).map((chain) => [chain.id, chain]));
  res.json({ cityCode, chains: [...latest.values()].map((run) => ({
    id: run.chain_id,
    name: chainById.get(run.chain_id)?.name || run.chain_id,
    status: run.status,
    updatedAt: run.finished_at,
    error: run.error,
  })) });
}));

export default router;
