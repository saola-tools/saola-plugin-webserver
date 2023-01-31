"use strict";

const path = require("path");
const plugin = require("@saola/core").registerLayerware(__dirname);

const builtinPackages = {
  "portlet": path.join(__dirname, ".", "lib/supports/portlet"),
};

plugin.require = function(packageName) {
  if (packageName in builtinPackages) {
    // eslint-disable-next-line security/detect-non-literal-require,security/detect-object-injection
    return require(builtinPackages[packageName]);
  }
  return null;
};

module.exports = plugin;
