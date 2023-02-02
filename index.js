"use strict";

const Devebot = require("@saola/core");
const lodash = Devebot.require("lodash");

const plugin = Devebot.registerLayerware(__dirname);

const builtinPackages = {
  // eslint-disable-next-line security/detect-non-literal-require,security/detect-object-injection
  "portlet": Devebot.require("portlet"),
};

plugin.require = function(packageName) {
  return lodash.get(builtinPackages, packageName);
};

module.exports = plugin;
