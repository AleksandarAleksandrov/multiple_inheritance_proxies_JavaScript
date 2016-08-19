#This tool is written with the intension of simulating multiple prototype delegation using proxies. Below are some  examples of it's usage.

#Documentation isn't that good at this point, see code if necessary :)

1. You can create an object which is used to delegate method calls to numerous other objects as:
```javascript
MultiFactory.constructInheritance(fathersArray,allowDuplicate,errorIfMissing,allowOverride,allowDeletion)
```

All of the parameters are optional. The fathersArray is an array containing the objects whose methods should be used. For example:
```javascript
    var obj1 = {};
    obj1.foo = () => console.log("In obj1 foo");

    var obj2 = {};
    obj2.foo = () => console.log("In obj2 foo");
    obj2.bar = () => console.log("In obj2 bar");

    var mfo = MultiFactory.constructInheritance([obj1]);
    var mfo2 = MultiFactory.constructInheritance([mfo,obj2]); // you can use other proxies as well

    mfo2.foo(); // calls obj2.foo
    mfo2.bar(); // calls obj2.bar
```

The reason obj2.foo is called instead of obj1.foo is that the insertion order of the fathers matters. If we had first inserted obj2 and after that obj1 we would have called obj1.foo .
When allowDuplicate is set to false if we tried to call mfo2.foo() an error would be thrown because we have a method/property that is present in at least two places in the hierarchy. If allowDuplicate is set to true then the last added object method/property with that name would be used.
If errorIfMissing is set to true, if we try to access a method/property that is not in the hierarchy an error would be thrown.
```javascript
var mfo = MultiFactory.constructInheritance([obj1], true, true);
mfo.baz; // throw error
mfo.baz = 5; // throw error
```
If allowOverride is false then this will throw an error:
```javascript
MultiFactory.addPropertyToProxy(mfo, "foo", () => {}); // throw error
```
If allowDeletion is set to true, then:
```javascript
delete mfo.foo; // this deletes the property from obj1 as well
```
There are getters and setters for all of the booleans that can be passed to the method.

####Important: The implemented proxy handlers are : ["get", "set", "has", "ownKeys", "deleteProperty"]
The first four can't and should be changed removed !

####Important: You can add your own proxy handlers to determine the behaviour you want from your objects.
####The allowed handlers to create/remove/override are :
#### [ "apply", "construct", "defineProperty", "deleteProperty",  "getOwnPropertyDescriptor", "getPrototypeOf", "isExtensible", "preventExtensions", "setPrototypeOf"]

2. A list of most of the methods with some examples is shown bellow:
```javascript
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

MultiFactory.addFatherToProxy(proxyObj, father, putUpfront = false)

/**
* Removes the passed father object from the hierarchy only if it is present in it.
* @param  {Proxy}  proxyObj      The proxy object from which to remove from it's hierarchy.
* @param  {Object}  father        The object to be removed from the hierarchy
* @param  {Boolean} [silent=true] Boolean to determine whether or not to throw an error
*                                 if the passed father is in the hierarchy or not.
* @return {Boolean}                Boolean indicating if the father object was removed from the hierarchy.
*/

MultiFactory.removeFatherFromProxy(proxyObj, father, silent = true)

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

MultiFactory.addPropertyToProxy(proxyObj, propertyName, property)

/**
* Deletes a property only from the inner object of the proxy.
* @param  {Proxy}  proxyObj      The proxy object from which to remove the property.
* @param  {String}  propertyName  The name of the property.
* @param  {Boolean} [silent=true] Boolean to determine if an error should be thrown if
*                                 property is not present.
* @return {Boolean}               Boolean indicating if the deletion was successfull.
*/

MultiFactory.deletePropertyFromProxy(proxyObj, propertyName, silent = true)

/**
* Checks to see if the passed father object is present in the proxy hierarchy.
* @param  {Proxy}  proxyObj The proxy object.
* @param  {Object}  father   The father object to be checked if present in hierarchy.
* @return {Boolean}          True if present, false outherwise.
*/

MultiFactory.isFatherInHierarchy(proxyObj, father)

/**
* Checks to see if the father object can be added to the hierarchy in a maner
* in which the father's properties are not in a conflict with any existing
* properties in the proxyObj hierarchy.
* @param  {Proxy} proxyObj The proxy object.
* @param  {Object} father   The father object taht should be tested.
* @return {Boolean}         True if it is safe to add the father object to
*                           the hierarchy, false outherwise.
*/

MultiFactory.canFatherBeSafelyAdded(proxyObj, father)

/**
* Adds the father object to the hierarchy only if it's
* properties do not cause any duplication conflicts in
* the hierarchy.
* @param {Proxy} proxyObj The proxy object to whose hierarchy to add.
* @param {Object} father   The father object which is to be tested.
* @return {Boolean}        True if addition was successfull, false outherwise.
*/

MultiFactory.addFatherToProxyIfSafe(proxyObj, father)

/**
* Checks to see if a property is present on some level in the hierarchy.
* @param  {Proxy}  proxyObj     The proxy object on which to do the test.
* @param  {String}  propertyName The property's name to be tested.
* @return {Integer}              An integer indicating the number of times
*                                the passed property name is present in the hierarchy.
*/

MultiFactory.isPropertyPresent(proxyObj, propertyName)

/**
* Returs an array of the names of all the properties that are present more
* than one time in the hierarchy.
* @param  {Proxy} proxyObj The proxy object.
* @return {Array}          An array of the duplicate property names in the hierarchy.
*/

MultiFactory.getDuplicatePropertiesList(proxyObj)

/**
* Returs an array of all the unique property names /those who are not duplicated/
* in the hierarchy.
* @param  {Proxy} proxyObj The proxy object.
* @return {Array}          An array of all the unique property names in the hierarchy.
*/

MultiFactory.getUniquePropertiesList(proxyObj)

/**
* Returns the immidiated /one level above/ fathers of the proxy inner object.
* @param  {Proxy} proxyObj The proxy object.
* @return {Array}          An array of the proxies inner object immidiate parents.
*/

MultiFactory.getProxyFathersList(proxyObj)

/**
* Adds a handler to the proxy object only if it is in the ALLOWED_HANDLERS_LIST.
* @param {Proxy} proxyObj    The proxy object.
* @param {String} handlerName The name of the handler.
* @param {Function} handler   The handler function.
* @return {Boolean}           True if the handler was added, false outherwise.
*/

MultiFactory.addHandler(proxyObj, handlerName, handler, silent = false)

/**
* Removes a handler from the proxy only if it is from the ALLOWED_HANDLERS_LIST.
* @param  {proxy}  proxyObj      The proxy object.
* @param  {String}  handlerName   The handler name.
* @param  {Boolean} [silent=true] If false throw error if the handler name passed
*                                 is in the DISALLOWED_HANDLERS_LIST;
* @return {Boolean}               True if the handler was removed, false outherwise.
*/

MultiFactory.removeHandler(proxyObj, handlerName, silent = true)

/**
* Gets the handlers that are currently on the proxy.
* @param  {Proxy} proxyObj  The proxy object.
* @return {Array}           An array containing the names of the handlers attached to the proxy.
*/

MultiFactory.getProxyHandlers(proxyObj)

/**
* Returns a copy of the array of allowed hadlers.
* @return {Array}  The allowed handlers to add/remove/override.
*/

MultiFactory.getAllowedHandlersList()

/**
* Returns a copy of the array of disallowed hadlers.
* @return {Array}  The disallowed handlers to add/remove/override.
*/

MultiFactory.getDisallowedHandlersList()
