'use strict'

const Promise = require('bluebird')
const PI = require('p-iteration')
const _last = require('lodash/last')
const debug = require('debug')('bfx:hf:ext-plugin:bitfinex:trade:sync-range')
const { RESTv2 } = require('bfx-api-node-rest')
const PromiseThrottle = require('promise-throttle')

const TRADE_GAP_LIMIT = 60 * 60 * 1000 // 1 hour
const FETCH_LIMIT = 5000
const rest = new RESTv2({ transform: true })
const pt = new PromiseThrottle({
  requestsPerSecond: 10.0 / 60.0, // taken from docs
  promiseImplementation: Promise
})

/**
 * Syncs a range of trades for the specified market.
 *
 * @private
 *
 * @param {object} tradeModel - `bfx-hf-models` `Trade` model
 * @param {object} doc - data selector
 * @param {string} doc.exchange - exchange ID
 * @param {string} doc.symbol - symbol
 * @param {object} args - arguments
 * @param {number} args.start - start timestamp
 * @param {number} args.end - end timestamp
 * @returns {Promise} p
 */
const syncTradesRange = async (tradeModel, doc, args) => {
  const { start, end } = args
  const { exchange, symbol } = doc
  const { getInRange, bulkInsert } = tradeModel
  const trades = await getInRange([
    ['exchange', '=', exchange],
    ['symbol', '=', symbol]
  ], {
    key: 'mts',
    start,
    end
  })

  const boundsToSync = []

  if (trades.length === 0) {
    boundsToSync.push({ start, end })
  } else if (trades.length === 1) {
    if (trades[0].mts < end && end - trades[0].mts > TRADE_GAP_LIMIT) {
      boundsToSync.push({ start, end: trades[0].mts - 1 })
      boundsToSync.push({ start: trades[0].mts + 1, end })
    }
  } else {
    for (let i = 0; i < trades.length - 2; i += 1) {
      if (trades[i + 1].mts - trades[i].mts > TRADE_GAP_LIMIT) {
        boundsToSync.push({
          start: trades[i].mts + 1,
          end: trades[i + 1].mts - 1
        })
      }
    }

    // Handle end caps
    if (end - _last(trades).mts > TRADE_GAP_LIMIT) {
      boundsToSync.push({ start: _last(trades).mts + 1, end })
    }

    if (trades[0].mts - start > TRADE_GAP_LIMIT) {
      boundsToSync.push({ start, end: trades[0].mts - 1 })
    }
  }

  if (boundsToSync.length === 0) {
    return Promise.resolve()
  }

  debug('-- syncing ranges')
  debug(
    boundsToSync
      .map(({ start, end }) => `${start}-${end}`)
      .join('\n')
  )
  debug('--')

  return PI.forEachSeries(boundsToSync, async ({ start, end }) => {
    let lastTradeMTS = start - 1 // to counter offset in loop

    while (lastTradeMTS < end) {
      debug(
        'fetching max %d trades from %s...',
        FETCH_LIMIT, new Date(lastTradeMTS).toLocaleString()
      )

      const incomingTrades = await pt.add(rest.trades.bind(
        rest, symbol, lastTradeMTS + 1, end, FETCH_LIMIT, 1
      ))

      if (incomingTrades.length === 0) {
        debug(
          'fetched empty trade set (%s -> %s), considering finished',
          new Date(lastTradeMTS + 1).toLocaleString(),
          new Date(end).toLocaleString()
        )
        break
      }

      debug(
        'fetched %d trades (%s -> %s)',
        incomingTrades.length, new Date(lastTradeMTS + 1).toLocaleString(),
        new Date(end).toLocaleString()
      )

      await bulkInsert(incomingTrades.map(t => ({
        ...t.toJS(),

        exchange,
        symbol
      })))

      lastTradeMTS = _last(incomingTrades).mts
    }
  })
}

module.exports = syncTradesRange
