
Ext.define('Ext.ux.WebSocketManager', 
{
    singleton: true,

    wsList: Ext.create('Ext.util.HashMap'),

    register: function(websockets) 
    {
        var me = this;

        // Changes websockets into an array in every case
        if (Ext.isObject(websockets)) websockets = [websockets];

        Ext.each(websockets, function(websocket) {
            if (!Ext.isEmpty(websocket.url)) me.wsList.add(websocket.url, websocket);
        });
    },


    contains: function(websocket) 
    {
        return this.wsList.containsKey(websocket.url);
    },


    get: function(url) 
    {
        return this.wsList.get(url);
    },


    each: function(fn) 
    {
        this.wsList.each(function(url, websocket, len) {
            fn(websocket);
        });
    },


    unregister: function(websockets)
    {
        var me = this;

        if (Ext.isObject(websockets)) websockets = [websockets];

        Ext.each(websockets, function(websocket) {
            if (me.wsList.containsKey(websocket.url)) me.wsList.removeAtKey(websocket.url);
        });
    },


    broadcast: function(event, message)
    {
        this.multicast([], event, message);
    },


    multicast: function(websockets, event, data) 
    {
        this.getExcept(websockets).each(function(url, websocket, len) {
            if (websocket.isReady()) {
                if (Ext.isEmpty(data)) websocket.send(event);
                else websocket.send(event, data);
            }
        });
    },


    listen: function(events, handler) 
    {
        if (Ext.isString(events)) events = [events];

        this.wsList.each(function(url, websocket, len) {
            Ext.each(events, function(event) {
                websocket.on(event, handler);
            });
        });
    },


    listenExcept: function(events, websockets, handler) 
    {
        if (Ext.isString(events)) events = [events];

        this.getExcept(websockets).each(function(url, websocket, len) {
            Ext.each(events, function(event) {
                websocket.on(event, handler);
            });
        });
    },


    getExcept: function(websockets) 
    {
        if (Ext.isObject(websockets)) websockets = [websockets];

        var list = this.wsList.clone();

        // Exclude websockets from the communication
        Ext.each(websockets, function(websocket) {
            list.removeAtKey(websocket.url);
        });

        return list;
    },


    closeAll: function() 
    {
        var me = this;

        me.wsList.each(function(url, websocket, len) {
            websocket.close();
            me.unregister(websocket);
        });
    }

});

