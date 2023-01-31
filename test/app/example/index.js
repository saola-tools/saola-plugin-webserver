"use strict";

var path = require("path");

var app = require("@saola/core").launchApplication({
  appRootPath: __dirname
}, [
  {
    name: "@saola/plugin-webserver",
    path: path.join(__dirname, "../../..", "index.js")
  }
]);

if (require.main === module) app.server.start();

module.exports = app;
