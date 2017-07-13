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
    var url = require('url');
    var express = require('express');

    var ontology_path = path.resolve(process.env.NODE_RED_HOME, 'databases', 'ontology');
    var file_name = function (name) { return path.resolve(ontology_path, name + ".us-ontology"); }

    function ontologyNode(n) {
        var sToken = '05669d33-00cf-400f-b614-768020c21c50';
        RED.nodes.createNode(this, n);

        this.knex = (RED.hasOwnProperty("cluster") && RED.cluster.knex) ? RED.cluster.knex : require('knex');

        this.createQuery = function (queryObject) {
            for (var param in queryObject) {

            }
        }

        var node = this;
        for (var x in n) {
            node[x] = n[x];
        }
        process.env.knexStart = process.env.knexStart || "";

        node.knex_client = this.knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: file_name(node.name)
            }
        });

        if (process.bingo === process.pid && process.env.knexStart.indexOf(node.name) === -1) {

            process.env.knexStart += node.name + ",";

            if (!fs.existsSync(ontology_path)) {
                fs.mkdirSync(ontology_path);
            }

            node.knex_client = this.knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: file_name(node.name)
                }
            });

            var tableBuild = function (table) {
                var nameCheck = {};
                node.entity_properties.forEach(function (_propv, i) {
                    if(!nameCheck[_propv.Name]){
                        table[_propv.Type](_propv.Name, _propv.Size);
                        nameCheck[_propv.Name] = true;
                    }else{
                        RED.log.error(_propv.Name+" already added.");
                    }
                });
            }

            /* Table Change Detection */
            var createTable = function () {
                node.knex_client.schema.createTable(node.name, tableBuild)
                    .then(function () {
                        RED.log.info("Rebuild Entity "+node.name+" complete.");
                        node.status({ fill: "green", shape: "ring", text: "Rebuild Complete." });
                    }).catch(function (e) {
                        RED.log.error("Rebuild Entity "+node.name+" Error."+e.toString());
                        node.status({ fill: "red", shape: "ring", text: "ERROR REBUILDING ENTITY" });
                    }).done(function(){
                        setTimeout(function () {
                            node.status({});
                        }, 5000);
                    });
            };

            var diffCheck = node.knex_client.schema.raw('SELECT * FROM sqlite_master').then(function (a) {

                var _table = a.filter(z => { return z.name === node.name });
                var tt = node.knex_client.schema.createTable(node.name, tableBuild).toSQL();

                var diff = (_table.length === 0 || tt.length === 0) ? true : _table[0].sql.toLowerCase() !== tt[0].sql.toLowerCase();

                if (diff) {
                    RED.log.info("Rebuilding Entity "+node.name);
                    node.status({ fill: "yellow", shape: "ring", text: "Rebuilding Entity..." });
                    return node.knex_client.schema.dropTableIfExists(node.name)
                        .then(createTable)
                        .catch(function (e) {
                            console.log(e);
                        })
                } else {
                    return Promise.resolve();
                }
            });

        };

        // respond to inputs....
        this.on('input', function (msg) {
            if (Object.keys(msg.payload).length > 0) {
                this.createQuery(msg.payload).then(function (data) {
                    node.send(data);
                })

            } else {
                node.knex_client.schema.raw('SELECT * FROM sqlite_master').then(function (a) {
                    msg.payload = {
                        "table": a.filter(z => { return z.name === node.name }),
                        "properties": node.entity_properties
                    };
                    node.send(msg);
                });
            }
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

        [path.join(__dirname, "node_modules")].forEach(function (_dir) {
            RED.httpAdmin.use("/hot" + sToken,/*RED.auth.needsPermission("settings.read"),*/ express.static(_dir));
        });

        RED.httpAdmin.get('/ontology-node' + sToken, RED.auth.needsPermission("settings.read"), function (req, res) {
            res.send(fs.existsSync(file_name(url.parse(req.url, true).query.name)));
        });

        RED.httpAdmin.get('/ontology-node-data' + sToken, RED.auth.needsPermission("settings.read"), function (req, res) {

            res.send([{ name: n.name }]);
        });
    }


    RED.nodes.registerType("ontology", ontologyNode);

}
