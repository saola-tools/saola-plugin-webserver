"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const Devebot = require("devebot");
const Promise = Devebot.require("bluebird");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const { DEFAULT_RUNLET_NAME, standardizeConfig } = require("../supports/runlet");

const SERVER_HOSTS = ["0.0.0.0", "127.0.0.1", "localhost"];

function WebserverHandler (params = {}) {
  const { packageName, loggingFactory } = params;
  const blockRef = chores.getBlockRef(__filename, packageName);

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const sandboxConfig = standardizeConfig(params.sandboxConfig);

  const refRunletServers = {};
  lodash.forOwn(sandboxConfig.runlets, function(value, key) {
    refRunletServers[key] = new RunletServer({ blockRef, L, T, sandboxConfig: value });
  });

  this.getRunletNames = function() {
    return lodash.keys(refRunletServers);
  };

  this.hasRunlet = function(runletName) {
    runletName = runletName || DEFAULT_RUNLET_NAME;
    return runletName in refRunletServers;
  };

  this.getRunlet = function(runletName) {
    runletName = runletName || DEFAULT_RUNLET_NAME;
    return refRunletServers[runletName];
  };

  this.attach = this.register = function(outlet, runletName) {
    const runlet = this.getRunlet(runletName);
    runlet && runlet.attach(outlet);
  };

  this.detach = this.unregister = function(outlet, runletName) {
    const runlet = this.getRunlet(runletName);
    runlet && runlet.detach(outlet);
  };

  this.start = function(runletNames) {
    return this.eachRunlets(function(runlet) {
      return runlet.start();
    }, runletNames);
  };

  this.stop = function(runletNames) {
    return this.eachRunlets(function(runlet) {
      return runlet.stop();
    }, runletNames);
  };

  this.eachRunlets = function(iteratee, runletNames, options) {
    if (lodash.isNil(runletNames)) {
      runletNames = this.getRunletNames();
    }
    if (lodash.isString(runletNames)) {
      runletNames = [runletNames];
    }
    if (runletNames && !lodash.isArray(runletNames)) {
      return Promise.reject();
    }
    //
    if (!lodash.isFunction(iteratee)) {
      return Promise.reject();
    }
    //
    const selectedRunlets = [];
    for (const runletName of runletNames) {
      const selectedRunlet = refRunletServers[runletName];
      if (selectedRunlet) {
        selectedRunlets.push(selectedRunlet);
      }
    }
    //
    return Promise.mapSeries(selectedRunlets, iteratee);
  };
}

function RunletServer (params = {}) {
  const { blockRef, sandboxConfig, L, T } = params;

  let { port, host } = extractConfigAddress(sandboxConfig);

  this.getPort = function () {
    return port;
  };

  this.getHost = function () {
    return host;
  };

  const isLocalhost = SERVER_HOSTS.indexOf(host) >= 0;
  const ssl = loadSSLConfig({ L, T, blockRef }, sandboxConfig, isLocalhost);

  Object.defineProperty(this, "ssl", {
    get: function() { return lodash.assign({}, ssl); },
    set: function(value) {}
  });

  const protocol = ssl.available ? "https" : "http";

  const server = ssl.available ? https.createServer({
    ca: ssl.ca,
    cert: ssl.cert,
    key: ssl.key,
    requestCert: true,
    rejectUnauthorized: false
  }) : http.createServer();

  // @Deprecated
  Object.defineProperty(this, "server", {
    get: function() { return server; },
    set: function(value) {}
  });

  this.attach = this.register = function(outlet) {
    L && L.has("silly") && L.log("silly", T && T.toMessage({
      tags: [ blockRef, "attach", "begin" ],
      text: "attach() - try to register a outlet"
    }));
    if (server.listeners("request").indexOf(outlet) >= 0) {
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "attach", "skip" ],
        text: "attach() - outlet has already attached. skip!"
      }));
    } else {
      server.addListener("request", outlet);
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "attach", "done" ],
        text: "attach() - attach the outlet"
      }));
    }
  };

  this.detach = this.unregister = function(outlet) {
    L && L.has("silly") && L.log("silly", T && T.toMessage({
      tags: [ blockRef, "detach", "begin" ],
      text: "detach() - try to unregister a outlet"
    }));
    if (server.listeners("request").indexOf(outlet) >= 0) {
      server.removeListener("request", outlet);
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "detach", "done" ],
        text: "detach() - detach the outlet"
      }));
    } else {
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "detach", "skip" ],
        text: "detach() - outlet is not available. skip!"
      }));
    }
  };

  this.start = function() {
    if (sandboxConfig.enabled === false) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      L && L.has("silly") && L.log("silly", T && T.add({ protocol, host, port }).toMessage({
        tags: [ blockRef, "webserver", "starting" ],
        text: "webserver is starting"
      }));
      //
      server.once("error", function (err) {
        L && L.has("silly") && L.log("silly", T && T.add(lodash.pick(err, ["name", "message"])).toMessage({
          tags: [ blockRef, "webserver", "error" ],
          text: "webserver start failed with the Error[${name}]: ${message}"
        }));
        if (err) {
          return reject(err);
        }
      });
      // If port is omitted or is 0, the operating system will assign an arbitrary unused port
      // If host is omitted, the server will accept connections on the unspecified IPv4 address (0.0.0.0)
      const serverInstance = server.listen.apply(server, buildListenArgs(port, host, function () {
        port = serverInstance.address().port;
        host = serverInstance.address().address;
        chores.isVerboseForced("webserver", sandboxConfig) &&
            console.log("webserver is listening on %s://%s:%s", protocol, host, port);
        L && L.has("silly") && L.log("silly", T && T.toMessage({
          tags: [ blockRef, "webserver", "started" ],
          text: "webserver has started"
        }));
        //
        resolve(serverInstance);
      }));
    });
  };

  this.stop = function() {
    if (sandboxConfig.enabled === false) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      L && L.has("silly") && L.log("silly", T && T.add({ protocol, host, port }).toMessage({
        tags: [ blockRef, "webserver", "stopping" ],
        text: "webserver is stopping"
      }));
      server.close(function (err) {
        chores.isVerboseForced("webserver", sandboxConfig) &&
            console.log("webserver has been closed");
        // https://nodejs.org/api/net.html#net_server_close_callback
        if (err) {
          L && L.has("error") && L.log("error", T && T.toMessage({
            tags: [ blockRef, "webserver", "stopped" ],
            text: "the webserver was not open when it was closed"
          }));
          reject(err);
        } else {
          L && L.has("silly") && L.log("silly", T && T.toMessage({
            tags: [ blockRef, "webserver", "stopped" ],
            text: "the webserver has stopped successfully"
          }));
          resolve();
        }
      });
    });
  };
}

WebserverHandler.referenceHash = {};

module.exports = WebserverHandler;

function extractConfigAddress (sandboxConfig) {
  let port = 7979;
  if ("port" in sandboxConfig) {
    port = sandboxConfig.port;
  }
  let host = "0.0.0.0";
  if ("host" in sandboxConfig) {
    host = sandboxConfig.host;
  }
  return { port, host };
}

function buildListenArgs (port, host, callback) {
  const listenParams = [];
  if (!lodash.isNil(port)) {
    listenParams.push(port);
  }
  if (!lodash.isNil(host)) {
    listenParams.push(host);
  }
  listenParams.push(callback);
  return listenParams;
}

function loadSSLConfig (ctx = {}, serverCfg = {}, isLocalhost) {
  const { L, T, blockRef } = ctx;
  const ssl = { available: false };
  if (serverCfg.ssl && serverCfg.ssl.enabled) {
    L && L.has("silly") && L.log("silly", T && T.add({
      sslConfig: serverCfg.ssl
    }).toMessage({
      tags: [ blockRef, "ssl", "enabled" ],
      text: "SSL is enabled"
    }));

    ssl.ca = serverCfg.ssl.ca;
    try {
      ssl.ca = ssl.ca || readFileSync(serverCfg.ssl.ca_file);
    } catch (error) {
      L && L.has("silly") && L.log("silly", T && T.add({
        ca: ssl.ca,
        ca_file: serverCfg.ssl.ca_file,
        error: error
      }).toMessage({
        tags: [ blockRef, "ssl", "ca-loading" ],
        text: "error on loading CA files[${ca_file}]: ${error}"
      }));
    }

    ssl.key = serverCfg.ssl.key;
    ssl.cert = serverCfg.ssl.cert;
    try {
      ssl.key = ssl.key || readFileSync(serverCfg.ssl.key_file);
      ssl.cert = ssl.cert || readFileSync(serverCfg.ssl.cert_file);
    } catch (error) {
      L && L.has("silly") && L.log("silly", T && T.add({
        key: ssl.key,
        key_file: serverCfg.ssl.key_file,
        cert: ssl.cert,
        cert_file: serverCfg.ssl.cert_file,
        error: error
      }).toMessage({
        tags: [ blockRef, "ssl", "key-cert-loading" ],
        text: "error on loading key/cert files: ${error}"
      }));
    }

    if (!ssl.key && !ssl.cert && isLocalhost) {
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "ssl", "key-cert-use-default" ],
        text: "Using default key/cert for localhost"
      }));
      ssl.key = readFileSync(path.join(__dirname, "../../data/ssl/localhost.key.pem"));
      ssl.cert = readFileSync(path.join(__dirname, "../../data/ssl/localhost.cert.pem"));
    }

    if (ssl.key && ssl.cert) {
      ssl.available = true;
      L && L.has("silly") && L.log("silly", T && T.add({ ssl }).toMessage({
        tags: [ blockRef, "ssl", "available" ],
        text: "HTTPs is available"
      }));
    }
  } else {
    L && L.has("silly") && L.log("silly", T && T.toMessage({
      tags: [ blockRef, "ssl", "disabled" ],
      text: "SSL is disabled"
    }));
  }

  return ssl;
}

function readFileSync (filepath) {
  return fs.readFileSync(filepath);
}
