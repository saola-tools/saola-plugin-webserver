"use strict";

const path = require("path");
const plugin = require("devebot").registerLayerware(__dirname);

const builtinPackages = {
  "runlet": path.join(__dirname, ".", "lib/supports/runlet"),
};

plugin.require = function(packageName) {
  if (packageName in builtinPackages) {
    return require(builtinPackages[packageName]);
  }
  return null;
};

module.exports = plugin;
