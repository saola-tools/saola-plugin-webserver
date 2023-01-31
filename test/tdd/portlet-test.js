"use strict";

const Devebot = require("@saola/core");
const Promise = Devebot.require("bluebird");
const lodash = Devebot.require("lodash");
const chores = Devebot.require("chores");
const { assert, mockit, sinon } = require("liberica");

const portlet = require("../../src/supports/portlet");
const { PortletMixiner } = portlet;
const { portletifyConfig, getPortletDescriptors, createPortletifier } = portlet;

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

  describe("getPortletDescriptors", function() {
    it("converting legacy sandboxConfig fields when the portlets is not empty", function() {
      assert.isFunction(getPortletDescriptors);
      //
      const sandboxConfig = {
        "contextPath": "/",
        "portlets": {
          "manager": {
            "host": "0.0.0.0",
            "port": 9696
          },
          "monitor": {
            "host": "0.0.0.0",
            "port": 9797
          }
        }
      };
      const expected1 = {
        "default": {
          "contextPath": "/",
        },
        "manager": {
          "host": "0.0.0.0",
          "port": 9696
        },
        "monitor": {
          "host": "0.0.0.0",
          "port": 9797
        }
      };
      const expected2 = lodash.pick(expected1, ["default", "monitor"]);
      //
      assert.deepEqual(getPortletDescriptors(sandboxConfig), expected1);
      assert.deepEqual(getPortletDescriptors(sandboxConfig, ["default", "monitor"]), expected2);
    });
  });

  describe("createPortletifier", function() {
    it("converting legacy sandboxConfig fields when the portlets is not empty", function() {
      const sandboxConfig = {
        "contextPath": "/",
        "portlets": {
          "manager": {
            "host": "0.0.0.0",
            "port": 9696
          },
          "monitor": {
            "host": "0.0.0.0",
            "port": 9797
          }
        }
      };
      const expected1 = {
        "default": {
          "contextPath": "/",
        },
        "manager": {
          "host": "0.0.0.0",
          "port": 9696
        },
        "monitor": {
          "host": "0.0.0.0",
          "port": 9797
        }
      };
      const expected2 = lodash.pick(expected1, ["default", "monitor"]);
      //
      const Portletifier = createPortletifier();
      const portletifier = new Portletifier({ sandboxConfig });
      //
      assert.deepEqual(portletifier.getPortletDescriptors(), expected1);
      assert.deepEqual(portletifier.getPortletDescriptors(["default", "monitor"]), expected2);
    });
  });

  describe("PortletMixiner", function() {
    beforeEach(function() {
    });

    function generateExample ({ portletArguments, PortletConstructor }) {
      PortletConstructor = PortletConstructor || sinon.stub();

      const Handler = function (params) {
        const { sandboxBaseConfig, sandboxConfig } = params;
        //
        PortletMixiner.call(this, {
          portletBaseConfig: sandboxBaseConfig,
          portletDescriptors: getPortletDescriptors(sandboxConfig),
          portletArguments: portletArguments,
          PortletConstructor: PortletConstructor,
        });
      }

      Object.assign(Handler.prototype, PortletMixiner.prototype);

      return { Handler, Portlet: PortletConstructor };
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

    it("Handler supports the portletBaseConfig argument", function() {
      const ExamplePortlet = sinon.stub();
      const { Handler: ExampleHandler, Portlet } = generateExample({
        portletArguments: ctx,
        PortletConstructor: ExamplePortlet,
      });
      //
      const example = new ExampleHandler({
        sandboxBaseConfig: {
          protocol: "http",
          host: "localhost"
        },
        sandboxConfig: {
          host: "0.0.0.0",
          port: 9797,
        }
      });
      //
      assert.isTrue(example.hasPortlet());
      assert.instanceOf(example.getPortlet(), ExamplePortlet);
      //
      assert.equal(ExamplePortlet.callCount, 1);
      const firstCall = ExamplePortlet.args[0];
      assert.lengthOf(firstCall, 1);
      const firstArgOfFirstCall = firstCall[0];
      assert.deepInclude(firstArgOfFirstCall, {
        portletName: "default",
        portletConfig: {
          protocol: "http",
          host: "0.0.0.0",
          port: 9797,
        }
      });
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
        sandboxBaseConfig: {
          protocol: "http",
          host: "127.0.0.1",
        },
        sandboxConfig: {
          host: "0.0.0.0",
          port: 7979,
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
      //
      assert.equal(ExamplePortlet.callCount, 2);
      //
      const firstCall = ExamplePortlet.args[0];
      assert.lengthOf(firstCall, 1);
      const firstArgOfFirstCall = firstCall[0];
      assert.deepInclude(firstArgOfFirstCall, {
        portletName: "monitor",
        portletConfig: {
          protocol: "http",
          host: "localhost",
          port: 9797,
        }
      });
      //
      const secondCall = ExamplePortlet.args[1];
      assert.lengthOf(secondCall, 1);
      const firstArgOfSecondCall = secondCall[0];
      assert.deepInclude(firstArgOfSecondCall, {
        portletName: "default",
        portletConfig: {
          protocol: "http",
          host: "0.0.0.0",
          port: 7979,
        }
      });
    });
  });
});
