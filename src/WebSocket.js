
Ext.define('Ext.ux.WebSocket', 
{
    alias: 'websocket',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    //requires: ['Ext.util.TaskManager', 'Ext.util.Memento'],
    requires: ['Ext.util.TaskManager'],

    config: 
    {
        url: '',
        //
        // protocol The protocol to use in the connection
        //
        protocol: null,
        //
        // communicationType The type of communication. 'both' (default) for event-driven and 
        // pure-text communication, 'event' for only event-driven and 'text' for only pure-text.
        //
        communicationType: 'both',
        //
        // autoReconnect If the connection is closed by the server, it tries to re-connect again. 
        // The execution interval time of this operation is specified in autoReconnectInterval
        //
        autoReconnect: true,
        //
        // autoReconnectInterval Execution time slice of the autoReconnect operation, specified 
        // in milliseconds.
        //
        autoReconnectInterval: 5000,
        //
        // lazyConnection Connect the websocket after the initialization with the open method
        //
        lazyConnection: false,
        //
        // keepUnsentMessages Keep unsent messages and try to send them back after the connection 
        // is open again
        //
        keepUnsentMessages: false,
        //
        // maxConnectRetries maximum nuber of times to try to connect
        //
        maxConnectRetries: 10
    },

    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,

    //memento: {},
    messageQueue: [],
    connectRetries: 0,

    constructor: function(cfg) {
        var me = this;

        // Raises an error if no url is given
        if (Ext.isEmpty(cfg)) {
            Ext.Error.raise('URL for the websocket is required!');
            return null;
        }

        // Allows initialization with string
        // e.g.: Ext.create ('Ext.ux.WebSocket', 'ws://localhost:8888');
        if (typeof cfg === 'string') {
            cfg = {
                url: cfg
            };
        }

        me.initConfig(cfg);
        me.mixins.observable.constructor.call(me, cfg);

        try {
            // Initializes internal websocket
            if (!me.getLazyConnection()) me.initWebsocket();

            //me.memento = Ext.create('Ext.util.Memento');
            //me.memento.capture('autoReconnect', me);
        }
        catch(err) {
            console.error(err.message);
            return null;
        }

        return me;
    },


    isReady: function() 
    {
        return this.getStatus() === this.OPEN;
    },


    getStatus: function() 
    {
        return this.ws.readyState;
    },


    close: function() 
    {
        var me = this;

        if (me.autoReconnectTask) {
            Ext.TaskManager.stop(me.autoReconnectTask);
            delete me.autoReconnectTask;
        }
        // Deactivate autoReconnect until the websocket is open again
        me.setAutoReconnect(false);

        me.ws.close();

        return me;
    },

    open: function() 
    {
        var me = this;

        // Restore autoReconnect initial value
        //me.memento.restore('autoReconnect', false, me);
        me.setAutoReconnect(true);
        me.initWebsocket();

        return me;
    },


    send: function() 
    {
    },

    
    initWebsocket: function() 
    {
        var me = this;

        me.ws = Ext.isEmpty(me.getProtocol()) ? new WebSocket(me.getUrl()) : new WebSocket(me.getUrl(), me.getProtocol());

        me.ws.onopen = function (evt) 
        {
            me.connectRetries = 0;
            //
            // Kills the auto reconnect task.  It will be reactivated at the next onclose event
            //
            if (me.autoReconnectTask) {
                Ext.TaskManager.stop(me.autoReconnectTask);
                delete me.autoReconnectTask;
            }

            // Flush unset messages
            if (me.getKeepUnsentMessages() && me.messageQueue.length > 0) {
                while (me.messageQueue.length > 0) {
                    // Avoid infinite loop into safeSend method
                    if (me.isReady()) me.safeSend(me.messageQueue.shift());
                    else break;
                }
            }

            me.fireEvent('open', me);
        };

        me.ws.onerror = function(error) {
            me.connectRetries++;
            me.fireEvent('error', me, error);
        };

        me.ws.onclose = function(evt) {
            me.fireEvent('close', me);

            // Setups the auto reconnect task, just one
            if (me.getAutoReconnect() && (typeof me.autoReconnectTask === 'undefined')) {
                me.autoReconnectTask = Ext.TaskManager.start({
                    run: function() {
                        // It reconnects only if it's disconnected
                        if (me.getStatus() === me.CLOSED) {
                            me.initWebsocket();
                        }
                    },
                    interval: me.getAutoReconnectInterval()
                });
            }
            //
            // Kills the auto reconnect task.  It will be reactivated at the next onclose event
            //
            else if (me.autoReconnectTask && me.connectRetries >= me.getMaxConnectRetries()) {
                console.warn("Max websocket connection attempts exceeded, user must manually connect to ws services");
                Ext.TaskManager.stop(me.autoReconnectTask);
                delete me.autoReconnectTask;
            }
        };

        if (me.getCommunicationType() === 'both') {
            me.ws.onmessage = Ext.bind(me.receiveBothMessage, this);
            me.send = Ext.bind(me.sendBothMessage, this);
        }
        else if (me.getCommunicationType() === 'event') {
            me.ws.onmessage = Ext.bind(me.receiveEventMessage, this);
            me.send = Ext.bind(me.sendEventMessage, this);
        }
        else {
            me.ws.onmessage = Ext.bind(me.receiveTextMessage, this);
            me.send = Ext.bind(me.sendTextMessage, this);
        }
    },

    
    safeSend: function(data) 
    {
        var me = this;
        if (me.isReady()) me.ws.send(data);
        else if (me.getKeepUnsentMessages()) me.messageQueue.push(data);

        return me;
    },


    receiveBothMessage: function(message) 
    {
        var me = this;

        try {
            /*
             message.data : JSON encoded message
             msg.event : event to be raise
             msg.data : data to be handle
             */
            var msg = Ext.JSON.decode(message.data);
            me.fireEvent(msg.event, me, msg.data);
            me.fireEvent('message', me, msg);
        }
        catch(err) {
            if (Ext.isString(message.data)) me.fireEvent(message.data, me, message.data);
            // Message event is always sent
            me.fireEvent('message', me, message.data);
        }
    },


    receiveEventMessage: function(message) 
    {
        var me = this;

        try {
            var msg = Ext.JSON.decode(message.data);
            me.fireEvent(msg.event, me, msg.data);
            me.fireEvent('message', me, msg);
        }
        catch (err) {
            Ext.Error.raise(err);
        }
    },


    receiveTextMessage: function(message) 
    {
        var me = this;

        try {
            me.fireEvent(message, me, message);
            // Message event is always sent
            me.fireEvent('message', me, message);
        }
        catch (err) {
            Ext.Error.raise(err);
        }
    },


    sendBothMessage: function(events, data) 
    {
        var me = this;

        // Treats it as normal message
        if (arguments.length === 1) {
            if (Ext.isString(events)) me.safeSend(events);
            else Ext.Error.raise('String expected!');
        }
        // Treats it as event-driven message
        else if (arguments.length >= 2) {
            events = Ext.isString(events) ? [events] : events;

            for (var i = 0; i < events.length; i++) {
                var msg = {
                    event: events[i],
                    data: data
                };

                me.safeSend(Ext.JSON.encode(msg));
            }
        }

        return me;
    },


    sendEventMessage: function(events, data) 
    {
        var me = this;

        events = Ext.isString(events) ? [events] : events;

        for (var i = 0; i < events.length; i++) {
            var msg = {
                event: events[i],
                data: data
            };

            me.safeSend(Ext.JSON.encode(msg));
        }

        return me;
    },


    sendTextMessage: function(event) 
    {
        var me = this;

        me.safeSend(event);

        return me;
    }
});
