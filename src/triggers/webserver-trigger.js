"use strict";

const Devebot = require("devebot");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

function WebserverTrigger (params = {}) {
  const { packageName, loggingFactory, webserverHandler } = params;

  const blockRef = chores.getBlockRef(__filename, packageName);
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  // @Deprecated
  this.getPort = function () {
    return webserverHandler.getPortlet().getPort();
  };

  // @Deprecated
  this.getHost = function () {
    return webserverHandler.getPortlet().getHost();
  };

  // @Deprecated
  Object.defineProperty(this, "ssl", {
    get: function() {
      return lodash.assign({}, webserverHandler.getPortlet().ssl);
    },
    set: function(value) {}
  });

  // @Deprecated
  Object.defineProperty(this, "server", {
    get: function() {
      return webserverHandler.getPortlet().server;
    },
    set: function(value) {}
  });

  // @Deprecated
  this.attach = this.register = function(outlet) {
    webserverHandler.getPortlet().attach(outlet);
  };

  // @Deprecated
  this.detach = this.unregister = function(outlet) {
    webserverHandler.getPortlet().detach(outlet);
  };

  this.start = function() {
    L && L.has("silly") && L.log("silly", T && T.add({ blockRef }).toMessage({
      tags: [ blockRef, "trigger-starting" ],
      text: " - trigger[${blockRef}] is starting"
    }));
    return webserverHandler.start();
  };

  this.stop = function() {
    L && L.has("silly") && L.log("silly", T && T.add({ blockRef }).toMessage({
      tags: [ blockRef, "trigger-stopping" ],
      text: " - trigger[${blockRef}] is stopping"
    }));
    return webserverHandler.stop();
  };

  this.getServiceInfo = function() {
    const host = webserverHandler.getPortlet().getHost();
    const port = webserverHandler.getPortlet().getPort();
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
