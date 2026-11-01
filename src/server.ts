import http from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { IS_PRODUCTION, PORT, SHARP_CONCURRENCY } from './config.ts';

if (SHARP_CONCURRENCY > 0) {
  sharp.concurrency(SHARP_CONCURRENCY);
}

const server = http.createServer();

server.on('request', await createApp(server));

server.listen(PORT, () => {
  console.log(
    `Listening on http://localhost:${PORT} (${IS_PRODUCTION ? 'production' : 'dev'})`,
  );
});
