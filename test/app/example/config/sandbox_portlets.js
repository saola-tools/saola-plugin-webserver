module.exports = {
  plugins: {
    appWebserver: {
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
