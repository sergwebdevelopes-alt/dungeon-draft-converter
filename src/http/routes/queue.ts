import { Router } from 'express';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';

function queueRouter(queue: ConversionQueue): Router {
  const router = Router();
  router.get('/queue/:ticket', (req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(queue.position(req.params.ticket));
  });
  return router;
}

export { queueRouter };
