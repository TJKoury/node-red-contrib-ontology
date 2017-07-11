/**
 * Copyright DigitalArsenal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/



module.exports = function (RED) {
    "use strict";

    var path = require('path');
    var fs = require('fs');
    var _ = require('lodash');

    function ontologyNode(n) {
        var sToken = '05669d33-00cf-400f-b614-768020c21c50';
        RED.nodes.createNode(this, n);

        this.knex = (RED.hasOwnProperty("cluster") && RED.cluster.knex) ? RED.cluster.knex : require('knex');

        this.topic = n.topic;

        var node = this;
        for (var x in n) {
            node[x] = n[x];
        }
        process.env.knexStart = process.env.knexStart || "";

        if (process.bingo === process.pid && process.env.knexStart.indexOf(node.name) === -1) {

            process.env.knexStart += node.name + ",";

            var ontology_path = path.resolve(process.env.NODE_RED_HOME, 'databases', 'ontology');

            if (!fs.existsSync(ontology_path)) {
                fs.mkdirSync(ontology_path);
            }

            node.file_name = path.resolve(ontology_path, this.name + ".us-ontology");

            node.knex_client = this.knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: node.file_name
                }
            });
            /* Table Change Detection */
            /*
            var diffCheck = node.knex_client.schema.raw('SELECT * FROM sqlite_master').then(function (a) {

                var _table = a.filter(z => { return z.name === node.name });
                var tt = node.knex_client.schema.createTable(node.name, function (table) {
                    for (var _prop in node.entity_properties) {
                        var _propv = node.entity_properties[_prop];
                        table[_propv["Increments?"] ? "increments" : _propv.Type](_propv.Name, _propv["Increments?"] ? "increments" : _propv.Size);
                    }
                }).toSQL();

                console.log('diffcheck')
                return Promise.resolve(_table[0].sql.toLowerCase() === tt[0].sql.toLowerCase());
            });

            var deleteTable = Promise.resolve().then(function (diff) {
                console.log('deleting table', arguments);
                if (diff) {
                    return this.knex_client.schema.dropTableIfExists(node.name).catch(function (e) {
                        console.log(e)
                    })
                } else {
                    return Promise.resolve()
                }
            });

            var createTable = this.knex_client.schema.createTable(node.name, function (table) {
                console.log('creating table');
                for (var _prop in node.entity_properties) {
                    var _propv = node.entity_properties[_prop];
                    
                    table[_propv["Increments?"] ? "increments" : _propv.Type](_propv.Name, _propv["Increments?"] ? "increments" : _propv.Size);
                }
            }).catch(function (e) {
                //console.log(e);
            }).then((dbSchema, dropTableResult, createTableResult) => {

                //console.log(dbSchema)
            })
            
            Promise.all([
                diffCheck,
                deleteTable,
                createTable
            ])*/
        };

        // respond to inputs....
        this.on('input', function (msg) {
            node.warn("I saw a payload: " + msg.payload);

            node.send(msg);
        });

        this.on("close", function () {
            var _newstack = [];
            RED.httpAdmin._router.stack.forEach(function (route, i, routes) {
                if (route.regexp.toString().indexOf(sToken) === -1) {
                    _newstack.push(route);
                }
            });

            RED.httpAdmin._router.stack = _newstack;
            process.env.knexStart = process.env.knexStart.replace(node.name + ",", "");

        });

        RED.httpAdmin.get('/ontology-node' + sToken, RED.auth.needsPermission("settings.read"), function (req, res) {
            console.log(node.file_name);
            res.send(fs.existsSync(node.file_name));
        });
    }


    RED.nodes.registerType("ontology", ontologyNode);

}
