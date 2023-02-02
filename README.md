# @clevercanyon/merge-change.fork

A fork of the original [merge-change](https://www.npmjs.com/package/merge-change) on NPM.
This fork has been patched to resolve a [prototype pollution security issue](https://github.com/advisories/GHSA-f9cv-665r-275h).

`merge-change` is a simple library for **deep merge** of objects and other types, also for **patches** and **immutable updates**.
By default, merge works for "plain objects".
Values of other types are replaced, but you can **customize merging** between specific types.
Also, you can use **declarative operations** to specific merge like `unset`, `leave`, `push` and other.
For example to remove some properties of object, to replace "plain objects", to concat arrays.
Calculating diffs between two values.

## API

### Merge

Merge with **deep cloning** without changing the source objects. Great for creating or extending objects from the example (source).

```js
mc.merge(source, ...values);
```
Example
```js
const mc = require('@clevercanyon/merge-change.fork');

// Create new object with adding "a.three" and deleting "a.one"
let first = {
  a: {
    one: true,
    two: 2,
  },
};
let second = {
  a: {
    three: 3,
    $unset: ['one'], // $unset is a declarative operations
  },
};

const result = mc.merge(first, second);

console.log(result);
```
```log
{ a: { two: 2,  three: 3} }
```

### Patch

Merge with **mutation** of the source objects. Nice for patching. New instances will not be created.

```js
mc.patch(source, ...patches);
```

```js
let first = {
  a: {
    one: true,
    two: 2,
  },
};
let second = {
  a: {
    three: 3,
    $unset: ['one'], // $unset is a declarative operations
  },
};

const result = mc.patch(first, second); // => { a: { two: 2,  three: 3} }

// result is a mutated first argument
console.log(result === first); // => true
console.log(result !== second); // => true
```

### Update

**Immutable merge** - create new instances only if there are diffs (also in inner properties). Nice for state management.

```js
mc.update(source, ...changes);
```

```js
let first = {
  a: {
    one: true,
    two: 2,
    sub: {
      value: 3,
    },
  },
};
let second = {
  a: {
    three: 3,
    $unset: ['one'], // $unset is a declarative operation.
  },
};

const result = mc.update(first, second); // => { a: { two: 2,  three: 3, sub: { value: 3 }} }

// result is a new object
console.log(result !== first); // => true
console.log(result !== second); // => true

// object "a.sub" is unchanged
console.log(result.a.sub === first.a.sub); // => true
```

## Declarative Operations

When merging objects, you can perform declarative operations at the same time.
Supported in all merge methods. The syntax is similar to mongodb.

### `$set`, `$ꓺset`

To set (or replace) property without deep merge.

```js
const result = mc.merge(
  {
    a: {
      one: 1,
      two: 2,
    },
  },
  {
    $set: {
      a: {
        three: 3,
      },
      'a.two': 20, // Fields keys can be path.
    },
  },
);
console.log(result);
```

Result
```json
{
  "a": {
    "three": 3,
    "two": 20,
  },
}
```

### `$unset`, `$ꓺunset`

To unset properties by name (or path)

 ```js
 const result = mc.merge(
   {
     a: {
       one: 1,
       two: 2,
     },
   },
   {
     $unset: ['a.two'],
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
   "a": {
     "one": 1,
   },
 }
 ```

#### To unset all fields used `*`

 ```js
 const result = mc.merge(
   {
     a: {
       one: 1,
       two: 2,
     },
   },
   {
     $unset: ['a.*'],
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
   "a": {},
 }
 ```

### `$leave`, `$ꓺleave`

To leave properties by name (or path). All other properties will be removed.

 ```js
 const result = mc.merge(
   {
     a: {
       one: 1,
       two: 2,
       tree: 3,
     },
   },
   {
     a: {
       $leave: ['two'],
     },
   },
 );
 console.log(result);
 ```

Result
```json
 {
   "a": {
     "two": 2,
   },
 }
 ```

### `$push`, `$ꓺpush`

To push one value to the array property. The source property must be an array.

 ```js
 const result = mc.merge(
   // First object
   {
     prop1: ['a', 'b'],
     prop2: ['a', 'b'],
   },
   // Merge
   {
     $push: {
       prop1: ['c', 'd'],
       prop2: {x: 'c'},
     },
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
   "prop1": ["a", "b", ["c", "d"]],
   "prop2": ["a", "b", {"x": "c"}],
 }
 ```

### `$pull`, `$ꓺpull`

To pull a value from an array property. The source property must be an array.

 ```js
 const result = mc.merge(
   // First object
   {
     prop1: ['a', 'b', 'c', 'x'],
     prop2: [1, 2, 3, 100],
   },
   // Merge
   {
     $pull: {
       prop1: ['x'],
       prop2: [100],
     },
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
   "prop1": ["a", "b", "c"],
   "prop2": [1, 2, 3],
 }
 ```

### `$concat`, `$ꓺconcat`

To concatenate arrays. The source property must be an array. The property in secondary arguments may not be an array.

 ```js
 const result = mc.merge(
   // First object
   {
     prop1: ['a', 'b'],
     prop2: ['a', 'b'],
   },
   // Merge
   {
     $concat: {
       prop1: ['c', 'd'],
       prop2: {x: 'c'},
     },
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
   "prop1": ["a", "b", "c", "d"],
   "prop2": ["a", "b", {"x": "c"}],
 }
 ```

### `$default`, `$ꓺdefault`

To set default values. The source property must be an object.

 ```js
 const result = mc.merge(
   // First object
   {
     prop1: ['a', 'b', 'c'],
     prop2: ['a', 'b', 'c'],
     prop3: {
      a: 'a',
      b: 'b',
      c: {
        d: 'd',
      },
     },
   },
   // Merge
   {
     $default: {
      prop1: ['default'],
      prop2: ['default'],
      prop3: {
        a: 'default',
        b: 'default',
        c: {
          d: 'default',
          e: 'default',
        },
        f: 'default',
        g: ['default'],
      },
     },
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
    "prop1": ["a", "b", "c"],
    "prop2": ["a", "b", "c"],
    "prop3": {
      "a": "a",
      "b": "b",
      "c": {
        "d": "d",
        "e": "default",
      },
    "f": "default",
    "g": ["default"],
 }
 ```

### `$propSortOrder`, `$ꓺpropSortOrder`

Sorts object properties using order given. The source property must be an object.

 ```js
 const result = mc.merge(
   // First object
   {
     prop3: {
      c: {
        d: 'd',
      },
      b: 'b',
      e: undefined,
     },
     prop00: '00',
     prop1: ['a', 'b', 'c'],
     a: 'a',
     prop2: ['a', 'b', 'c'],
   },
   // Merge
   {
     prop4: '4',
     $propSortOrder: [
      'a',
      'prop0',
      'prop1',
      'prop2',
      'prop3.b',
      'prop3.c.d',
      'prop3.e', // Undefined. Will not appear in sorted object.
      'prop4',
     ],
     prop0: '0',
     prop00: '00', // Not in sort order given, so comes after all others.
   },
 );
 console.log(result);
 ```

Result
 ```json
 {
    "a": "a",
    "prop0": "0",
    "prop1": ["a", "b", "c"],
    "prop2": ["a", "b", "c"],
    "prop3": {
      "b": "b",
      "c": {
        "d": "d",
      },
    },
    "prop4": "4",
    "prop00": "00",
 }
 ```

## Customize Merge

You can declare function for merge custom types (or override default logic). Returns previous merge method.

`mc.addMerge(type1, type2, callback)`

- `type1, type2` - constructor name of the first and second values: `Number, String, Boolean, Object, Array, Date, RegExp, Function, Undefined, Null, Symbol, Set, Map` and other system and custom constructor names
- `callback` - merge function with argument: (first, second, kind)
    - `first` - first value for merge
    - `second` - second value for merge
    - `kind` - name of merging method, such as "merge", "patch", "update".

For example, if you always need to union arrays, you can declare method to merge array with array.

```js
const previous = mc.addMerge('Array', 'Array', function(first, second, kind){
  // merge - creaete new array with deep clone
  if (kind === 'merge'){
    return first.concat(second).map(item => mc.merge(undefined, item));
  }
  // patch - mutate first array
  if (kind === 'patch'){
    first.splice(first.length, 0, ...second);
    return first;
  }
  // update - return first array if second is empty, or create new without clone
  if (second.length === 0){
    return first;
  } else {
    return first.concat(second);
  }
});

// reset custom method
mc.addMerge('Array', 'Array', previous);
```

## Customize Declarative Operation

You can declare function for declarative operation (or override default logic). Returns previous operation method.

`mc.addOperation(name, callback)`

- `name` - operation name, for example "$concat"
- `callback` - operation function with argument: (source, params). Return new value or source.
    - `source` - the value in which the operation is defined (`source: {$concat: params}`)
    - `params` - value of operator (`$concat: params`)

For example, if sometimes need to union arrays, you can declare declarative operation $concat (it exists in the library).

```js
const previous = mc.addOperation('$concat', function(source, params){
  const paths = Object.keys(params);

  for (const path of paths) {
    let value = params[path];
    let array = utils.get(source, path, []);

    if (Array.isArray(array)) {
      array = array.concat(value);
      utils.set(source, path, array);
    } else {
      throw new Error('Cannot concat on not array');
    }
  }
  return paths.length > 0;
});

// reset custom operation
mc.addOperation('$concat', previous);
```

## Utils

Useful functions - utilities

```js
const utils = require('@clevercanyon/merge-change.fork').utils;
```

### `utils.diff(source, compare, {ignore = [], separator = '.'})`

To calculate the difference between `source` and `compare` value.
The return value is an object with `$set` and `$unset` operators. Return value can be used in merge functions.
The `ignore` parameter - is a list of properties that are not included in the comparison.

```js
const first = {
  name: 'value',
  profile: {
    surname: 'Surname',
    birthday: new Date(),
    avatar: {
      url: 'pic.png'
    }
  },
  access: [100, 350, 200],
  secret: 'x'
}

const second = {
  login: 'value',
  profile: {
    surname: 'Surname2',
    avatar: {
      url: 'new/pic.png'
    }
  },
  access: [700]
}

const diff = utils.diff(first, second, {ignore: ['secret'], separator: '/'});
```
Result (diff)
```
{
  $set: {
    'login': 'value',
    'profile.surname': 'Surname2',
    'profile.avatar.url': 'new/pic.png',
    'access': [ 700 ]
  },
  $unset: [
    'profile.birthday',
    'name'
  ]
}
```

### `utils.type(value)`

Get real type of any value. The return value is a string - the name of the constructor.

```js
utils.type(null); // => 'Null'
utils.type(true); // => 'Boolean'
utils.type(new ObjectId()); // => 'ObjectID'
```

### `utils.instanceof(value, className)`

Checking instance of class. `className` is string (not constructor). The return value is a boolean.

```js
utils.instanceof(100, 'Number'); // => true
utils.instanceof(new MyClass(), 'MyClass'); // => true
utils.instanceof(new MyClass(), 'Object'); // => true
```

### `utils.plain(value)`

Converting deep value to plain types if value has plain representation. For example, all dates are converted to a string, but RegEx not.
To customize conversion, you can define the `[methods.toPlain]()` method in your object.
Nice for unit tests.

> The method is similar to converting to JSON, only objects (arrays, functions...) are not converted to string representation.

```js
const plain = utils.plain({
  date: new Date('2021-01-07T19:10:21.759Z'),
  prop: {
    _id: new ObjectId('6010a8c75b9b393070e42e68')
  }
});
```
Result (plain)
```
{
  date: '2021-01-07T19:10:21.759Z',
  prop: {
    _id: '6010a8c75b9b393070e42e68'
  }
}
```

### `utils.flat(value, path = '', separator = '.', clearUndefined = false)`

Converting a nested structure to a flat object.
Property names become path with `separator`.
To customize conversion, you can define the `[methods.toFlat]()` method in your object.

```js
const value = {
  a: {
    b: {
      c: 100
    }
  }
};
const flat = utils.flat(value, 'parent', '.');
```
Result (flat)
```
{
  'parent.a.b.c': 100
}
```

## License

- Released under an [MIT License](LICENSE).
- Original copyright 2020 © [VladimirShestakov](https://github.com/VladimirShestakov).
- Fork of this repo is copyright 2021 © [Clever Canyon](https://github.com/clevercanyon/merge-change.fork).
