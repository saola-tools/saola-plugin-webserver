"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");

const DEFAULT_RUNLET_NAME = "default";
const RUNLETS_COLLECTION_NAME = "runlets";

function standardizeConfig (sandboxConfig, globalFieldNames) {
  globalFieldNames = globalFieldNames || [];
  if (!globalFieldNames.includes(RUNLETS_COLLECTION_NAME)) {
    globalFieldNames.push(RUNLETS_COLLECTION_NAME);
  }
  if (!lodash.has(sandboxConfig, RUNLETS_COLLECTION_NAME)) {
    lodash.set(sandboxConfig, RUNLETS_COLLECTION_NAME, {});
  }
  const runlets = lodash.get(sandboxConfig, RUNLETS_COLLECTION_NAME);
  //
  const globalRunletConfig = lodash.omit(sandboxConfig, globalFieldNames);
  //
  if (lodash.has(runlets, DEFAULT_RUNLET_NAME)) {
    lodash.merge(runlets[DEFAULT_RUNLET_NAME], globalRunletConfig);
  } else {
    lodash.set(runlets, DEFAULT_RUNLET_NAME, globalRunletConfig);
  }
  //
  return lodash.omit(sandboxConfig, lodash.keys(globalRunletConfig));
}

module.exports = {
  DEFAULT_RUNLET_NAME,
  RUNLETS_COLLECTION_NAME,
  standardizeConfig
};
