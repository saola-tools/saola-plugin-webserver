"use strict";

const express = require("express");
const targetPortlet = "monitor";

function Service (params) {
  params = params || {};

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const webserverHandler = params.webserverHandler;

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

    app.get("/monitor/:id", function(req, res) {
      res.status(200).json({
        port: webserverHandler.getPortlet(targetPortlet).getPort(),
        host: webserverHandler.getPortlet(targetPortlet).getHost(),
        message: targetPortlet + " [" + req.params.id + "] request successfully"
      });
    });

    webserverHandler.attach(app, targetPortlet);
  }
}

Service.referenceHash = {
  webserverHandler: "webserverHandler"
};

module.exports = Service;
