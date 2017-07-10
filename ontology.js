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
    function ontologyNode(n) {

        RED.nodes.createNode(this, n);
        
        this.knex = (RED.hasOwnProperty("cluster") && RED.cluster.knex) ? RED.cluster.knex : require('knex');

        this.topic = n.topic;

        var node = this;
        for (var x in n) {
            node[x] = n[x];
        }
       process.env.knexStart = process.env.knexStart || "";
        if (process.bingo === process.pid && process.env.knexStart.indexOf(node.name)===-1) {
           process.env.knexStart+=node.name+",";

            var ontology_path = path.resolve(process.env.NODE_RED_HOME, 'databases', 'ontology');

            if (!fs.existsSync(ontology_path)) {
                fs.mkdirSync(ontology_path);
            }

            var file_name = path.resolve(ontology_path, this.name + ".us-ontology");

            this.knex_client = this.knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: file_name
                }
            });

            Promise.all([this.knex_client.schema.raw('SELECT * FROM sqlite_master'),
            this.knex_client.schema.dropTableIfExists(node.name).catch(function(e){
                console.log(e)
            }),
            this.knex_client.schema.createTable(node.name, function (table) {

                table.increments();
                table.string('name');
                table.timestamps();
            }).catch(function(e){
                console.log(e);
            })]).then((dbSchema, dropTableResult, createTableResult)=>{
                
                console.log(process.pid, process.bingo,process.env.knexStart, new Date())
            })

        }


        // respond to inputs....
        this.on('input', function (msg) {
            node.warn("I saw a payload: " + msg.payload);

            node.send(msg);
        });

        this.on("close", function () {
            if(process.knexStart &&process.env.knexStart[node.name]){
                deleteprocess.env.knexStart[node.name];
            }
        });
    }

    RED.nodes.registerType("ontology", ontologyNode);

}
