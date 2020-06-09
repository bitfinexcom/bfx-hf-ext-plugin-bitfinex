## Bitfinex Honey Framework Exchange Plugin for Node.JS

[![Build Status](https://travis-ci.org/bitfinexcom/bfx-hf-ext-plugin-bitfinex.svg?branch=master)](https://travis-ci.org/bitfinexcom/bfx-hf-ext-plugin-bitfinex)

This is the standard Bitfinex exchange adapter for the Honey Framework, for
usage with `bfx-hf-algo` and any consumer of `bfx-hf-models`. It implements
`Trade` and `Candle` sync methods, along with an algo order adapter necessary
for executing algo orders with `bfx-hf-algo`.

### Features

* `Trade` model sync logic
* `Candle` model sync logic
* Algo Order adapter for usage with `bfx-hf-algo`

### Installation

```bash
npm i --save bfx-hf-ext-plugin-bitfinex
```

### Docs

API documentation can be found in [`docs/reference.md`](docs/reference.md), and
examples in the [`examples`](examples) folder.

### Examples

Using the DB schema

```js
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const { schema: HFDBBitfinexSchema } = require('bfx-hf-ext-plugin-bitfinex')
const HFDB = require('bfx-hf-models')

const db = new HFDB({
  schema: HFDBBitfinexSchema,
  adapter: HFDBLowDBAdapter({
    dbPath: './SOME_DB_PATH.json',
    schema: HFDBBitfinexSchema
  })
})

// db can now be used throughout the HF for data storage
```

Using the algo order adapter
```js
const { AOAdapter } = require('bfx-hf-ext-plugin-bitfinex')
const AOServer = require('bfx-hf-algo-server')
const db = {} // init as specified above

const adapter = new AOAdapter({
  apiKey: '...',
  apiSecret: '...',
  withHeartbeat: true, // optionally broadcasts a heartbeat to notify the BFX UI
                       // that a bfx ao host is available for orders
})

const server = new AOServer({
  db,
  adapter,
  port: 8877,
  aos: [ /* ... */ ], // see bfx-hf-algo
})

// orders submitted to the AO server will now be routed to bitfinex
```

### Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
