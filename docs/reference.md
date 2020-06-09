## Modules

<dl>
<dt><a href="#module_bfx-hf-ext-plugin-bitfinex">bfx-hf-ext-plugin-bitfinex</a></dt>
<dd><p>This is the standard Bitfinex exchange adapter for the Honey Framework, for
usage with <a href="https://github.com/bitfinexcom/bfx-hf-algo">bfx-hf-algo</a> and any consumer of
<a href="https://github.com/bitfinexcom/bfx-hf-models">bfx-hf-models</a>. It implements <code>Trade</code> and <code>Candle</code> sync
methods, along with an algo order adapter necessary for executing algo
orders with <a href="https://github.com/bitfinexcom/bfx-hf-algo">bfx-hf-algo</a>.</p>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#AOAdapter">AOAdapter</a> ⇐ <code>events.EventEmitter</code></dt>
<dd><p>Algorithmic order adapter, for usage with <a href="https://github.com/bitfinexcom/bfx-hf-algo">bfx-hf-algo</a></p>
</dd>
</dl>

<a name="module_bfx-hf-ext-plugin-bitfinex"></a>

## bfx-hf-ext-plugin-bitfinex
This is the standard Bitfinex exchange adapter for the Honey Framework, for
usage with [bfx-hf-algo](https://github.com/bitfinexcom/bfx-hf-algo) and any consumer of
[bfx-hf-models](https://github.com/bitfinexcom/bfx-hf-models). It implements `Trade` and `Candle` sync
methods, along with an algo order adapter necessary for executing algo
orders with [bfx-hf-algo](https://github.com/bitfinexcom/bfx-hf-algo).

**License**: Apache-2.0  
<a name="AOAdapter"></a>

## AOAdapter ⇐ <code>events.EventEmitter</code>
Algorithmic order adapter, for usage with [bfx-hf-algo](https://github.com/bitfinexcom/bfx-hf-algo)

**Kind**: global class  
**Extends**: <code>events.EventEmitter</code>  

* [AOAdapter](#AOAdapter) ⇐ <code>events.EventEmitter</code>
    * [new AOAdapter(params)](#new_AOAdapter_new)
    * _instance_
        * [.updateAuthArgs(args)](#AOAdapter+updateAuthArgs)
        * [.reconnect()](#AOAdapter+reconnect)
        * [.connect()](#AOAdapter+connect)
        * [.disconnect()](#AOAdapter+disconnect) ⇒ <code>Promise</code>
        * [.getConnection()](#AOAdapter+getConnection) ⇒ <code>object</code>
        * [.propagateEvent(name, ...args)](#AOAdapter+propagateEvent)
        * [.propagateDataEvent(name, data, meta)](#AOAdapter+propagateDataEvent)
        * [.subscribe(connection, channel, filter)](#AOAdapter+subscribe)
        * [.unsubscribe(connection, channel, filter)](#AOAdapter+unsubscribe)
        * [.submitOrderWithDelay(connection, delay, order)](#AOAdapter+submitOrderWithDelay) ⇒ <code>Promise</code>
        * [.cancelOrderWithDelay(connection, delay, order)](#AOAdapter+cancelOrderWithDelay) ⇒ <code>Promise</code>
        * [.sendWithAnyConnection(packet)](#AOAdapter+sendWithAnyConnection)
        * [.notify(ws, level, message)](#AOAdapter+notify)
    * _static_
        * [.HB_INTERVAL_MS](#AOAdapter.HB_INTERVAL_MS)
        * [.getTimeFrames()](#AOAdapter.getTimeFrames) ⇒ <code>object</code>

<a name="new_AOAdapter_new"></a>

### new AOAdapter(params)

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | params |
| [params.wsURL] | <code>string</code> | ws API URL |
| [params.restURL] | <code>string</code> | rest API URL |
| params.apiKey | <code>string</code> | API key |
| params.apiSecret | <code>string</code> | API secret |
| [params.agent] | <code>object</code> | node connection agent |
| [params.dms] | <code>number</code> | dead man switch, active 4 |
| [params.withHeartbeat] | <code>boolean</code> | enables WS heartbeat |
| [params.affiliateCode] | <code>string</code> | affiliate code to be attached to   all orders |

<a name="AOAdapter+updateAuthArgs"></a>

### aoAdapter.updateAuthArgs(args)
Set connection auth arguments

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| args | <code>object</code> | arguments |
| args.dms | <code>number</code> | dead man switch, active 4 |

<a name="AOAdapter+reconnect"></a>

### aoAdapter.reconnect()
Reconnects all open sockets

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
<a name="AOAdapter+connect"></a>

### aoAdapter.connect()
Opens a new socket connection

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
<a name="AOAdapter+disconnect"></a>

### aoAdapter.disconnect() ⇒ <code>Promise</code>
Disconnects all open sockets

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
**Returns**: <code>Promise</code> - p  
<a name="AOAdapter+getConnection"></a>

### aoAdapter.getConnection() ⇒ <code>object</code>
Get an open connection object

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
**Returns**: <code>object</code> - connection  
<a name="AOAdapter+propagateEvent"></a>

### aoAdapter.propagateEvent(name, ...args)
Emit an event

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | event name |
| ...args | <code>object</code> \| <code>Array</code> \| <code>string</code> \| <code>number</code> | arguments |

<a name="AOAdapter+propagateDataEvent"></a>

### aoAdapter.propagateDataEvent(name, data, meta)
Emit a data event

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | event name |
| data | <code>object</code> \| <code>Array</code> \| <code>string</code> \| <code>number</code> | event data |
| meta | <code>object</code> | event metadata |

<a name="AOAdapter+subscribe"></a>

### aoAdapter.subscribe(connection, channel, filter)
Subscribe to a channel

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| connection | <code>object</code> | connection object |
| channel | <code>string</code> | channel type, i.e. 'trades' |
| filter | <code>object</code> | channel filter, i.e. `{ symbol: 'tBTCUSD' }` |

<a name="AOAdapter+unsubscribe"></a>

### aoAdapter.unsubscribe(connection, channel, filter)
Unsubscribe from a channel

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| connection | <code>object</code> | connection object |
| channel | <code>string</code> | channel type, i.e. 'trades' |
| filter | <code>object</code> | channel filter, i.e. `{ symbol: 'tBTCUSD' }` |

<a name="AOAdapter+submitOrderWithDelay"></a>

### aoAdapter.submitOrderWithDelay(connection, delay, order) ⇒ <code>Promise</code>
Submit an order with a delay

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
**Returns**: <code>Promise</code> - p  

| Param | Type | Description |
| --- | --- | --- |
| connection | <code>object</code> | connection object |
| delay | <code>number</code> | delay in ms |
| order | <code>bfx-api-node-models.Order</code> | order |

<a name="AOAdapter+cancelOrderWithDelay"></a>

### aoAdapter.cancelOrderWithDelay(connection, delay, order) ⇒ <code>Promise</code>
Cancel an order with a delay

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  
**Returns**: <code>Promise</code> - p  

| Param | Type | Description |
| --- | --- | --- |
| connection | <code>object</code> | connection object |
| delay | <code>number</code> | delay in ms |
| order | <code>bfx-api-node-models.Order</code> | order |

<a name="AOAdapter+sendWithAnyConnection"></a>

### aoAdapter.sendWithAnyConnection(packet)
Send a packet via an authenticated socket

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>Array</code> | packet |

<a name="AOAdapter+notify"></a>

### aoAdapter.notify(ws, level, message)
Trigger an UI notification

**Kind**: instance method of [<code>AOAdapter</code>](#AOAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| ws | <code>ws.WebSocket</code> | ws client |
| level | <code>string</code> | notification level |
| message | <code>string</code> | notification message |

<a name="AOAdapter.HB_INTERVAL_MS"></a>

### AOAdapter.HB\_INTERVAL\_MS
WebSocket connection heartbeat interval in ms

**Kind**: static constant of [<code>AOAdapter</code>](#AOAdapter)  
**Read only**: true  
<a name="AOAdapter.getTimeFrames"></a>

### AOAdapter.getTimeFrames() ⇒ <code>object</code>
Returns a map of supported candle time frames, of the form
`[human readable tf]: tf`

**Kind**: static method of [<code>AOAdapter</code>](#AOAdapter)  
**Returns**: <code>object</code> - tfs  
