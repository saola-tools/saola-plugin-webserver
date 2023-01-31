"use strict";

const { assert, mockit } = require("liberica");

const serviceLocation = { libraryDir: "../lib", moduleType: "services" };

describe("webserverHandler", function() {

  const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });
  const ctx = {
    L: loggingFactory.getLogger(),
    T: loggingFactory.getTracer(),
    blockRef: "@saola/plugin-webserver/webserverHandler",
  };

  describe("buildListenArgs()", function() {
    let Handler, buildListenArgs;

    beforeEach(function() {
      Handler = mockit.acquire("webserver-handler", serviceLocation);
      buildListenArgs = mockit.get(Handler, "buildListenArgs");
    });

    it("Remove the nil value from the tuple (port, host, callback) correctly", function() {
      assert.sameOrderedMembers(buildListenArgs(7979, "example.com"), [
        7979, "example.com", undefined
      ]);
      assert.deepEqual(buildListenArgs(undefined, "example.com"), [
        "example.com", undefined
      ]);
      assert.deepEqual(buildListenArgs(7979, null), [
        7979, undefined
      ]);
      //
      const callback = function() {};
      assert.sameOrderedMembers(buildListenArgs(7979, "example.com", callback), [
        7979, "example.com", callback
      ]);
    });
  });
});
