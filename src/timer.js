import { CustomLogger } from './custom-logger.js';

const formatTime = ([seconds, nanoseconds]) => {
  const centiseconds = Math.floor(nanoseconds / 10_000_000);
  const sec = String(seconds).padStart(2, '0');
  const cen = String(centiseconds).padStart(2, '0');
  return `${sec}.${cen}`;
};

const getDiffTime = (start, end) => {
  const [sec0, nano0] = start.elapsed;
  const [sec1, nano1] = end.elapsed;
  let diffSec = sec1 - sec0;
  let diffNano = nano1 - nano0;
  if (diffNano < 0) {
    diffSec -= 1;
    diffNano += 1_000_000_000;
  }
  return [diffSec, diffNano];
};

class PerfTimer {
  constructor() {
    this.startTime = process.hrtime();
    this.checkpoints = [];
  }

  get enabled() {
    return CustomLogger.globalLogLevel === 'debug';
  }

  tapIn(label) {
    if (!this.enabled) return;
    const elapsed = process.hrtime(this.startTime);
    this.checkpoints.push({ label, elapsed });
  }

  toString() {
    return this.checkpoints
      .map((checkpoint, i) => {
        const lastCheckpoint = i > 0 ? this.checkpoints[i - 1] : { elapsed: [0, 0] };
        const timeText = formatTime(checkpoint.elapsed);
        const diffTime = getDiffTime(lastCheckpoint, checkpoint);
        const diffText = formatTime(diffTime);
        return ` ${timeText} (+${diffText}) - ${checkpoint.label}`;
      })
      .join('\n');
  }

  print(logger) {
    if (!this.enabled) return;
    this.tapIn('Done');
    logger.debug(`Time:\n${this.toString()}`);
  }
}

export { PerfTimer };
