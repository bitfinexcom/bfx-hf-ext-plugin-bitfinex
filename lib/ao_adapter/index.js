'use strict'

const Promise = require('bluebird')
const _pick = require('lodash/pick')
const _isEqual = require('lodash/isEqual')
const _isObject = require('lodash/isObject')
const _isString = require('lodash/isString')
const _isEmpty = require('lodash/isEmpty')
const { EventEmitter } = require('events')
const debug = require('debug')('bfx:hf:ext-plugin:bitfinex:ao-adpater')
const ManagedOB = require('bfx-api-node-plugin-managed-ob')
const ManagedCandles = require('bfx-api-node-plugin-managed-candles')
const Watchdog = require('bfx-api-node-plugin-wd')
const { Order } = require('bfx-api-node-models')
const {
  subscribe, unsubscribe, findChannelId, Manager, cancelOrder, submitOrder,
  send
} = require('bfx-api-node-core')

/**
 * WebSocket connection heartbeat interval in ms
 *
 * @memberof AOAdapter
 * @constant
 * @readonly
 */
const HB_INTERVAL_MS = 2500

/**
 * Algorithmic order adapter, for usage with {@link external:bfx-hf-algo}
 *
 * @class
 * @augments events.EventEmitter
 */
class AOAdapter extends EventEmitter {
  /**
   * Returns a map of supported candle time frames, of the form
   * `[human readable tf]: tf`
   *
   * @returns {object} tfs
   */
  static getTimeFrames () {
    return {
      '1 Minute': '1m',
      '5 Minutes': '5m',
      '15 Minutes': '15m',
      '30 Minutes': '30m',
      '1 Hour': '1h',
      '3 Hours': '3h',
      '6 Hours': '6h',
      '12 Hours': '12h',
      '1 Day': '1D',
      '7 Days': '7D',
      '14 Days': '14D',
      '1 Month': '1M'
    }
  }

  /**
   * @param {object} params - params
   * @param {string} [params.wsURL] - ws API URL
   * @param {string} [params.restURL] - rest API URL
   * @param {string} params.apiKey - API key
   * @param {string} params.apiSecret - API secret
   * @param {object} [params.agent] - node connection agent
   * @param {number} [params.dms] - dead man switch, active 4
   * @param {boolean} [params.withHeartbeat] - enables WS heartbeat
   * @param {string} [params.affiliateCode] - affiliate code to be attached to
   *   all orders
   */
  constructor (params = {}) {
    const {
      wsURL, restURL, apiKey, apiSecret, agent, dms, withHeartbeat,
      affiliateCode
    } = params

    super()

    this.pendingOrderSubmitCancelTimeouts = []
    this.affiliateCode = affiliateCode
    this.hbEnabled = withHeartbeat
    this.hbInterval = null
    this.m = new Manager({
      plugins: [ManagedOB(), ManagedCandles(), Watchdog({
        packetWDDelay: 30 * 1000
      })],

      transform: true,
      dms,
      apiSecret,
      apiKey,
      agent,
      wsURL,
      restURL
    })

    this.m.on('ws2:error', this.propagateEvent.bind(this, 'meta:error'))
    this.m.on('ws2:ticker', this.propagateDataEvent.bind(this, 'ticker'))
    this.m.on('ws2:trades', this.propagateDataEvent.bind(this, 'trades'))
    this.m.on('ws2:candles', this.propagateDataEvent.bind(this, 'candles'))
    this.m.on('ws2:book', this.propagateDataEvent.bind(this, 'book'))
    this.m.on('ws2:managed:book', this.propagateDataEvent.bind(this, 'managed:book'))
    this.m.on('ws2:managed:candles', this.propagateDataEvent.bind(this, 'managed:candles'))
    this.m.on('ws2:notification', this.propagateDataEvent.bind(this, 'notification'))

    this.m.on('socket:updated', this.onSocketUpdate.bind(this))
    this.m.on('ws2:event:info-server-restart', this.onServerRestart.bind(this))
    this.m.on('ws2:reopen', this.onWSReopen.bind(this))

    this.m.on('ws2:open', this.propagateEvent.bind(this, 'open'))
    this.m.on('ws2:event:auth:success', this.propagateEvent.bind(this, 'auth:success'))
    this.m.on('ws2:event:auth:error', this.propagateEvent.bind(this, 'auth:error'))
    this.m.on('ws2:auth:n', this.propagateEvent.bind(this, 'auth:n'))
    this.m.on('ws2:auth:os', this.propagateEvent.bind(this, 'order:snapshot'))
    this.m.on('ws2:auth:on', this.propagateEvent.bind(this, 'order:new'))
    this.m.on('ws2:auth:ou', this.propagateEvent.bind(this, 'order:update'))
    this.m.on('ws2:auth:oc', this.propagateEvent.bind(this, 'order:close'))
    this.m.on('ws2:data:trades', this.propagateEvent.bind(this, 'trades'))
    this.m.on('ws2:data:book', this.propagateEvent.bind(this, 'book'))
  }

  /**
   * Set connection auth arguments
   *
   * @param {object} args - arguments
   * @param {number} args.dms - dead man switch, active 4
   */
  updateAuthArgs (args = {}) {
    this.m.updateAuthArgs(args)
  }

  /**
   * Reconnects all open sockets
   */
  reconnect () {
    if (this.hbInterval !== null) {
      clearInterval(this.hbInterval)
      this.hbInterval = null
    }

    this.m.reconnectAllSockets()

    if (this.hbEnabled) {
      this.hbInterval = setInterval(this.sendHB.bind(this), HB_INTERVAL_MS)
    }
  }

  /**
   * Opens a new socket connection
   */
  connect () {
    this.m.openWS()

    if (this.hbEnabled) {
      this.hbInterval = setInterval(this.sendHB.bind(this), HB_INTERVAL_MS)
    }
  }

  /**
   * Disconnects all open sockets
   *
   * @returns {Promise} p
   */
  disconnect () {
    if (this.hbInterval !== null) {
      clearInterval(this.hbInterval)
      this.hbInterval = null
    }

    // Clean up pending actions
    this.pendingOrderSubmitCancelTimeouts.forEach(timeoutObject => {
      if (timeoutObject.t !== null) {
        clearTimeout(timeoutObject.t)
        timeoutObject.t = null
      }
    })

    this.pendingOrderSubmitCancelTimeouts = []

    return this.m.closeAllSockets()
  }

  /**
   * @private
   */
  sendHB () {
    this.m.withAuthSocket((ws) => {
      send(ws, [0, 'n', null, {
        mid: Date.now(),
        type: 'ucm-hb',
        info: {}
      }])
    })
  }

  /**
   * Get an open connection object
   *
   * @returns {object} connection
   */
  getConnection () {
    const id = this.m.sampleWSI()
    const c = this.m.getWSByIndex(id)

    return { id, c }
  }

  /**
   * Emit an event
   *
   * @param {string} name - event name
   * @param {...(object|Array|string|number)} args - arguments
   */
  propagateEvent (name, ...args) {
    this.emit(name, ...args)
  }

  /**
   * Emit a data event
   *
   * @param {string} name - event name
   * @param {object|Array|string|number} data - event data
   * @param {object} meta - event metadata
   */
  propagateDataEvent (name, data, meta = {}) {
    this.emit(`data:${name}`, data, meta)
  }

  /**
   * @private
   *
   * @param {number} i - socket index
   * @param {object} state - socket state
   */
  onSocketUpdate (i, state) {
    this.emit('meta:connection:update', i, state)
  }

  /**
   * @private
   */
  onServerRestart () {
    // Otherwise the DMS flag closes all orders, and the packets are received
    // after a server restart, before the connection drops. We cannot
    // differentiate between manual user cancellations and those packets.
    this._ignoreOrderEvents = true
  }

  /**
   * @private
   */
  onWSReopen () {
    this._ignoreOrderEvents = false // see onServerRestart
    this.emit('meta:reload')
  }

  /**
   * Subscribe to a channel
   *
   * @param {object} connection - connection object
   * @param {string} channel - channel type, i.e. 'trades'
   * @param {object} filter - channel filter, i.e. `{ symbol: 'tBTCUSD' }`
   */
  subscribe (connection, channel, filter) {
    subscribe(connection.c, channel, filter)
  }

  /**
   * Unsubscribe from a channel
   *
   * @param {object} connection - connection object
   * @param {string} channel - channel type, i.e. 'trades'
   * @param {object} filter - channel filter, i.e. `{ symbol: 'tBTCUSD' }`
   */
  unsubscribe (connection, channel, filter) {
    const cid = findChannelId(connection.c, (data) => {
      if (data.channel !== channel) {
        return false
      }

      const fv = _pick(data, Object.keys(filter))
      return _isEqual(filter, fv)
    })

    if (!cid) {
      debug('error unsubscribing: unknown channel %s', channel)
    } else {
      unsubscribe(connection.c, cid)
    }
  }

  /**
   * @private
   *
   * @returns {boolean} orderEventsValid
   */
  orderEventsValid () {
    return !this._ignoreOrderEvents
  }

  /**
   * Submit an order with a delay
   *
   * @param {object} connection - connection object
   * @param {number} delay - delay in ms
   * @param {bfx-api-node-models.Order} order - order
   * @returns {Promise} p
   */
  async submitOrderWithDelay (connection, delay, order) {
    const { c } = connection

    if (_isString(this.affiliateCode) && !_isEmpty(this.affiliateCode)) {
      if (order instanceof Order) {
        order.affiliateCode = this.affiliateCode
      } else if (_isObject(order)) {
        if (!order.meta) {
          order.meta = {}
        }

        order.meta.aff_code = this.affiliateCode // eslint-disable-line
      }
    }

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        timeoutObject.t = null

        submitOrder(c, order)
          .then(resolve)
          .catch(reject)
      }, delay)

      const timeoutObject = { t }
      this.pendingOrderSubmitCancelTimeouts.push(timeoutObject)
    })
  }

  /**
   * Cancel an order with a delay
   *
   * @param {object} connection - connection object
   * @param {number} delay - delay in ms
   * @param {bfx-api-node-models.Order} order - order
   * @returns {Promise} p
   */
  async cancelOrderWithDelay (connection, delay, order) {
    const { c } = connection

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        timeoutObject.t = null

        cancelOrder(c, order)
          .then(resolve)
          .catch(reject)
      }, delay)

      const timeoutObject = { t }
      this.pendingOrderSubmitCancelTimeouts.push(timeoutObject)
    })
  }

  /**
   * Send a packet via an authenticated socket
   *
   * @param {Array} packet - packet
   */
  sendWithAnyConnection (packet) {
    this.m.withAuthSocket((ws) => {
      send(ws, packet)
    })
  }

  /**
   * Trigger an UI notification
   *
   * @param {ws.WebSocket} ws - ws client
   * @param {string} level - notification level
   * @param {string} message - notification message
   */
  notify (ws, level, message) {
    send(ws, [0, 'n', null, {
      type: 'ucm-notify-ui',
      info: {
        level,
        message
      }
    }])
  }
}

module.exports = AOAdapter
