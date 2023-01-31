module.exports = {
  plugins: {
    pluginWebserver: {
      portlets: {
        default: {},
        monitor: {
          enabled: false,
          host: "localhost",
          port: 9797
        }
      }
    }
  }
};
