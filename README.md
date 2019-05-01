# ExtJs Package Open Tooling Package Wrapper for WebSocket

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Build Status](https://dev.azure.com/spmeesseman/extjs-pkg-websocket/_apis/build/status/spmeesseman.extjs-pkg-websocket?branchName=master)](https://dev.azure.com/spmeesseman/extjs-pkg-websocket/_build/latest?definitionId=2&branchName=master)

## Description

> This package provides an ExtJS package wrapper for js websocket.

## Install

To install this package, run the following command:

    npm install @perryjohnson/extjs-pkg-websocket

## Usage

To include the package in an ExtJS application build, be sure to add the package name to the list of required packages in the app.json file:

    "requires": [
         "websocket",
        ...
    ]

For an open tooling build, also add the node_modules path to the workspace.json packages path array:

     "packages": {
        "dir": "...${package.dir}/node_modules/@perryjohnson/extjs-pkg-websocket"
    }

Simply include the control into any class file:

    require: [ 'Ext.ux.websocket' ],
    items: [
    {
        xtype: 'websocket'
    }]
