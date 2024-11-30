class ClientBase {
  constructor(config) {
    this.config = config;
    this.token = config.token ?? (config.tokenEnv ? process.env[config.tokenEnv] : null);
  }
}

export { ClientBase };
