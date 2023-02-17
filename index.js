"use strict";

const Core = require("@saola/core");
const lodash = Core.require("lodash");

const plugin = Core.registerLayerware(__dirname);

const builtinPackages = {
  // eslint-disable-next-line security/detect-non-literal-require,security/detect-object-injection
  "portlet": Core.require("portlet"),
};

plugin.require = function(packageName) {
  return lodash.get(builtinPackages, packageName);
};

module.exports = plugin;
