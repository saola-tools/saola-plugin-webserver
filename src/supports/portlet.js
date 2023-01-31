"use strict";

const Devebot = require("@saola/core");
const Promise = Devebot.require("bluebird");
const lodash = Devebot.require("lodash");

const DEFAULT_PORTLET_NAME = "default";
const PORTLETS_COLLECTION_NAME = "portlets";

function createPortletifier () {
  function Service (params = {}) {
    const { sandboxBaseConfig, sandboxConfig } = params;
    //
    let pluginConfig;
    //
    this.getPluginConfig = function() {
      pluginConfig = pluginConfig || portletifyConfig(sandboxConfig);
      return pluginConfig;
    };
    //
    this.getPortletDescriptors = function(selectedPortlets) {
      return _filterPortletDescriptors(this.getPluginConfig(), selectedPortlets);
    };
    //
    this.getPortletBaseConfig = function() {
      return sandboxBaseConfig;
    }
  }
  //
  return Service;
}

function getPortletDescriptors (sandboxConfig, selectedPortlets) {
  return _filterPortletDescriptors(portletifyConfig(sandboxConfig), selectedPortlets);
}

function _filterPortletDescriptors (pluginConfig, selectedPortlets) {
  const portletDescriptors = lodash.get(pluginConfig, PORTLETS_COLLECTION_NAME);
  if (lodash.isArray(selectedPortlets)) {
    return lodash.pick(portletDescriptors, selectedPortlets);
  }
  return portletDescriptors;
}

function portletifyConfig (sandboxConfig, globalFieldNames) {
  if (!lodash.isPlainObject(sandboxConfig)) {
    throw newError("InvalidSandboxConfigError", {
      message: "sandboxConfig must be an object",
      payload: { sandboxConfig }
    });
  }
  //
  if (!lodash.has(sandboxConfig, PORTLETS_COLLECTION_NAME)) {
    lodash.set(sandboxConfig, PORTLETS_COLLECTION_NAME, {});
  }
  const portlets = lodash.get(sandboxConfig, PORTLETS_COLLECTION_NAME);
  //
  globalFieldNames = globalFieldNames || [];
  if (!globalFieldNames.includes(PORTLETS_COLLECTION_NAME)) {
    globalFieldNames.push(PORTLETS_COLLECTION_NAME);
  }
  const defaultPortletConfig = lodash.omit(sandboxConfig, globalFieldNames);
  //
  if (lodash.has(portlets, DEFAULT_PORTLET_NAME)) {
    lodash.merge(portlets[DEFAULT_PORTLET_NAME], defaultPortletConfig);
    return lodash.omit(sandboxConfig, lodash.keys(defaultPortletConfig));
  } else {
    if (lodash.size(defaultPortletConfig) > 0 || lodash.size(portlets) == 0) {
      lodash.set(portlets, DEFAULT_PORTLET_NAME, defaultPortletConfig);
      return lodash.omit(sandboxConfig, lodash.keys(defaultPortletConfig));
    }
  }
  //
  return sandboxConfig;
}

/**
 * portletForwarder is an interface with hasPortlet() method
 * portletArguments ~ { L, T, blockRef }
 * @param {*} params
 */
function PortletMixiner (params = {}) {
  const self = this;
  this._portlets = {};
  this._aliases = {};
  //
  let { portletBaseConfig, portletDescriptors } = params;
  const { portletReferenceHolders, portletArguments, PortletConstructor } = params;
  //
  const { pluginConfig, portletCommonConfig, portletForwarder } = params;
  let { portletAvailableChecker } = params;
  //
  portletBaseConfig = portletBaseConfig || portletCommonConfig || {};
  //
  if (lodash.isNil(portletDescriptors)) {
    if (lodash.isNil(pluginConfig)) {
      throw newError("UndefinedPortletDescriptors", {
        message: "portletDescriptors or pluginConfig must be declared"
      });
    } else {
      // @deprecated
      if (!(PORTLETS_COLLECTION_NAME in pluginConfig)) {
        throw newError("InvalidPluginConfigPortlets", {
          message: "pluginConfig.portlets not found",
          payload: {
            fieldName: PORTLETS_COLLECTION_NAME
          }
        });
      }
      portletDescriptors = lodash.get(pluginConfig, PORTLETS_COLLECTION_NAME);
    }
  }
  if (!lodash.isPlainObject(portletDescriptors)) {
    throw newError("InvalidPortletDescriptors", {
      message: "portletDescriptors must be an object"
    });
  }
  //
  if (portletReferenceHolders && !lodash.isPlainObject(portletReferenceHolders)) {
    throw newError("InvalidPortletReferenceHolders", {
      message: "portletReferenceHolders must be a plain object"
    });
  }
  //
  portletAvailableChecker = portletAvailableChecker || function (portletName) {
    return hasPortletOf(portletForwarder, portletName);
  };
  //
  lodash.forOwn(portletDescriptors, function(portletDescriptor, portletKey) {
    if (portletDescriptor.enabled !== false) {
      const portletName = lodash.get(portletDescriptor, ["__metadata__", "name"], portletKey);
      if (portletName != portletKey) {
        self._aliases[portletKey] = portletName;
      }
      const portletConfig = lodash.merge({}, portletBaseConfig, lodash.omit(portletDescriptor, "__metadata__", {}));
      //
      const portletDependencies = {};
      for (const portletReferenceName in portletReferenceHolders) {
        const referenceHolder = portletReferenceHolders[portletReferenceName];
        if (referenceHolder && referenceHolder.hasPortlet && referenceHolder.hasPortlet(portletName)) {
          portletDependencies[portletReferenceName] = referenceHolder.getPortlet(portletName);
        }
      }
      const isPortletAvailable = lodash.size(portletDependencies) == lodash.size(portletReferenceHolders);
      //
      self._portlets[portletName] = {
        available: portletAvailableChecker(portletName) && isPortletAvailable,
        processor: new PortletConstructor(Object.assign({
          portletConfig, portletName,
        }, portletDependencies, portletArguments || {}))
      };
    }
  });
  //
  this._strictMode = lodash.get(params, "strictMode", false);
}

PortletMixiner.prototype.getPortletNames = function() {
  return lodash.keys(this._portlets);
};

PortletMixiner.prototype.resolvePortletName = function (portletName) {
  return this._aliases[portletName] || portletName || DEFAULT_PORTLET_NAME;
};

PortletMixiner.prototype.hasPortlet = function(portletName) {
  portletName = this.resolvePortletName(portletName);
  return this._portlets[portletName] && this._portlets[portletName].available || false;
};

PortletMixiner.prototype.getPortlet = function(portletName) {
  portletName = this.resolvePortletName(portletName);
  const processor = this._portlets[portletName] && this._portlets[portletName].processor;
  if (!processor) {
    if (this._strictMode) {
      throw newError("PortletNotFoundError", {
        payload: {
          portletName,
          availablePortlets: lodash.keys(this._portlets),
        }
      });
    }
    return undefined;
  }
  return processor;
};

PortletMixiner.prototype.eachPortlets = function(iteratee, portletNames) {
  if (!lodash.isFunction(iteratee)) {
    return Promise.reject(newError("InvalidArgumentError", {
      message: "The first argument must be a function",
      payload: {
        type: typeof iteratee,
        value: iteratee,
      }
    }));
  }
  //
  if (lodash.isNil(portletNames)) {
    portletNames = this.getPortletNames();
  }
  if (lodash.isString(portletNames)) {
    portletNames = [portletNames];
  }
  if (!lodash.isArray(portletNames)) {
    return Promise.reject(newError("InvalidArgumentError", {
      message: "The second argument must be an array",
      payload: {
        type: typeof portletNames,
        value: portletNames,
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
  createPortletifier,
  getPortletDescriptors,
  portletifyConfig,
  PortletMixiner,
};
