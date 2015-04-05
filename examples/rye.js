'use strict';

//just to test

var catcher = require("../catcher")("event");
var path = require("path");
var couchbase = require("couchbase");
var myCluster = new couchbase.Cluster('couchbase://localhost');
var bucket = myCluster.openBucket("mt");
var fs = require("fs");

/*
function customBack(cfg_path) {
    var name = path.parse(cfg_path).name;
    var data = fs.read(cfg_path);
    bucket.upsert(name + ".back", data, function (res) {
        console.log(name, "backup done!");
    });
}

function customRestore(cfg_path) {
    var name = path.parse(cfg_path).name;
    bucket.get(name + ".back", function (res) {
        fs.write(cfg_path, res.value, function (res) {
            console.log(name, "restore done!", res);
        });
    });

}

catcher.configureBackup(true, customBack, customRestore);
*/
catcher.watch(path.resolve(__dirname, "./config"));

//catcher.remove(path.normalize(__dirname + "/cfg1.json"));