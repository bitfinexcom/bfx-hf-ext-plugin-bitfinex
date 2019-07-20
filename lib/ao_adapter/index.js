'use strict'

const Promise = require('bluebird')
const _pick = require('lodash/pick')
const _isEqual = require('lodash/isEqual')
const { EventEmitter } = require('events')
const debug = require('debug')('bfx:hf:ext-plugin-bitfinex:ao-adpater')
const ManagedOB = require('bfx-api-node-plugin-managed-ob')
const ManagedCandles = require('bfx-api-node-plugin-managed-candles')
const Watchdog = require('bfx-api-node-plugin-wd')
const {
  subscribe, unsubscribe, findChannelId, Manager, cancelOrder, submitOrder,
  send,
} = require('bfx-api-node-core')

const HB_INTERVAL_MS = 2500

module.exports = class AOAdapter extends EventEmitter {
  constructor ({
    wsURL, restURL, apiKey, apiSecret, agent, dms, withHeartbeat,
  }) {
    super()

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
    this.m.on('ws2:auth:success', this.propagateEvent.bind(this, 'auth:success'))
    this.m.on('ws2:auth:error', this.propagateEvent.bind(this, 'auth:error'))
    this.m.on('ws2:auth:n', this.propagateEvent.bind(this, 'auth:n'))
    this.m.on('ws2:auth:os', this.propagateEvent.bind(this, 'order:snapshot'))
    this.m.on('ws2:auth:on', this.propagateEvent.bind(this, 'order:new'))
    this.m.on('ws2:auth:ou', this.propagateEvent.bind(this, 'order:update'))
    this.m.on('ws2:auth:oc', this.propagateEvent.bind(this, 'order:close'))
    this.m.on('ws2:data:trades', this.propagateEvent.bind(this, 'trades'))
    this.m.on('ws2:data:book', this.propagateEvent.bind(this, 'book'))
  }

  connect () {
    this.m.openWS()

    if (this.hbEnabled) {
      this.hbInterval = setInterval(this.sendHB.bind(this), HB_INTERVAL_MS)
    }
  }

  disconnect () {
    if (this.hbInterval !== null) {
      clearInterval(this.hbInterval)
      this.hbInterval = null
    }

    this.m.closeAllSockets()
  }

  sendWithConnection (ws, msg) {
    send(ws, msg)
  }

  send (msg) {
    this.m.withAuthSocket((ws) => {
      send(ws, msg)
    })
  }

  sendHB () {
    this.m.withAuthSocket((ws) => {
      send(ws, [0, 'n', null, {
        mid: Date.now(),
        type: 'ucm-hb',
        info: {}
      }])
    })
  }

  getConnection () {
    const id = this.m.sampleWSI()
    const c = this.m.getWSByIndex(id)

    return { id, c }
  }

  propagateEvent (name, ...args) {
    this.emit(name, ...args)
  }

  propagateDataEvent (name, data, meta = {}) {
    this.emit(`data:${name}`, data, meta)
  }

  onSocketUpdate (i, state) {
    this.emit('meta:connection:update', i, state)
  }

  onServerRestart () {
    // Otherwise the DMS flag closes all orders, and the packets are received
    // after a server restart, before the connection drops. We cannot
    // differentiate between manual user cancellations and those packets.
    this._ignoreOrderEvents = true
  }

  onWSReopen () {
    this._ignoreOrderEvents = false // see onServerRestart
    this.emit('meta:reload')
  }

  subscribe (connection, channel, filter) {
    subscribe(connection.c, channel, filter)
  }

  unsubscribe (connection, channel, filter) {
    const cid = findChannelId(connection.c, (data) => {
      if (data.channel !== channel) {
        return false
      }

      const fv = _pick(data, Object.keys(filter))
      return _isEqual(filter, fv)
    })

    if (!cid) {
      return debug('error unsubscribing: unknown channel %s', channel)
    }

    unsubscribe(connection.c, cid)
  }

  orderEventsValid () {
    return !this._ignoreOrderEvents
  }

  async submitOrderWithDelay (connection, delay, order) {
    const { c } = connection

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        submitOrder(c, order)
          .then(resolve)
          .catch(reject)
      }, delay)
    })
  }

  async cancelOrderWithDelay (connection, delay, order) {
    const { c } = connection

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        cancelOrder(c, order)
          .then(resolve)
          .catch(reject)
      }, delay)
    })
  }

  notify (ws, level, message) {
    send(ws, [0, 'n', null, {
      type: 'ucm-notify-ui',
      info: {
        level,
        message,
      }
    }])
  }
}
