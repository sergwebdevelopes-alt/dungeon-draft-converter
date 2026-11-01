import { Router } from 'express';
import {
  MAX_LEVELS,
  MAX_LOGO_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
} from '../../config.ts';
import { FORMAT_PRESETS, LOGO_LIMITS, VARIANTS } from '../../core/images.ts';

function configRouter(): Router {
  const router = Router();
  router.get('/config', (_req, res) => {
    res.json({
      presets: FORMAT_PRESETS,
      variants: VARIANTS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxTotalUploadBytes: MAX_TOTAL_UPLOAD_BYTES,
      maxLevels: MAX_LEVELS,
      maxLogoBytes: MAX_LOGO_BYTES,
      logo: LOGO_LIMITS,
    });
  });
  return router;
}

export { configRouter };
