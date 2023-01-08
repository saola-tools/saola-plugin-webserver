"use strict";

const Devebot = require("devebot");
const Promise = Devebot.require("bluebird");
const lodash = Devebot.require("lodash");

const DEFAULT_PORTLET_NAME = "default";
const PORTLETS_COLLECTION_NAME = "portlets";

function portletifyConfig (sandboxConfig, globalFieldNames) {
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

/**
 * portletForwarder is an interface with hasPortlet() method
 * portletArguments ~ { L, T, blockRef }
 * @param {*} params
 */
 function PortletMixiner (params) {
  const self = this;
  const { pluginConfig, portletForwarder, portletArguments, PortletConstructor } = params || {};

  this._portlets = {};
  lodash.forOwn(pluginConfig.portlets, function(portletConfig, portletName) {
    if (portletConfig.enabled !== false) {
      self._portlets[portletName] = {
        available: hasPortletOf(portletForwarder, portletName),
        processor: new PortletConstructor(Object.assign({
          portletConfig, portletName, portletForwarder
        }, portletArguments || {}))
      };
    }
  });
}

PortletMixiner.prototype.getPortletNames = function() {
  return lodash.keys(this._portlets);
};

PortletMixiner.prototype.hasPortlet = function(portletName) {
  portletName = portletName || DEFAULT_PORTLET_NAME;
  return this._portlets[portletName] && this._portlets[portletName].available || false;
};

PortletMixiner.prototype.getPortlet = function(portletName) {
  portletName = portletName || DEFAULT_PORTLET_NAME;
  return this._portlets[portletName] && this._portlets[portletName].processor || undefined;
};

PortletMixiner.prototype.eachPortlets = function(iteratee, portletNames, options) {
  if (lodash.isNil(portletNames)) {
    portletNames = this.getPortletNames();
  }
  if (lodash.isString(portletNames)) {
    portletNames = [portletNames];
  }
  if (!lodash.isArray(portletNames)) {
    return Promise.reject(newError("The second argument must be an array", {
      payload: {
        type: typeof portletNames,
        value: portletNames,
      }
    }));
  }
  //
  if (!lodash.isFunction(iteratee)) {
    return Promise.reject(newError("The first argument must be a function", {
      payload: {
        type: typeof iteratee,
        value: iteratee,
      }
    }));
  }
  //
  const selectedPortlets = [];
  for (const portletName of portletNames) {
    const selectedPortlet = this.getPortlet(portletName);
    if (selectedPortlet) {
      selectedPortlets.push(selectedPortlet);
    }
  }
  //
  return Promise.mapSeries(selectedPortlets, iteratee);
};

function hasPortletOf (portletForwarder, portletName) {
  if (portletForwarder && lodash.isFunction(portletForwarder.hasPortlet)) {
    return portletForwarder.hasPortlet(portletName);
  }
  return true;
}

function newError (name, options) {
  options = options || {};
  const err = new Error(options.message);
  err.name = name;
  err.payload = options.payload;
  return err;
}

module.exports = {
  DEFAULT_PORTLET_NAME,
  PORTLETS_COLLECTION_NAME,
  portletifyConfig,
  standardizeConfig: portletifyConfig,
  PortletMixiner,
};
