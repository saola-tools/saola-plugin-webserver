module.exports = {
  plugins: {
    appWebserver: {
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
