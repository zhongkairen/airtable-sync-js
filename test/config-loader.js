import fs from 'fs';
import { PathUtil } from '../src/path-util.js';

const loadConfig = () => {
  const config = JSON.parse(fs.readFileSync(PathUtil.CONFIG_FILE_PATH, 'utf8'));
  for (const key in config) {
    if (config[key].tokenPath) {
      const tokenPath = PathUtil.expandHomeDir(config[key].tokenPath); // Expand token path
      const token = fs.readFileSync(tokenPath, 'utf8').trim();
      config[key].token = token;
    }
  }
  return config;
};

export { loadConfig };
