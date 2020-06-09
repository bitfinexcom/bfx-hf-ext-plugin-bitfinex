'use strict'

const AOAdapter = require('./lib/ao_adapter')
const syncTradesRange = require('./lib/models/trade/sync_range')
const syncCandlesRange = require('./lib/models/candle/sync_range')
const auditCandleGaps = require('./lib/models/candle/audit_gaps')

/**
 * This is the standard Bitfinex exchange adapter for the Honey Framework, for
 * usage with {@link external:bfx-hf-algo} and any consumer of
 * {@link external:bfx-hf-models}. It implements `Trade` and `Candle` sync
 * methods, along with an algo order adapter necessary for executing algo
 * orders with {@link external:bfx-hf-algo}.
 *
 * @license Apache-2.0
 * @module bfx-hf-ext-plugin-bitfinex
 */

/**
 * @external bfx-hf-algo
 * @see https://github.com/bitfinexcom/bfx-hf-algo
 */

/**
 * @external bfx-hf-models
 * @see https://github.com/bitfinexcom/bfx-hf-models
 */

module.exports = {
  AOAdapter,

  schema: {
    Trade: {
      schemaExchangeData: {
        id: Number
      },

      methods: {
        syncRange: syncTradesRange
      }
    },

    Candle: {
      schemaExchangeData: {
        type: String
      },

      methods: {
        syncRange: syncCandlesRange,
        auditGaps: auditCandleGaps
      }
    }
  }
}
