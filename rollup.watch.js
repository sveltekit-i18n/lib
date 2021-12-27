/* eslint-disable */
import { promisify } from 'util'
import childProcess from 'child_process'
import { watch } from 'rollup';
import config from './rollup.config.js';

const exec = promisify(childProcess.exec)

const watcher = watch(config);

watcher.on('event', async (event) => {
  if (event.code === 'START') {
    console.log('Recompiling...')
    await exec('npm run build:precompile');
    console.log('Watching...')
  }
});