"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const Core = require("@saola/core");
const Promise = Core.require("bluebird");
const chores = Core.require("chores");
const lodash = Core.require("lodash");

const portlet = Core.require("portlet");
const { getPortletDescriptors, PortletMixiner } = portlet;

const SERVER_HOSTS = ["0.0.0.0", "127.0.0.1", "localhost"];

function WebserverHandler (params = {}) {
  const { packageName, loggingFactory, sandboxConfig } = params;

  PortletMixiner.call(this, {
    portletDescriptors: getPortletDescriptors(sandboxConfig),
    portletArguments: { packageName, loggingFactory },
    PortletConstructor: WebserverPortlet,
  });

  // @deprecated
  this.attach = this.register = function(outlet, portletName) {
    const portlet = this.getPortlet(portletName);
    portlet && portlet.attach(outlet);
  };

  // @deprecated
  this.detach = this.unregister = function(outlet, portletName) {
    const portlet = this.getPortlet(portletName);
    portlet && portlet.detach(outlet);
  };

  this.start = function(portletNames) {
    return this.eachPortlets(function(portlet) {
      return portlet.start();
    }, portletNames);
  };

  this.stop = function(portletNames) {
    return this.eachPortlets(function(portlet) {
      return portlet.stop();
    }, portletNames);
  };
}

Object.assign(WebserverHandler.prototype, PortletMixiner.prototype);

function WebserverPortlet (params) {
  const { packageName, loggingFactory, portletConfig } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName);

  let { port, host } = extractConfigAddress(portletConfig);

  this.getPort = function () {
    return port;
  };

  this.getHost = function () {
    return host;
  };

  const isLocalhost = SERVER_HOSTS.indexOf(host) >= 0;
  const ssl = loadSSLConfig({ L, T, blockRef }, portletConfig, isLocalhost);

  const protocol = ssl.available ? "https" : "http";

  const server = ssl.available ? https.createServer({
    ca: ssl.ca,
    cert: ssl.cert,
    key: ssl.key,
    requestCert: true,
    rejectUnauthorized: false
  }) : http.createServer();

  // @Deprecated
  Object.defineProperty(this, "ssl", {
    get: function() { return lodash.assign({}, ssl); },
    set: function(value) {}
  });

  // @Deprecated
  Object.defineProperty(this, "server", {
    get: function() { return server; },
    set: function(value) {}
  });

  //
  this._store = { L, T, blockRef, portletConfig, server, protocol, port, host };
}

WebserverPortlet.prototype.attach = function (outlet) {
  const { L, T, blockRef, server } = this._store;
  //
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

//
WebserverPortlet.prototype.register = function (outlet) {
  return this.attach(outlet);
};
//
WebserverPortlet.prototype.detach = function (outlet) {
  const { L, T, blockRef, server } = this._store;
  //
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
//
WebserverPortlet.prototype.unregister = function (outlet) {
  return this.detach(outlet);
};
//
WebserverPortlet.prototype.start = function () {
  const self = this;
  const { L, T, blockRef, portletConfig, protocol, host, port, server } = this._store;
  //
  if (portletConfig.enabled === false) return Promise.resolve();
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
      const port = serverInstance.address().port;
      const host = serverInstance.address().address;
      //
      chores.isVerboseForced("webserver", portletConfig) &&
          chores.logConsole("webserver is listening on %s://%s:%s", protocol, host, port);
      L && L.has("silly") && L.log("silly", T && T.toMessage({
        tags: [ blockRef, "webserver", "started" ],
        text: "webserver has started"
      }));
      //
      lodash.assign(self._store, { port, host });
      //
      resolve(serverInstance);
    }));
  });
};
//
WebserverPortlet.prototype.stop = function () {
  const { L, T, blockRef, portletConfig, protocol, host, port, server } = this._store;
  //
  if (portletConfig.enabled === false) return Promise.resolve();
  return new Promise(function(resolve, reject) {
    L && L.has("silly") && L.log("silly", T && T.add({ protocol, host, port }).toMessage({
      tags: [ blockRef, "webserver", "stopping" ],
      text: "webserver is stopping"
    }));
    server.close(function (err) {
      chores.isVerboseForced("webserver", portletConfig) &&
          chores.logConsole("webserver has been closed");
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

WebserverHandler.referenceHash = {};

module.exports = WebserverHandler;

function extractConfigAddress (portletConfig) {
  let port = 7979;
  if ("port" in portletConfig) {
    port = portletConfig.port;
  }
  let host = "0.0.0.0";
  if ("host" in portletConfig) {
    host = portletConfig.host;
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

const readFileSync = fs.readFileSync.bind(fs);
