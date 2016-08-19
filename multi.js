"use strict";

const DUPLICATION_ALLOWED_SYMBOL = Symbol("Is duplication of methods/properties in prototype chain allowed");
const ERROR_IF_MISSING_SYMBOL = Symbol("Throw error if method/property is missing");
const ALLOW_PROPERTY_OVERRIDE_SYMBOL = Symbol("Should override property if true");
const PROTOTYPE_SYMBOL = Symbol.for("[[Prototype]]");
const INNER_OBJECT_SYMBOL = Symbol("The inner object used by the proxy for various actions");
const ALLOW_PROPERTY_DELETION_SYMBOL = Symbol("Is property deletion from proxy allowed");
const HANDLERS_SYMBOL = Symbol("The proxy objects handlers");
const ALLOWED_HANDLERS_LIST = [ "apply",
                                "construct",
                                "defineProperty",
                                "deleteProperty",
                                "getOwnPropertyDescriptor",
                                "getPrototypeOf",
                                "isExtensible",
                                "preventExtensions",
                                "setPrototypeOf"
                              ];
const DISALLOWED_HANDLERS_LIST = ["get", "set", "has", "ownKeys"];

var MultiFactory = {};

/**
 * Main method for constructing an object which inherits properties
 * from the objects in the fathersArray thus imitating multiple prototype delegation.
 * @param  {Array}   [fathersArray=[]]      The array of objects from which to imitate prototype delegation
 * @param  {Boolean} [allowDuplicate=true]  Boolean to determine if duplicate properties from the fathers are allowed
 * @param  {Boolean} [errorIfMissing=false] Boolean to determine if to throw an error when accessing a non-existant property
 * @param  {Boolean} [allowOverride=true]   Boolean to determine if property overriding on the proxy is allowed
 * @param  {Boolean} [allowDeletion=false]  Boolean to determine if property deletion on all fathers in the hierarchy is permited.
 * @return {Proxy}                         A proxy object from which to access the properties/methods from the hierarchy
 */
MultiFactory.constructInheritance =
            function constructInheritance(
                            fathersArray = [],
                            allowDuplicate = true,
                            errorIfMissing = false,
                            allowOverride = true,
                            allowDeletion = false
                           ) {
            // create the inner object
            let targetObj = {};
            // initialize symbol properties
            targetObj[DUPLICATION_ALLOWED_SYMBOL] = allowDuplicate;
            targetObj[ERROR_IF_MISSING_SYMBOL] = errorIfMissing;
            targetObj[ALLOW_PROPERTY_OVERRIDE_SYMBOL] = allowOverride;
            targetObj[ALLOW_PROPERTY_DELETION_SYMBOL] = allowDeletion;
            targetObj[PROTOTYPE_SYMBOL] = fathersArray;
            // create an inner dependency to be used for property addition
            // of elements that do not belong in the hierarchy
            targetObj[INNER_OBJECT_SYMBOL] = targetObj;
            //construct the proxy handlers
            let handlers = constructHandlers();
            // add a reference to the proxy's handlers
            // to be used for dynamic addition\removeval of handlers
            targetObj[HANDLERS_SYMBOL] = handlers;
            return new Proxy(targetObj, handlers);
};

/**
 * Removes the passed father object from the hierarchy only if it is present in it.
 * @param  {Proxy}  proxyObj      The proxy object from which to remove from it's hierarchy.
 * @param  {Object}  father        The object to be removed from the hierarchy
 * @param  {Boolean} [silent=true] Boolean to determine whether or not to throw an error
 *                                 if the passed father is in the hierarchy or not.
 * @return {Boolean}                Boolean indicating if the father object was removed from the hierarchy.
 */
MultiFactory.removeFatherFromProxy = function removeFatherFromProxy(proxyObj, father, silent = true) {
    let fathersArray = proxyObj[PROTOTYPE_SYMBOL];
    let index = fathersArray.indexOf(father);
    if(!~index && !silent) {
      throw "Passed object does not exist in hierarchy and silent is set to false";
    }
    if(~index) {
      fathersArray.splice(index, 1);
      return true;
    }
    return false;
}

/**
 * Adds the father object to the hierarchy only if it is not already pesent.
 * @param {Proxy}  proxyObj           The proxy object to whose hierarchy to add the father.
 * @param {Object}  father             The father object to be added to the hierarchy.
 * @param {Boolean} [putUpfront=false] Boolean to decide where to put in the fathers list
 *                                     the father. If set to true it will be put up front and
 *                                     if DUPLICATION_ALLOWED_SYMBOL is set to true, then it's
 *                                     duplicating properties/methods wont be used. If set to false
 *                                     it's duplicate properties/methods will be used when calling
 *                                     them from the proxy object.
 * @return {Boolean}                   Boolean indicating if the addition was successfull.
 */
MultiFactory.addFatherToProxy = function addFatherToProxy(proxyObj, father, putUpfront = false) {
  let fathersArray = proxyObj[PROTOTYPE_SYMBOL];
  let index = fathersArray.indexOf(father);
  if(!~index) {
    putUpfront ? fathersArray.unshift(father) : fathersArray.push(father);
    return true;
  }
  return false;
}

/**
 * Adds a property/method to the inner proxy object, separate from the
 * hierarchy. Id ALLOW_PROPERTY_OVERRIDE_SYMBOL is false, then
 * all atempts to override a property will throw an error. If it is set to
 * true then we override that property opnly on the inner proxy object
 * and not on one of the fathers.
 * @param {Proxy} proxyObj     The proxy object to whose inner object to add the property.
 * @param {String} propertyName The name of the property to be added.
 * @param {Object} property     The property object.
 */
MultiFactory.addPropertyToProxy = function addPropertyToProxy(proxyObj, propertyName, property) {
  // we have implemented a has handler, so the line bellow will check in the whole hierarchy
  let hasProperty = propertyName in proxyObj;
  if(hasProperty && !proxyObj[ALLOW_PROPERTY_OVERRIDE_SYMBOL]) {
    throw "Proxy already has a property with this name and overriding it is disallowed currently";
  }
  proxyObj[INNER_OBJECT_SYMBOL][propertyName] = property;
}

/**
 * Deletes a property only from the inner object of the proxy.
 * @param  {Proxy}  proxyObj      The proxy object from which to remove the property.
 * @param  {String}  propertyName  The name of the property.
 * @param  {Boolean} [silent=true] Boolean to determine if an error should be thrown if
 *                                 property is not present.
 * @return {Boolean}               Boolean indicating if the deletion was successfull.
 */
MultiFactory.deletePropertyFromProxy = function deletePropertyFromProxy(proxyObj, propertyName, silent = true) {
  let hasProperty = Reflect.has(proxyObj[INNER_OBJECT_SYMBOL], propertyName);
  if(!hasProperty && !silent) {
    throw "Could not delete property because it is not present and silent is set to false";
  }
  if(hasProperty) {
    delete proxyObj[INNER_OBJECT_SYMBOL][propertyName];
    return true;
  }
  return false;
}

/**
 * Checks to see if the passed father object is present in the proxy hierarchy.
 * @param  {Proxy}  proxyObj The proxy object.
 * @param  {Object}  father   The father object to be checked if present in hierarchy.
 * @return {Boolean}          True if present, false outherwise.
 */
MultiFactory.isFatherInHierarchy = function isFatherInHierarchy(proxyObj, father) {
  for(let proto of proxyObj[PROTOTYPE_SYMBOL]) {
    if(proto == father) {
      return true;
    }
  }
  return false;
}

/**
 * Checks to see if the father object can be added to the hierarchy in a maner
 * in which the father's properties are not in a conflict with any existing
 * properties in the proxyObj hierarchy.
 * @param  {Proxy} proxyObj The proxy object.
 * @param  {Object} father   The father object taht should be tested.
 * @return {Boolean}         True if it is safe to add the father object to
 *                           the hierarchy, false outherwise.
 */
MultiFactory.canFatherBeSafelyAdded = function canFatherBeSafelyAdded(proxyObj, father) {
  // call with this to let method be bound to objects
  // that use a custom isFatherInHierarchy method
  if(!this.isFatherInHierarchy(proxyObj,father)){
    // get both objects properties names and check for A U B = A + B
    // because we have implemented an ownKeys handler the first line
    // bellow will return all property names in the hierarchy
    let proxyNames = Object.getOwnPropertyNames(proxyObj);
    let fatherNames = Object.getOwnPropertyNames(father);
    for(let fn of fatherNames) {
      if(~proxyNames.indexOf(fn)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Adds the father object to the hierarchy only if it's
 * properties do not cause any duplication conflicts in
 * the hierarchy.
 * @param {Proxy} proxyObj The proxy object to whose hierarchy to add.
 * @param {Object} father   The father object which is to be tested.
 * @return {Boolean}        True if addition was successfull, false outherwise.
 */
MultiFactory.addFatherToProxyIfSafe = function addFatherToProxyIfSafe(proxyObj, father){
  // call with this to let method be bound to objects
  // that use a custom canFatherBeSafelyAdded method
  if(this.canFatherBeSafelyAdded(proxyObj, father)){
    return this.addFatherToProxy(proxyObj,father);
  }
  return false;
}

/**
 * Checks to see if a property is present on some level in the hierarchy.
 * @param  {Proxy}  proxyObj     The proxy object on which to do the test.
 * @param  {String}  propertyName The property's name to be tested.
 * @return {Integer}              An integer indicating the number of times
 *                                the passed property name is present in the hierarchy.
 */
MultiFactory.isPropertyPresent = function isPropertyPresent(proxyObj, propertyName) {
    let counter = 0;
    if(propertyName in proxyObj[INNER_OBJECT_SYMBOL]) counter++;
    for(let proto of proxyObj[PROTOTYPE_SYMBOL]) {
      if(propertyName in proto) counter++;
    }
    return counter;
}

/**
 * Returs an array of the names of all the properties that are present more
 * than one time in the hierarchy.
 * @param  {Proxy} proxyObj The proxy object.
 * @return {Array}          An array of the duplicate property names in the hierarchy.
 */
MultiFactory.getDuplicatePropertiesList = function getDuplicatePropertyList(proxyObj) {
  // we have implemented an ownKeys handler so the line bellow
  // will get all property names in the hierarchy
  let proxyNames = Object.getOwnPropertyNames(proxyObj);
  let counterObj = {};
  let duplicatesArr = [];
  for(let name of proxyNames) {
    if(name in counterObj) {
      duplicatesArr.push(name);
    } else {
      counterObj[name] = 0;
    }
  }
  return duplicatesArr;
}

/**
 * Returs an array of all the unique property names /those who are not duplicated/
 * in the hierarchy.
 * @param  {Proxy} proxyObj The proxy object.
 * @return {Array}          An array of all the unique property names in the hierarchy.
 */
MultiFactory.getUniquePropertiesList = function getUniquePropertiesList(proxyObj) {
  let duplicateNames = this.getDuplicatePropertiesList(proxyObj);
  let proxyNames = Object.getOwnPropertyNames(proxyObj);
  let uniqueNames = [];
  // remove the dulicates from the list
  for(let name of proxyNames) {
    if(!~duplicateNames.indexOf(name)) {
      uniqueNames.push(name);
    }
  }
  return uniqueNames;
}

/**
 * Returns the immidiated /one level above/ fathers of the proxy inner object.
 * @param  {Proxy} proxyObj The proxy object.
 * @return {Array}          An array of the proxies inner object immidiate parents.
 */
MultiFactory.getProxyFathersList = function getProxyFathersList(proxyObj) {
  return proxyObj[PROTOTYPE_SYMBOL];
}

/**
 * Adds a handler to the proxy object only if it is in the ALLOWED_HANDLERS_LIST.
 * @param {Proxy} proxyObj    The proxy object.
 * @param {String} handlerName The name of the handler.
 * @param {Function} handler   The handler function.
 * @return {Boolean}           True if the handler was added, false outherwise.
 */
MultiFactory.addHandler = function addHandler(proxyObj, handlerName, handler, silent = false) {
  let index = ALLOWED_HANDLERS_LIST.indexOf(handlerName);
  if(!~index && !silent) {
    throw "Handler '" + handlerName + "' is not in the list of allowed hadlers to add.";
  }

  if(!~index) return false;

  proxyObj[HANDLERS_SYMBOL][handlerName] = handler;
  return true;
}

/**
 * Removes a handler from the proxy only if it is from the ALLOWED_HANDLERS_LIST.
 * @param  {proxy}  proxyObj      The proxy object.
 * @param  {String}  handlerName   The handler name.
 * @param  {Boolean} [silent=true] If false throw error if the handler name passed
 *                                 is in the DISALLOWED_HANDLERS_LIST;
 * @return {Boolean}               True if the handler was removed, false outherwise.
 */
MultiFactory.removeHandler = function removeHandler(proxyObj, handlerName, silent = true) {
  let index = DISALLOWED_HANDLERS_LIST.indexOf(handlerName);

  if(~index && !silent) {
    throw "Handler '" + handlerName + "' is in the list of disallowed hadlers to remove.";
  }

  if(~ALLOWED_HANDLERS_LIST.indexOf(handlerName)) {
    delete proxyObj[HANDLERS_SYMBOL][handlerName];
    return true;
  }

  return false;
}

/**
 * Gets the handlers that are currently on the proxy.
 * @param  {Proxy} proxyObj  The proxy object.
 * @return {Array}           An array containing the names of the handlers attached to the proxy.
 */
MultiFactory.getProxyHandlers = function getProxyHandlers(proxyObj) {
  return Object.getOwnPropertyNames(proxyObj[HANDLERS_SYMBOL]);
}

/**
 * Returns a copy of the array of allowed hadlers.
 * @return {Array}  The allowed handlers to add/remove/override.
 */
MultiFactory.getAllowedHandlersList = function getAllowedHandlersList() {
  return JSON.parse(JSON.stringify(ALLOWED_HANDLERS_LIST));
}

/**
 * Returns a copy of the array of disallowed hadlers.
 * @return {Array}  The disallowed handlers to add/remove/override.
 */
MultiFactory.getDisallowedHandlersList = function getDisallowedHandlersList() {
  return JSON.parse(JSON.stringify(DISALLOWED_HANDLERS_LIST));
}

/**
 * Construct the handlers to be used for the multiple prototype delegation simulation.
 * These handlers can't and should not be directly modified.
 * @return {Object}  An object containg the proxy handlers.
 */
function constructHandlers() {

    // PS: It's really good Symbols are not enumerable in for..in :)
    let handlers = {}

    /**
     * The get handler for the proxy object.
     */
    handlers.get = function get(target,key,receiver) {
            // first check the inner object
            if (Reflect.has( target, key )) {
                return Reflect.get(target, key, receiver);
            } else {
                // fake the multiple `[[Prototype]]` delegation
                let isPresent = false;
                let foundProp = undefined;
                let counter = 0;
                // check all of the properties of the fathers in the hierarchy
                // and use the last found one
                for (let proto of target[PROTOTYPE_SYMBOL] ) {
                    if (Reflect.has( proto, key )) {
                        isPresent = true;
                        foundProp =  Reflect.get(proto, key, receiver);
                        counter++;
                    }
                }
                // if the DUPLICATION_ALLOWED_SYMBOL is set to false and there are
                // the searched property is a duplicate one throw an error
                if(counter > 1 && !target[DUPLICATION_ALLOWED_SYMBOL]) {
                    throw "Method/property exists in " + counter + " entities. Duplication of methods/properties in prototype chain was disallowed.";
                }
                // if the property is not found and ERROR_IF_MISSING_SYMBOL is set to true
                // throw an error, else return the property or undefined
                if(target[ERROR_IF_MISSING_SYMBOL]) {
                  if(isPresent) {
                    return foundProp;
                  } else {
                    throw "Method/property not found in prototype chain.";
                  }
                } else {
                  return foundProp;
                }
            }
          };

    /**
     * The set handler for the proxy object.
     */
    handlers.set = function set(target,key,val,receiver) {
                // first search the inner object of the proxy
                if(Reflect.has(target, key)) {
                  return Reflect.set(target, key, val, receiver);
                } else {
                  let isPresent = false;
                  let foundProp = undefined;
                  // search in the hierarchy
                  for (let proto of target[PROTOTYPE_SYMBOL] ) {
                      if (Reflect.has( proto, key )) {
                          // use the last found property
                          isPresent = true;
                          foundProp =  Reflect.set(target, key, val, receiver);
                      }
                  }

                  if(target[ERROR_IF_MISSING_SYMBOL]) {
                    if(isPresent) {
                      return foundProp;
                    } else {
                      throw "Method/property not found in prototype chain. Creating a new one was disallowed";
                    }
                  } else {
                    // check to see if it is ok to override/hide
                    // the properties of the fathers in the hierarchy
                    if(!target[ALLOW_PROPERTY_OVERRIDE_SYMBOL]){
                        throw "Overriding of properties/methods of hierarchy fathers is currently disallowed."
                    }
                    return foundProp;
                  }
                }
          };

    /**
     * Handler for the in operator. Check for the existence
     * of the property in the whole hierarchy.
     */
    handlers.has = function has(target, prop) {
        if(Reflect.has(target,prop)) {
          return true;
        }
        // now check in the hierarchy
        for(let proto of target[PROTOTYPE_SYMBOL]) {
          if (Reflect.has(proto, prop)) {
            return true;
          }
        }

        return false;
    }

    /**
     * Handler for Object.getOwnPropertyNames
     */
    handlers.ownKeys = function ownKeys(target) {
      let keysArr = [];
      // do not add the internal Symbol keys, they are not enumerable
      for(let i in target) {
        keysArr.push(i);
      }
      // get the keys of the fathers
      for(let proto of target[PROTOTYPE_SYMBOL]) {
        let names = Object.getOwnPropertyNames(proto);
        keysArr = keysArr.concat(names);
      }

      return keysArr;
    }

    /**
     * Handler for delete operator.
     */
    handlers.deleteProperty = function deleteProperty(target, prop) {
        // if in the inner object, then no problem delete it
        if(Reflect.has(target,prop)) {
          delete target[prop];
          return true;
        }
        // if target deletion is disallowed (default) throw an exception
        if(!target[ALLOW_PROPERTY_DELETION_SYMBOL]) {
          throw "Property deletion thru proxy is currently disallowed. " +
                "Can be set to false in setAllowDeletionOnProxy method. " +
                "If true it will delete the property from all fathers in the hierarchy !!!";
        }
        // deletes from all fathers in the hierarchy
        let isDeleted = false;
        for(let proto of target[PROTOTYPE_SYMBOL]) {
          if(Reflect.has(proto,prop)) {
            delete proto[prop];
            isDeleted= true;
          }
        }

        return isDeleted;
    }

    return handlers;
}

//getters
MultiFactory.getAllowDuplicateOnProxy = function getAllowDuplicateOnProxy(proxyObj, allowDuplicate) {
    return proxyObj[DUPLICATION_ALLOWED_SYMBOL];
};

MultiFactory.getErrorIfMissingOnProxy = function getErrorIfMissingOnProxy(proxyObj, errorIfMissing) {
    return proxyObj[ERROR_IF_MISSING_SYMBOL];
};

MultiFactory.getAllowOverrideOnProxy = function getAllowOverrideOnProxy(proxyObj, allowOverride) {
    return proxyObj[ALLOW_PROPERTY_OVERRIDE_SYMBOL];
};

MultiFactory.getAllowDeletionOnProxy = function getAllowDeletionOnProxy(proxyObj, allowOverride) {
    return proxyObj[ALLOW_PROPERTY_DELETION_SYMBOL];
};

//setters
MultiFactory.setAllowDuplicateOnProxy = function setAllowDuplicateOnProxy(proxyObj, allowDuplicate) {
    proxyObj[DUPLICATION_ALLOWED_SYMBOL] = allowDuplicate;
};

MultiFactory.setErrorIfMissingOnProxy = function setErrorIfMissingOnProxy(proxyObj, errorIfMissing) {
    proxyObj[ERROR_IF_MISSING_SYMBOL] = errorIfMissing;
};

MultiFactory.setAllowOverrideOnProxy = function setAllowOverrideOnProxy(proxyObj, allowOverride) {
    proxyObj[ALLOW_PROPERTY_OVERRIDE_SYMBOL] = allowOverride;
};

MultiFactory.setAllowDeletionOnProxy = function setAllowDeletionOnProxy(proxyObj, allowDeletion) {
    proxyObj[ALLOW_PROPERTY_DELETION_SYMBOL] = allowDeletion;
};

//export {MultiFactory as default};
