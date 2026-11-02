import { Router } from 'express';

function healthRouter(isShuttingDown: () => boolean): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    const ok = !isShuttingDown();

    res.set('Cache-Control', 'no-store');
    res.status(ok ? 200 : 503).json({ ok });
  });
  return router;
}

export { healthRouter };
