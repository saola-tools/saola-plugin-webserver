module.exports = {
  plugins: {
    pluginWebserver: {
      portlets: {
        default: {},
        monitor: {
          host: "localhost",
          port: 9797
        }
      }
    }
  }
};
