# Util classes

## CopyToClipboard

[`CopyToClipboard`](copy-to-clipboard.js) makes it easy to copy text to clipboard.

```js
// @require https://gitlab.services.kirra.nl/iwink/userscripts/raw/master/util/copy-to-clipboard.js
```

### Example:
```js
(new CopyToClipboard()).copy('Hello world!');
```

## LocalJsonStorage

[`LocalJsonStorage`](local-json-storage.js) makes use of LocalStorage even simpler.
Handles serialisation of JSON to storage and back.

```js
// @require https://gitlab.services.kirra.nl/iwink/userscripts/raw/master/util/local-json-storage.js
```

### Example:
```js
// Initialize storage and fill with default config
let storage = new LocalJsonStorage('MySetting');

let config = storage.get();
if (config === undefined) {
	config = {
		'key': 'value'
	};
	storage.set(config);
}
```

Pass a string to the `LocalJsonStorage` constructor unique for your script.
You can of course store any default config structure you want.

## MutationFindElementCallback

Sometimes your userscript depends on an element that is loaded with javascript itself.
[`MutationFindElementCallback`](mutation-find-element-callback.js) helps you wait for these elements to appear.

```js
// @require https://gitlab.services.kirra.nl/iwink/userscripts/raw/master/util/mutation-find-element-callback.js
```

### Example:

```js

new MutationFindElementCallback(
	document,
	'td',
	(element) => {
		element.innerHTML = element.innerHTML.replace(/uur/, 'DUUR');
	},
	'data-it-block-duur'
);
```
