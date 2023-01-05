"use strict";

const express = require("express");

function Service (params) {
  params = params || {};

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const webserverTrigger = params.webserverTrigger;

  const pluginCfg = params.sandboxConfig;
  L.has("silly") && L.log("silly", "configuration: %s", JSON.stringify(pluginCfg));

  if (pluginCfg.enabled !== false) {
    const app = express();

    app.use("*", function(req, res, next) {
      process.nextTick(function() {
        L.log("silly", "=@ example receives a new request:");
        L.log("silly", " - Invoker IP: %s / %s", req.ip, JSON.stringify(req.ips));
        L.log("silly", " - protocol: " + req.protocol);
        L.log("silly", " - host: " + req.hostname);
        L.log("silly", " - path: " + req.path);
        L.log("silly", " - URL: " + req.url);
        L.log("silly", " - originalUrl: " + req.originalUrl);
        L.log("silly", " - body: " + JSON.stringify(req.body));
        L.log("silly", " - user-agent: " + req.headers["user-agent"]);
      });
      next();
    });

    app.get("/example/:id", function(req, res) {
      res.status(200).json({
        port: webserverTrigger.getPort(),
        host: webserverTrigger.getHost(),
        message: "example [" + req.params.id + "] request successfully"
      });
    });

    webserverTrigger.attach(app);
  }
}

Service.referenceHash = {
  webserverTrigger: "webserverTrigger"
};

module.exports = Service;
