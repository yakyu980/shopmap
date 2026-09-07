import { Router } from 'express';
import { getControlledPrices } from '../controlledPrices.js';
const router = Router();
router.get('/', async (_req, res) => {
  try { res.json(await getControlledPrices()); }
  catch (error) { res.status(503).json({ error: error.message }); }
});
export default router;
