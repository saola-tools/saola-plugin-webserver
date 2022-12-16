"use strict";

const Devebot = require("devebot");
const LogConfig = Devebot.require("logolite").LogConfig;
const LogTracer = Devebot.require("logolite").LogTracer;
const envcloak = require("envcloak").instance;

const app = require("../../app");

describe("app-webserver", function() {
  describe("start/stop app.server", function() {
    before(function() {
      envcloak.setup({
        LOGOLITE_FULL_LOG_MODE: "false",
        LOGOLITE_ALWAYS_ENABLED: "all",
        LOGOLITE_ALWAYS_MUTED: "all"
      });
      LogConfig.reset();
    });
    //
    after(function() {
      LogTracer.clearInterceptors();
      envcloak.reset();
    });
    //
    it("app.server should be started/stopped properly", function(done) {
      app.server.start().then(function() {
        return app.server.stop();
      }).then(function() {
        done();
      });
    });
  });
});
