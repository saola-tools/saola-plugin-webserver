"use strict";

const os = require("os");
const fs = require("fs").promises;

const devebot = require("devebot");
const Promise = devebot.require("bluebird");
const lodash = devebot.require("lodash");
const chores = devebot.require("chores");
const { assert, mockit } = require("liberica");
const path = require("path");
const util = require("util");

const serviceLocation = { libraryDir: "../lib", moduleType: "services" };

describe("webserverHandler", function() {
  const sandboxConfig = {};

  const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });
  const ctx = {
    L: loggingFactory.getLogger(),
    T: loggingFactory.getTracer(),
    blockRef: "app-webserver/webserverHandler",
  };

  describe("portletifyConfig()", function() {
    let Handler, portletifyConfig;

    beforeEach(function() {
      Handler = mockit.acquire("webserver-handler", serviceLocation);
      portletifyConfig = mockit.get(Handler, "portletifyConfig");
    });

    it("convert legacy sandboxConfig fields to the portlets.default", function() {
      assert.isFunction(portletifyConfig);
      //
      const sandboxConfig = {
        "host": "0.0.0.0",
        "port": 7979
      };
      const expected = {
        "portlets": {
          "default": {
            "host": "0.0.0.0",
            "port": 7979
          }
        }
      };
      //
      assert.deepEqual(portletifyConfig(sandboxConfig), expected);
    });

    it("convert legacy sandboxConfig fields to the portlets.default, keep the portletMappings field", function() {
      assert.isFunction(portletifyConfig);
      //
      const sandboxConfig = {
        "host": "0.0.0.0",
        "port": 7979,
        "portletMappings": {
          "watchdog": "monitor"
        }
      };
      const expected = {
        "portlets": {
          "default": {
            "host": "0.0.0.0",
            "port": 7979
          }
        },
        "portletMappings": {
          "watchdog": "monitor"
        }
      };
      //
      assert.deepEqual(portletifyConfig(sandboxConfig), expected);
    });

    it("skip converting legacy sandboxConfig fields when the portlets is not empty", function() {
      assert.isFunction(portletifyConfig);
      //
      const sandboxConfig = {
        "contextPath": "/",
        "portlets": {
          "monitor": {
            "host": "0.0.0.0",
            "port": 7979
          }
        }
      };
      const expected = {
        "contextPath": "/",
        "portlets": {
          "monitor": {
            "host": "0.0.0.0",
            "port": 7979
          }
        }
      };
      //
      assert.deepEqual(portletifyConfig(sandboxConfig), expected);
    });

    it("merge legacy sandboxConfig fields to the portlets.default if it is exists", function() {
      assert.isFunction(portletifyConfig);
      //
      const sandboxConfig = {
        "host": "0.0.0.0",
        "port": 7979,
        "portlets": {
          "default": {
            "host": "localhost",
            "ssl": {
              "enabled": false
            }
          }
        }
      };
      const expected = {
        "portlets": {
          "default": {
            "host": "0.0.0.0",
            "port": 7979,
            "ssl": {
              "enabled": false
            }
          }
        }
      };
      //
      assert.deepEqual(portletifyConfig(sandboxConfig), expected);
    });
  });
});
