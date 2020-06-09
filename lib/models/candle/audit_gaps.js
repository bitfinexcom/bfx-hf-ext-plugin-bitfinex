'use strict'

const { TIME_FRAME_WIDTHS } = require('bfx-hf-util')
const _isFinite = require('lodash/isFinite')

/**
 * @private
 *
 * @param {object} candleModel - `bfx-hf-models` `Candle` model
 * @param {object} doc - candle selector
 * @param {string} doc.exchange - exchange ID
 * @param {string} doc.symbol - symbol
 * @param {string} doc.tf - timeframe
 * @param {object} args - arguments
 * @param {number} args.start - start timestamp
 * @param {number} args.end - end timestamp
 * @returns {Promise} p
 */
const auditCandleGaps = async (candleModel, doc, args) => {
  const { start, end } = args
  const { getInRange } = candleModel
  const gaps = []
  const { exchange, symbol, tf } = doc

  const candles = await getInRange([
    ['exchange', '=', exchange],
    ['symbol', '=', symbol],
    ['tf', '=', tf]
  ], {
    key: 'mts',
    start,
    end
  }, {
    orderBy: 'mts',
    orderDirection: 'desc'
  })

  if (candles.length < 2) {
    return { gaps, candles }
  }

  const width = TIME_FRAME_WIDTHS[tf]

  if (!_isFinite(width)) {
    throw new Error(`invalid time frame [unknown width]: ${tf}`)
  }

  for (let i = 0; i < candles.length - 1; i += 1) {
    if ((candles[i].mts - candles[i + 1].mts) !== width) {
      gaps.push(i)
    }
  }

  return { gaps, candles }
}

module.exports = auditCandleGaps
