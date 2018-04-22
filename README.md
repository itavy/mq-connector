# mq-Structure

## Instalation

```
npm install @itavy/mq-structure
```

## API
## Classes

<dl>
<dt><a href="#RabbitMQ">RabbitMQ</a></dt>
<dd><p>Rabbit MQ interface</p>
</dd>
</dl>

## Objects

<dl>
<dt><a href="#itavy/ierror">itavy/ierror</a> : <code>object</code></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#getConnector">getConnector(type, options)</a> ⇒ <code><a href="#MqConnector">MqConnector</a></code></dt>
<dd><p>Instantiate a MQ connector</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MqConnector">MqConnector</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#MqConnectorTypes">MqConnectorTypes</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="RabbitMQ"></a>

## RabbitMQ
Rabbit MQ interface

**Kind**: global class  

* [RabbitMQ](#RabbitMQ)
    * [new RabbitMQ(di)](#new_RabbitMQ_new)
    * [.close()](#RabbitMQ+close) ⇒ <code>Promise</code>
    * [.sendMessage(message, queue, [exchange], [options])](#RabbitMQ+sendMessage) ⇒ <code>Promise</code>
    * [.subscribe([queue], consumer, [exchange], [topic], [options])](#RabbitMQ+subscribe) ⇒ <code>Promise</code>

<a name="new_RabbitMQ_new"></a>

### new RabbitMQ(di)

| Param | Type | Description |
| --- | --- | --- |
| di | <code>Object</code> | required dependencies for RabbitMq interface |

<a name="RabbitMQ+close"></a>

### rabbitMQ.close() ⇒ <code>Promise</code>
Close connection to message broker

**Kind**: instance method of [<code>RabbitMQ</code>](#RabbitMQ)  
**Returns**: <code>Promise</code> - resolves on succeeded connection  
**Access**: public  
<a name="RabbitMQ+sendMessage"></a>

### rabbitMQ.sendMessage(message, queue, [exchange], [options]) ⇒ <code>Promise</code>
Send message to MQ Broker

**Kind**: instance method of [<code>RabbitMQ</code>](#RabbitMQ)  
**Returns**: <code>Promise</code> - resolves on success  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>Buffer</code> |  | message to be sent |
| queue | <code>String</code> |  | queue or topic where to send the message |
| [exchange] | <code>String</code> | <code>&#x27;&#x27;</code> | exchage to be used if topics are used |
| [options] | <code>Object</code> | <code>{}</code> | message options to be used when sending message |

<a name="RabbitMQ+subscribe"></a>

### rabbitMQ.subscribe([queue], consumer, [exchange], [topic], [options]) ⇒ <code>Promise</code>
Subscribe to a queue or topic

**Kind**: instance method of [<code>RabbitMQ</code>](#RabbitMQ)  
**Returns**: <code>Promise</code> - resolves on success  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [queue] | <code>String</code> | <code></code> | queue where to subscribe |
| consumer | <code>function</code> |  | function to be called when there are messages to be received |
| [exchange] | <code>String</code> | <code></code> | exchange to be used when topics are used |
| [topic] | <code>String</code> | <code></code> | topic where the queue is binded |
| [options] | <code>Object</code> | <code></code> | options for subscription |

<a name="itavy/ierror"></a>

## itavy/ierror : <code>object</code>
**Kind**: global namespace  
<a name="getConnector"></a>

## getConnector(type, options) ⇒ [<code>MqConnector</code>](#MqConnector)
Instantiate a MQ connector

**Kind**: global function  
**Returns**: [<code>MqConnector</code>](#MqConnector) - requested mq connector  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Symbol</code> | mq connector type |
| options | <code>Object</code> | specific mq connector options |

<a name="MqConnector"></a>

## MqConnector : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| connect | <code>function</code> | 
| sendMessage | <code>function</code> | 
| subscribe | <code>function</code> | 

<a name="MqConnectorTypes"></a>

## MqConnectorTypes : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| RABBIT_MQ | <code>Symbol</code> | 


## TODO

* Examples

## LICENSE

[MIT](https://github.com/itavy/mq-structure/blob/master/LICENSE.md)
