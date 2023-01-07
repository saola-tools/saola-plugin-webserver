"use strict";

const path = require("path");
const plugin = require("devebot").registerLayerware(__dirname);

const builtinPackages = {
  "portlet": path.join(__dirname, ".", "lib/supports/portlet"),
};

plugin.require = function(packageName) {
  if (packageName in builtinPackages) {
    return require(builtinPackages[packageName]);
  }
  return null;
};

module.exports = plugin;
