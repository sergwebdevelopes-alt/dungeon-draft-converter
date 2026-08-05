import { run } from './convert.ts';

run()
  .then(() => console.log('Converting is done'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
