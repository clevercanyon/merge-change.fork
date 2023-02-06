/**
 * Imports.
 */
const methods = require('./methods.js');
const u = require('./utilities.js');

/**
 * Class constructor.
 *
 * @returns {MergeChange}
 */
function MergeChange() {
  return this; // Class instance.
}

/**
 * Defines merge kinds.
 *
 * @type {Object}
 */
MergeChange.KINDS = {
  MERGE: 'merge',  // Deep clone.
  PATCH: 'patch',  // Change in source value.
  UPDATE: 'update' // Immutable update (new value if there are diffs).
}
MergeChange.prototype.KINDS = MergeChange.KINDS;

/**
 * Defines special method symbols.
 *
 * @type {Object}
 */
MergeChange.methods = methods;
MergeChange.prototype.methods = MergeChange.methods;

/**
 * Defines merge-change utilities.
 *
 * @type {Object}
 */
MergeChange.u = MergeChange.utils = MergeChange.utilities = u;
MergeChange.prototype.u = MergeChange.prototype.utils = MergeChange.prototype.utilities = MergeChange.u;

/**
 * Factory method. Looks for suitable methods for type merging.
 * Closure on merge kind to handle any number of values.
 *
 * @param {String} kind Kind of merge from KINDS.
 *
 * @returns {Function}
 */
MergeChange.prototype.prepareMerge = function (kind) {
  return (...values) => {
    return values.reduce((first, second) => {
        const firstType = u.type(first);
        const secondType = u.type(second);

        const actions = [
          `merge${firstType}${secondType}`,
          `merge${firstType}Any`,
          `mergeAny${secondType}`,
          `mergeAnyAny`,
        ];
        for (const action of actions) {
          if (this[action]) // Action exists?
            return this[action](first, second, kind);
        }
        throw new Error('Unsupported merge types.');
      }
    );
  }
}

/**
 * Performs a deep clone merge.
 *
 * @param {*} first
 * @param {*} second
 * @param {...*} more
 *
 * @returns {*}
 */
MergeChange.prototype.merge = MergeChange.prototype.prepareMerge(MergeChange.KINDS.MERGE);

/**
 * Performs a patch merge.
 *
 * @param {*} first
 * @param {*} second
 * @param {...*} more
 *
 * @returns {*}
 */
MergeChange.prototype.patch = MergeChange.prototype.prepareMerge(MergeChange.KINDS.PATCH);

/**
 * Performs an immutable merge.
 *
 * @param {*} first
 * @param {*} second
 * @param {...*} more
 *
 * @returns {*}
 */
MergeChange.prototype.update = MergeChange.prototype.prepareMerge(MergeChange.KINDS.UPDATE);

/**
 * Merges Array with Array.
 *
 * @param {Array} first
 * @param {Array} second
 * @param {string} kind
 *
 * @returns {Array}
 *
 * @note Arrays are cloned deeply when merging.
 * @note Otherwise, arrays are overridden by assignment.
 */
MergeChange.prototype.mergeArrayArray = function (first, second, kind) {
  if (MergeChange.KINDS.MERGE === kind) {
    return second.map(value => this[kind](undefined, value));
  }
  return second; // Overrides existing array by assignment.
}

/**
 * Merges Object with Object.
 *
 * @param {Object} first
 * @param {Object} second
 * @param {string} kind
 *
 * @returns {Object}
 */
MergeChange.prototype.mergeObjectObject = function (first, second, kind) {
  let isChange = MergeChange.KINDS.MERGE === kind;
  let result = MergeChange.KINDS.PATCH === kind ? first : {};

  const firstKeys = Object.keys(first);
  const secondKeys = new Set(Object.keys(second));
  let keyResult, operations = []; // Initialize.

  for (const key of firstKeys) {
    if (key in second /* Own or inherited in this case. */) {
      keyResult = this[kind](first[key], second[key]);
      secondKeys.delete(key);
    } else {
      keyResult = this[kind](first[key], undefined);
    }
    isChange = isChange || keyResult !== first[key];
    result[key] = keyResult; // Object pointer.
  }
  for (const key of secondKeys) {
    if (this.isOperation(key)) {
      operations.push([key, second[key]]);
    } else {
      keyResult = this[kind](undefined, second[key]);
      isChange = isChange || keyResult !== first[key];
      result[key] = keyResult; // Object pointer.
    }
  }
  for (const [operation, params] of operations) {
    isChange = this.operation(result, operation, params) || isChange;
  }
  return isChange ? result : first;
}

/**
 * Merges Undefined with Date.
 *
 * @param {undefined} first
 * @param {Date} second
 * @param {string} kind
 *
 * @returns {Date}
 */
MergeChange.prototype.mergeUndefinedDate = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? new Date(second) : second;
}

/**
 * Merges Undefined with Set.
 *
 * @param {undefined} first
 * @param {Set} second
 * @param {string} kind
 *
 * @returns {Set}
 */
MergeChange.prototype.mergeUndefinedSet = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? new Set(second) : second;
}

/**
 * Merges Undefined with WeakSet.
 *
 * @param {undefined} first
 * @param {WeakSet} second
 * @param {string} kind
 *
 * @returns {WeakSet}
 */
MergeChange.prototype.mergeUndefinedWeakSet = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? new WeakSet(second) : second;
}

/**
 * Merges Undefined with Map.
 *
 * @param {undefined} first
 * @param {Map} second
 * @param {string} kind
 *
 * @returns {Map}
 */
MergeChange.prototype.mergeUndefinedMap = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? new Map(second) : second;
}

/**
 * Merges Undefined with WeakMap.
 *
 * @param {undefined} first
 * @param {WeakMap} second
 * @param {string} kind
 *
 * @returns {WeakMap}
 */
MergeChange.prototype.mergeUndefinedWeakMap = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? new WeakMap(second) : second;
}

/**
 * Merges Undefined with Array.
 *
 * @param {undefined} first
 * @param {Array} second
 * @param {string} kind
 *
 * @returns {Array}
 */
MergeChange.prototype.mergeUndefinedArray = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? this[kind]([], second) : second;
}

/**
 * Merges Undefined with Object.
 *
 * @param {undefined} first
 * @param {Object} second
 * @param {string} kind
 *
 * @returns {Object}
 */
MergeChange.prototype.mergeUndefinedObject = function (first, second, kind) {
  return MergeChange.KINDS.MERGE === kind ? this[kind]({}, second)
    : this[kind](second, this.extractOperations(second));
}

/**
 * Merges Undefined with Any.
 *
 * @param {undefined} first
 * @param {*} second
 * @param {string} kind
 *
 * @returns {*}
 */
MergeChange.prototype.mergeUndefinedAny = function (first, second, kind) {
  return second; // First undefined, second replaces.
}

/**
 * Merges Any with Undefined.
 *
 * @param {*} first
 * @param {undefined} second
 * @param {string} kind
 *
 * @returns {*}
 */
MergeChange.prototype.mergeAnyUndefined = function (first, second, kind) {
  return this[kind](undefined, first);
}

/**
 * Merges Any with Any.
 *
 * @param {*} first
 * @param {*} second
 * @param {string} kind
 *
 * @returns {*}
 */
MergeChange.prototype.mergeAnyAny = function (first, second, kind) {
  return second; // First unsupported, second replaces.
}

/**
 * Checks if a declarative operation exists.
 *
 * @param {String} operation
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.isOperation = function (operation, params) {
  return Boolean(this[`operation${operation}`]);
}

/**
 * Extracts declarative operations.
 *
 * @param {*} value Mutated by reference.
 *
 * @returns {Object}
 */
MergeChange.prototype.extractOperations = function (value) {
  const result = {}; // Intialize.

  if (!value || typeof value !== 'object') {
    return result; // Not possible.
  }
  for (const key of Object.keys(value)) {
    if (this.isOperation(key, value[key])) {
      result[key] = value[key];
      delete value[key];
    }
  }
  return result;
}

/**
 * Executes a declarative operation.
 *
 * @param {*} source
 * @param {String} operation
 * @param {*} params
 *
 * @returns {*}
 */
MergeChange.prototype.operation = function (source, operation, params) {
  if (this[`operation${operation}`]) {
    return this[`operation${operation}`](source, params);
  }
}

/**
 * Performs declarative operation: `$set`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$set = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'set. Requires an object source.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'set params. Expecting non-array object.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const values = params;
  const paths = Object.keys(values);

  for (const path of paths) {
    u.set(source, path, values[path], separator);
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺset = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$set(source, params, separator);
}

/**
 * Performs declarative operation: `$unset`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$unset = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'unset. Requires an object source.');
  }
  if (!params || !Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'unset params. Expecting array.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const paths = params;

  for (const path of paths) {
    u.unset(source, path, separator);
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺunset = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$unset(source, params, separator);
}

/**
 * Performs declarative operation: `$leave`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$leave = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'leave. Requires an object source.');
  }
  if (!params || !Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'leave params. Expecting array.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const leadingPaths = {};
  const paths = params;

  for (const path of paths) {
    let leadingPath = path;
    let subPath = ''; // Initialize.

    if (typeof path === 'string') {
      [leadingPath, subPath] = path.split(separator);
    }
    if (!(leadingPath in leadingPaths)) {
      leadingPaths[leadingPath] = [];
    }
    if (subPath) {
      leadingPaths[leadingPath].push(subPath);
    }
  }
  const type = u.type(source);

  if (type === 'Object') {
    for (const prop of Object.keys(source)) {
      if (!(prop in leadingPaths)) {
        delete source[prop];
      } else if (leadingPaths[prop].length > 0 && source[prop] && typeof source[prop] === 'object') {
        this.operation$leave(source[prop], leadingPaths[prop], separator);
      }
    }
  } else if (type === 'Array') {
    for (let i = source.length - 1; i >= 0; i--) {
      if (!(i in leadingPaths)) source.splice(i, 1);
    }
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺleave = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$leave(source, params, separator);
}

/**
 * Performs declarative operation: `$push`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$push = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'push. Requires an object source.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'push params. Expecting non-array object.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const values = params;
  const paths = Object.keys(values);

  for (const path of paths) {
    const value = values[path];
    const array = u.get(source, path, [], separator);

    if (!Array.isArray(array)) {
      throw new Error('Cannot push onto non-array value.');
    }
    array.push(value); // Onto stack.
    u.set(source, path, array, separator);
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺpush = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$push(source, params, separator);
}

/**
 * Performs declarative operation: `$pull`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$pull = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'pull. Requires an object source.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'pull params. Expecting non-array object.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const values = params;
  const paths = Object.keys(values);

  for (const path of paths) {
    const array = u.get(source, path, [], separator);
    const pullValues = Array.isArray(values[path]) ? values[path] : [values[path]];

    if (!Array.isArray(array)) {
      throw new Error('Cannot pull from non-array value.');
    }
    for (let i = array.length - 1; i >= 0; i--) {
      for(pullValue of pullValues) {
        if (u.equals(pullValue, array[i])) {
          array.splice(i, 1);
          break;
        }
      }
    }
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺpull = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$pull(source, params, separator);
}

/**
 * Performs declarative operation: `$concat`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$concat = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'concat. Requires an object source.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'concat params. Expecting non-array object.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const values = params;
  const paths = Object.keys(values);

  for (const path of paths) {
    const value = values[path];
    let array = u.get(source, path, [], separator);

    if (!Array.isArray(array)) {
      throw new Error('Cannot concat onto non-array value.');
    }
    array = array.concat(value);
    u.set(source, path, array, separator);
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺconcat = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$concat(source, params, separator);
}

/**
 * Performs declarative operation: `$default`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 */
MergeChange.prototype.operation$default = function (source, params, separator = '.') {
  if(!source || typeof source !== 'object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'default. Requires an object source.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'default params. Expecting non-array object.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const values = params;
  const paths = Object.keys(values);

  for (const path of paths) {
    if (undefined === u.get(source, path, undefined, separator)) {
      u.set(source, path, values[path], separator);
    }
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺdefault = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$default(source, params, separator);
}

/**
 * Performs declarative operation: `$propSortOrder`.
 *
 * @param {*} source
 * @param {*} params
 *
 * @returns {Boolean}
 *
 * @note This also has the side-effect of clearing all `undefined` properties from an object,
 *       as it is not currently possible to apply proper sorting logic otherwise.
 */
MergeChange.prototype.operation$propSortOrder = function (source, params, separator = '.') {
  if(u.type(source) !== 'Object') {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'propSortOrder. Requires a plain object source.');
  }
  if (!params || !Array.isArray(params)) {
    throw new Error('Invalid $' + ( 'ꓺ' === separator ? 'ꓺ' : '' ) + 'propSortOrder params. Expecting array.');
  }
  if (source && typeof source === 'object') {
    if (typeof source[methods.toOperation] === 'function') {
      source = source[methods.toOperation]();
    } else if (typeof source.toJSON === 'function') {
      source = source.toJSON();
    }
  }
  const paths = params;
  const origSource = {...source};

  for (const [key] of Object.entries(source)) {
    delete source[key]; // Start clean again.
  }
  for (const path of paths) {
    const value = u.get(origSource, path, undefined, separator);
    if (undefined !== value) u.set(source, path, value, separator);
  }
  for (const [path, value] of Object.entries(u.toFlat(origSource, '', separator))) {
    if (undefined !== value && undefined === u.get(source, path, undefined, separator)) {
      u.set(source, path, value, separator);
    }
  }
  return paths.length > 0;
}
MergeChange.prototype.operation$ꓺpropSortOrder = function(source, params, separator = 'ꓺ') {
  return MergeChange.prototype.operation$propSortOrder(source, params, separator);
}

/**
 * Adds a custom merge type handler.
 *
 * @param {String}   type1    Type of source value.
 * @param {String}   type2    Type of secondary value.
 * @param {Function} callback Merge function: `(first: unknown, second: unknown, kind: string): unknown`.
 *                            Callback should return the resulting merged value.
 *
 * @returns {*} Previous merge callback.
 */
MergeChange.prototype.addMerge = function (type1, type2, callback) {
  if(!type1 || typeof type1 !== 'string') {
    throw new Error('Invalid merge type as position 1.');
  }
  if(!type2 || typeof type2 !== 'string') {
    throw new Error('Invalid merge type as position 2.');
  }
  if(!callback || typeof callback !== 'function') {
    throw new Error('Invalid merge callback.');
  }
  const previousCallback = MergeChange.prototype[`merge${type1}${type2}`];
  MergeChange.prototype[`merge${type1}${type2}`] = callback; // New callback.

  return previousCallback;
}

/**
 * Adds a custom declarative merge operation.
 *
 * @param {String}   name     Operation name. Must start with `$`.
 * @param {Function} callback Operation: `(source: unknown, params: unknown, separator?: string): boolean`.
 *                            Callback should return true if the operation results in changes.
 *
 * @returns {*} Previous operation callback.
 */
MergeChange.prototype.addOperation = function (name, callback) {
  if(!name || typeof name !== 'string') {
    throw new Error('Invalid operation name.');
  }
  if(!callback || typeof callback !== 'function') {
    throw new Error('Invalid operation callback.');
  }
  if (!name.startsWith('$')) {
    name = '$' + name; // Must begin with `$`.
  }
  const previousCallback = MergeChange.prototype[`operation${name}`];
  MergeChange.prototype[`operation${name}`] = callback; // New callback.

  return previousCallback;
}

/**
 * Exports module.
 */
module.exports = new MergeChange();
