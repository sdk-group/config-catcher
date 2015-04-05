'use strict';

var path = require('path');
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require('fs'));
var validator = require("./validation");

function ConfigCatcher() {
    this.mode = "event";
    this.configs = {};
    this.watchers = {};
    this.mtimes = {};
    this.validator = validator;
    this.backup_tools = {
        backup: this._defaultBackupFunc,
        restore: this._defaultRestoreFunc
    };
}

ConfigCatcher.prototype.watch = function (config_dir) {
    var self = this;
    fs.readdirAsync(config_dir)
        .map(function (fname) {
            return (path.extname(fname) == ".json") ? self.addSingleWatch(path.join(config_dir, fname)) : false;
        })
        .catch(function (err) {
            console.log("Wow, it got here though it should've not! Error: ", err.stack);
        });
}

ConfigCatcher.prototype.removeAllWatches = function () {
    for (f in this.configs) {
        this.removeWatch(this.configs[f]);
    }
}

ConfigCatcher.prototype._addSinglePollWatch = function (config_path) {
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
}

ConfigCatcher.prototype._addSingleEventWatch = function (config_path) {
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
            //console.log("Mtimes", self.mtimes[cfg_name]);
            self.watchers[cfg_name] = fs.watch(config_path,
                function (event, fname) {
                    if (event != "change") return;
                    var curr = fs.statSync(config_path);
                    var tm = new Date(curr.mtime).getTime();
                    console.log("Event %s on fname %s", event, fname);
                    //       console.log("Mtimes", cfg_name, tm == self.mtimes[cfg_name]);
                    if (tm == self.mtimes[cfg_name]) return;
                    // it was modified. let's go
                    self.mtimes[cfg_name] = tm;
                    console.log("Starting validation for", config_path);
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
}

ConfigCatcher.prototype.addSingleWatch = function (config_path) {
    switch (this.mode) {
    case "event":
        return this._addSingleEventWatch(config_path);
        break;
    case "poll":
    default:
        return this._addSinglePollWatch(config_path);
        break;
    }
}

ConfigCatcher.prototype.removeWatch = function (config_path) {
    switch (this.mode) {
    case "event":
        return this._removeSingleEventWatch(config_path);
        break;
    case "poll":
    default:
        return this._removeSinglePollWatch(config_path);
        break;
    }
}

ConfigCatcher.prototype._removeSinglePollWatch = function (config_path) {
    var cfg_name = path.parse(config_path).name;
    delete this.configs[cfg_name];
    fs.unwatchFile(config_path);
}

ConfigCatcher.prototype._removeSingleEventWatch = function (config_path) {
    var cfg_name = path.parse(config_path).name;
    delete this.configs[cfg_name];
    this.watchers[cfg_name].close();
    delete this.watchers[cfg_name];
    delete this.mtimes[cfg_name];
}

ConfigCatcher.prototype.configureBackup = function (bck_func, rst_func) {
    if (typeof bck_func == typeof rst_func == "Function") {
        this.backup_tools.backup = bck_func;
        this.backup_tools.restore = rst_func;
    }
}

ConfigCatcher.prototype._defaultBackupFunc = function (cfg_path) {
    fs.createReadStream(cfg_path).pipe(fs.createWriteStream(cfg_path + ".back"));
}
ConfigCatcher.prototype._defaultRestoreFunc = function (cfg_path) {
    return fs.renameAsync(cfg_path, cfg_path + ".incorrect")
        .then(function (res) {
            return fs.readFileAsync(cfg_path + ".back");
        })
        .then(function (data) {
            return fs.writeFileAsync(cfg_path, data);
        });
}


var cc = new ConfigCatcher();
module.exports = function (way) {
    cc.mode = way;
    return cc;
};