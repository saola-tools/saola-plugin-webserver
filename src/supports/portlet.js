"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");

const DEFAULT_PORTLET_NAME = "default";
const PORTLETS_COLLECTION_NAME = "portlets";

function standardizeConfig (sandboxConfig, globalFieldNames) {
  globalFieldNames = globalFieldNames || [];
  if (!globalFieldNames.includes(PORTLETS_COLLECTION_NAME)) {
    globalFieldNames.push(PORTLETS_COLLECTION_NAME);
  }
  if (!lodash.has(sandboxConfig, PORTLETS_COLLECTION_NAME)) {
    lodash.set(sandboxConfig, PORTLETS_COLLECTION_NAME, {});
  }
  const portlets = lodash.get(sandboxConfig, PORTLETS_COLLECTION_NAME);
  //
  const globalPortletConfig = lodash.omit(sandboxConfig, globalFieldNames);
  //
  if (lodash.has(portlets, DEFAULT_PORTLET_NAME)) {
    lodash.merge(portlets[DEFAULT_PORTLET_NAME], globalPortletConfig);
  } else {
    lodash.set(portlets, DEFAULT_PORTLET_NAME, globalPortletConfig);
  }
  //
  return lodash.omit(sandboxConfig, lodash.keys(globalPortletConfig));
}

module.exports = {
  DEFAULT_PORTLET_NAME,
  PORTLETS_COLLECTION_NAME,
  standardizeConfig
};
