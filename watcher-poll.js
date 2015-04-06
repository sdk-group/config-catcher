//using event-oriented watch
'use strict';

var path = require('path');
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require('fs'));

module.exports = {
    desc: "Event-oriented watcher",
    watchDir: function (config_dir) {
        var self = this;
        fs.readdirAsync(config_dir)
            .map(function (fname) {
                return (path.extname(fname) == ".json") ? self.watchFile(path.join(config_dir, fname)) : false;
            })
            .catch(function (err) {
                console.log("Wow, it got here though it should've not! Error: ");
                console.error(err.message, err.stack);
            });
    },

    unwatchDir: function (config_dir) {
        var self = this;
        fs.readdirAsync(config_dir)
            .map(function (fname) {
                return (path.extname(fname) == ".json") ? self.unwatchFile(path.join(config_dir, fname)) : false;
            })
            .catch(function (err) {
                console.log("Wow, it got here though it should've not! Error: ", err.stack);
            });
    },

    watchFile: function (config_path) {
        var cfg_name = path.parse(config_path).name;
        var self = this;

        self.validator(config_path)
            .then(function (res) {
                if (!res) {
                    throw new Error("Initial validation of " + config_path + " failed.");
                }
                return self.backup_tools.backup(config_path);
            })
            .then(function () {
                return fs.statAsync(config_path);
            })
            .then(function (res) {
                self.mtimes[cfg_name] = new Date(res.mtime).getTime();
                self.configs[cfg_name] = config_path;
                fs.watchFile(config_path,
                    function (curr, prev) {
                        var ctm = new Date(curr.mtime).getTime();
                        var ptm = new Date(prev.mtime).getTime();
                        if (ctm == ptm) return;
                        self.mtimes[cfg_name] = ctm;
                        self.validator(config_path)
                            .then(function (res) {
                                if (res) {
                                    console.log("Validation of " + config_path + " successful.");
                                    return self.backup_tools.backup(config_path);
                                }
                                console.log("Validation of " + config_path + " failed.");
                                return self.backup_tools.restore(config_path);
                            });
                    });
            })
            .catch(function (err) {
                console.log("Error adding cc watch on ", config_path);
                //            console.error(err.stack);
                return false;
            });
    },

    unwatchFile: function (config_path) {
        var cfg_name = path.parse(config_path).name;
        delete this.configs[cfg_name];
        fs.unwatchFile(config_path);
    }
}