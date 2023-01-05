"use strict";

const Devebot = require("devebot");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

function WebserverTrigger (params = {}) {
  const { packageName, loggingFactory, webserverHandler } = params;

  const blockRef = chores.getBlockRef(__filename, packageName);
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  this.getPort = function () {
    return webserverHandler.getSubWebServer().getPort();
  };

  this.getHost = function () {
    return webserverHandler.getSubWebServer().getHost();
  };

  // @Deprecated
  Object.defineProperty(this, "ssl", {
    get: function() {
      return lodash.assign({}, webserverHandler.getSubWebServer().ssl);
    },
    set: function(value) {}
  });

  // @Deprecated
  Object.defineProperty(this, "server", {
    get: function() {
      return webserverHandler.getSubWebServer().server;
    },
    set: function(value) {}
  });

  this.attach = this.register = function(outlet) {
    webserverHandler.getSubWebServer().attach(outlet);
  };

  this.detach = this.unregister = function(outlet) {
    webserverHandler.getSubWebServer().detach(outlet);
  };

  this.start = function() {
    return webserverHandler.getSubWebServer().start();
  };

  this.stop = function() {
    return webserverHandler.getSubWebServer().stop();
  };

  this.getServiceInfo = function() {
    const host = webserverHandler.getSubWebServer().getHost();
    const port = webserverHandler.getSubWebServer().getPort();
    return {
      webserver_host: host,
      webserver_port: port
    };
  };

  this.getServiceHelp = function() {
    let info = this.getServiceInfo();
    return {
      type: "record",
      title: "Webserver plugin trigger",
      label: {
        webserver_host: "Host",
        webserver_port: "Port"
      },
      data: {
        webserver_host: info.webserver_host,
        webserver_port: info.webserver_port
      }
    };
  };
}

WebserverTrigger.referenceHash = {
  webserverHandler: "webserverHandler"
};

module.exports = WebserverTrigger;
