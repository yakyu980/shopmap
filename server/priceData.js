import { supabase } from './supabaseClient.js';

export const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export async function selectedCityCode(householdId) {
  if (!householdId) return null;
  const { data, error } = await supabase
    .from('household_price_preferences')
    .select('city_code')
    .eq('household_id', householdId)
    .maybeSingle();
  if (error) throw error;
  return data?.city_code || null;
}

async function storesForCity(cityCode) {
  if (!cityCode) return [];
  const { data, error } = await supabase.from('retail_stores').select('*').eq('city_code', cityCode);
  if (error) throw error;
  return data || [];
}

function storeLabel(store, chain) {
  return `${chain?.name || store.chain_id} · ${store.name}`;
}

export async function pricesForBarcode(householdId, barcode) {
  const cityCode = await selectedCityCode(householdId);
  if (!cityCode) return { cityCode: null, rows: [] };
  const stores = await storesForCity(cityCode);
  const storeIds = stores.map((store) => store.id);
  if (!storeIds.length) return { cityCode, rows: [] };

  const chainIds = [...new Set(stores.map((store) => store.chain_id))];
  const [{ data: chains, error: chainErr }, { data: prices, error: priceErr }, { data: promoItems, error: promoItemErr }] = await Promise.all([
    supabase.from('retail_chains').select('*').in('id', chainIds),
    supabase.from('retail_prices').select('*').eq('barcode', barcode).in('store_id', storeIds),
    supabase.from('retail_promotion_items').select('promotion_id').eq('barcode', barcode),
  ]);
  if (chainErr) throw chainErr;
  if (priceErr) throw priceErr;
  if (promoItemErr) throw promoItemErr;

  const promotionIds = (promoItems || []).map((item) => item.promotion_id);
  let promotions = [];
  if (promotionIds.length) {
    const { data, error } = await supabase
      .from('retail_promotions')
      .select('*')
      .in('id', promotionIds)
      .in('store_id', storeIds);
    if (error) throw error;
    promotions = data || [];
  }

  const now = Date.now();
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const chainById = new Map((chains || []).map((chain) => [chain.id, chain]));
  const promosByStore = new Map();
  for (const promo of promotions) {
    const active = (!promo.starts_at || promo.starts_at <= now) && (!promo.ends_at || promo.ends_at >= now);
    if (!active) continue;
    if (!promosByStore.has(promo.store_id)) promosByStore.set(promo.store_id, []);
    promosByStore.get(promo.store_id).push({
      id: promo.id,
      description: promo.description,
      discountedPrice: promo.discounted_price == null ? null : Number(promo.discounted_price),
      minQuantity: promo.min_quantity == null ? null : Number(promo.min_quantity),
      clubOnly: Boolean(promo.club_only),
      startsAt: promo.starts_at,
      endsAt: promo.ends_at,
    });
  }

  const rows = (prices || []).map((price) => {
    const store = storeById.get(price.store_id);
    const chain = chainById.get(store?.chain_id);
    const sourceUpdatedAt = Number(price.source_updated_at);
    return {
      barcode: price.barcode,
      storeId: price.store_id,
      chainName: chain?.name || store?.chain_id || 'רשת לא ידועה',
      storeName: store?.name || 'סניף לא ידוע',
      venueName: store ? storeLabel(store, chain) : 'סניף לא ידוע',
      cityName: store?.city_name || '',
      price: Number(price.price),
      unitPrice: price.unit_price == null ? null : Number(price.unit_price),
      unitMeasure: price.unit_measure,
      sourceFile: price.source_file,
      sourceUrl: price.source_url,
      sourceUpdatedAt,
      importedAt: Number(price.imported_at),
      stale: now - sourceUpdatedAt > STALE_AFTER_MS,
      promotions: promosByStore.get(price.store_id) || [],
    };
  });
  return { cityCode, rows };
}

export async function searchProducts(householdId, query) {
  const cityCode = await selectedCityCode(householdId);
  if (!cityCode) return { cityCode: null, products: [] };
  const stores = await storesForCity(cityCode);
  const storeIds = stores.map((store) => store.id);
  if (!storeIds.length) return { cityCode, products: [] };

  const clean = String(query || '').trim();
  const productQuery = supabase.from('retail_products').select('*').limit(40);
  const { data: products, error } = /^\d{6,14}$/.test(clean)
    ? await productQuery.eq('barcode', clean)
    : await productQuery.ilike('name', `%${clean}%`);
  if (error) throw error;
  if (!(products || []).length) return { cityCode, products: [] };

  const barcodes = products.map((product) => product.barcode);
  const { data: prices, error: priceError } = await supabase
    .from('retail_prices')
    .select('barcode,price,store_id,source_updated_at')
    .in('barcode', barcodes)
    .in('store_id', storeIds);
  if (priceError) throw priceError;

  const byBarcode = new Map();
  for (const row of prices || []) {
    if (!byBarcode.has(row.barcode)) byBarcode.set(row.barcode, []);
    byBarcode.get(row.barcode).push(row);
  }
  return {
    cityCode,
    products: (products || []).flatMap((product) => {
      const rows = byBarcode.get(product.barcode) || [];
      if (!rows.length) return [];
      return [{
        barcode: product.barcode,
        name: product.name,
        manufacturer: product.manufacturer,
        unitQuantity: product.unit_quantity,
        minPrice: Math.min(...rows.map((row) => Number(row.price))),
        venueCount: new Set(rows.map((row) => row.store_id)).size,
        stale: rows.every((row) => Date.now() - Number(row.source_updated_at) > STALE_AFTER_MS),
      }];
    }).slice(0, 20),
  };
}
