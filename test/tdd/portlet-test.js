"use strict";

const devebot = require("devebot");
const Promise = devebot.require("bluebird");
const lodash = devebot.require("lodash");
const chores = devebot.require("chores");
const { assert, mockit, sinon } = require("liberica");

const portlet = require("../../src/supports/portlet");
const { PORTLETS_COLLECTION_NAME, portletifyConfig, PortletMixiner } = portlet;

describe("supports/portlet", function() {
  const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });
  const ctx = {
    L: loggingFactory.getLogger(),
    T: loggingFactory.getTracer()
  };

  describe("portletifyConfig", function() {
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

    it("converting legacy sandboxConfig fields when the portlets is not empty", function() {
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
        "portlets": {
          "default": {
            "contextPath": "/",
          },
          "monitor": {
            "host": "0.0.0.0",
            "port": 7979
          }
        }
      };
      //
      assert.deepEqual(portletifyConfig(sandboxConfig), expected);
    });

    it("skips converting legacy empty sandboxConfig when the portlets is not empty", function() {
      assert.isFunction(portletifyConfig);
      //
      const sandboxConfig = {
        "portlets": {
          "monitor": {
            "host": "0.0.0.0",
            "port": 7979
          }
        }
      };
      const expected = {
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

  describe("PortletMixiner", function() {
    beforeEach(function() {
    });

    function generateExample ({ portletArguments }) {
      const Portlet = sinon.stub();

      const Handler = function (params) {
        const { sandboxConfig } = params;
        const pluginConfig = portletifyConfig(sandboxConfig);
        //
        PortletMixiner.call(this, {
          portletDescriptors: lodash.get(pluginConfig, PORTLETS_COLLECTION_NAME, {}),
          portletArguments: portletArguments,
          PortletConstructor: Portlet,
        });
      }

      Object.assign(Handler.prototype, PortletMixiner.prototype);

      return { Handler, Portlet };
    }

    it("Handler manages the default Portlet properly", function() {
      const { Handler: ExampleHandler, Portlet: ExamplePortlet } = generateExample({
        portletArguments: ctx
      });
      //
      const example = new ExampleHandler({
        sandboxConfig: {
          host: "0.0.0.0",
          port: 9797,
        }
      });
      //
      assert.isTrue(example.hasPortlet());
      assert.instanceOf(example.getPortlet(), ExamplePortlet);
    });

    it("Handler creates the default Portlet and renames to 'monitor'", function() {
      const { Handler: ExampleHandler, Portlet: ExamplePortlet } = generateExample({
        portletArguments: ctx
      });
      //
      const example = new ExampleHandler({
        sandboxConfig: {
          host: "0.0.0.0",
          port: 9797,
          __metadata__: {
            name: "monitor"
          }
        }
      });
      assert.isFalse(example.hasPortlet());
      assert.isTrue(example.hasPortlet("monitor"));
    });

    it("Handler creates the default Portlet and supports multiple portlets", function() {
      const { Handler: ExampleHandler, Portlet: ExamplePortlet } = generateExample({
        portletArguments: ctx
      });
      //
      const example = new ExampleHandler({
        sandboxConfig: {
          host: "0.0.0.0",
          port: 9797,
          portlets: {
            tracker: {
              host: "localhost",
              port: 9797,
              __metadata__: {
                name: "monitor"
              }
            }
          }
        }
      });
      assert.isTrue(example.hasPortlet());
      assert.isTrue(example.hasPortlet("default"));
      assert.isTrue(example.hasPortlet("monitor"));
    });
  });
});
