import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Parse command line arguments to determine the logging level.
 * @returns {string} - The logging level to set.
 */
function parseArguments() {
  const levels = ['debug', 'verbose', 'info', 'warning'];

  const argv = levels.reduce(
    (y, level) =>
      y.option(level[0], {
        alias: level,
        type: 'boolean',
        describe: `Set logging level to ${level.toUpperCase()}`,
      }),
    yargs(hideBin(process.argv)).usage('Usage: $0 [options]')
  );

  argv.option('config', {
    alias: 'c',
    type: 'string',
    describe: 'Specify the configuration file to use',
  });

  // Set conflicts among all logging level options
  levels.forEach((level, _, arr) =>
    argv.conflicts(
      level[0],
      arr.filter((l) => l !== level)
    )
  );

  const parsed = argv.help().parseSync();

  const logLevel = levels.find((level) => parsed[level]) || 'error';
  const configFile = parsed.config;
  return { logLevel, configFile };
}

export { parseArguments };
