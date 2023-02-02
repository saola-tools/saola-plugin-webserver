"use strict";

const axios = require("axios");
const { assert } = require("liberica");

const Devebot = require("@saola/core");
const Promise = Devebot.require("bluebird");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const path = require("path");
const freshy = require("freshy");

function requireFresh (moduleName, basePath) {
  const modulePath = path.join(basePath, moduleName);
  freshy.unload(modulePath);
  return require(modulePath);
}

describe("@saola/plugin-webserver", function() {
  describe("multiple-portlets", function() {
    const example = requireFresh("../app/example", __dirname);
    //
    before(function() {
      chores.setEnvironments({
        SAOLA_SANDBOX: "portlets",
        SAOLA_FORCING_SILENT: "framework,webserver",
        LOGOLITE_FULL_LOG_MODE: "false",
        LOGOLITE_ALWAYS_ENABLED: "all",
        LOGOLITE_ALWAYS_MUTED: "all"
      });
    });
    //
    after(function() {
      chores.clearCache();
    });
    //
    it("Request and response smoothly", function() {
      const expected = [
        {
          status: 200,
          data: {
            "port": 7979,
            "host": "0.0.0.0",
            "message": "example [B7ED788C-E130-460C-9D3E-2CCF8B0EEADA] request successfully"
          }
        },
        {
          status: 200,
          data: {
            "port": 9797,
            "host": "localhost",
            "message": "monitor [B7ED788C-E130-460C-9D3E-2CCF8B0EEADA] request successfully"
          }
        },
      ];
      //
      return example.server.start().then(function() {
        return Promise.all([
          axios.request({
            url: "http://localhost:7979/example/B7ED788C-E130-460C-9D3E-2CCF8B0EEADA",
            method: "GET",
            headers: {"Content-Type": "application/json"},
            data: undefined,
            responseType: "json",
          }),
          axios.request({
            url: "http://localhost:9797/monitor/B7ED788C-E130-460C-9D3E-2CCF8B0EEADA",
            method: "GET",
            headers: {"Content-Type": "application/json"},
            data: undefined,
            responseType: "json",
          }),
        ]);
      })
      .then(function(resps) {
        const output = lodash.map(resps, function(resp) {
          return {
            status: resp.status,
            data: resp.data
          };
        });
        false && console.log(JSON.stringify(output, null, 2));
        assert.sameDeepMembers(output, expected);
      })
      .catch(function(err) {
        console.log(err);
        assert.fail("This testcase must complete successfully");
      })
      .finally(function() {
        return example.server.stop();
      });
    });
  });
  //
  describe("inactive-portlets", function() {
    const example = requireFresh("../app/example", __dirname);
    //
    before(function() {
      chores.setEnvironments({
        SAOLA_SANDBOX: "inactive-portlets",
        SAOLA_FORCING_SILENT: "saola,webserver",
        LOGOLITE_FULL_LOG_MODE: "false",
        LOGOLITE_ALWAYS_ENABLED: "all",
        LOGOLITE_ALWAYS_MUTED: "all"
      });
    });
    //
    after(function() {
      chores.clearCache();
    });
    //
    it("Request and response smoothly", function() {
      return example.server.start().then(function() {
        return Promise.all([
          axios.request({
            url: "http://localhost:7979/example/B7ED788C-E130-460C-9D3E-2CCF8B0EEADA",
            method: "GET",
            headers: {"Content-Type": "application/json"},
            data: undefined,
            responseType: "json",
          }),
          axios.request({
            url: "http://localhost:9797/monitor/B7ED788C-E130-460C-9D3E-2CCF8B0EEADA",
            method: "GET",
            headers: {"Content-Type": "application/json"},
            data: undefined,
            responseType: "json",
          }),
        ]);
      })
      .then(function(resps) {
        assert.fail("This testcase must raise an error");
      })
      .catch(function(err) {
        assert.instanceOf(err, Error);
        assert.equal(err.code, "ECONNREFUSED");
        assert.equal(err.message, "connect ECONNREFUSED 127.0.0.1:9797");
      })
      .finally(function() {
        return example.server.stop();
      });
    });
  });
});
