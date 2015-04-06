'use strict';

var path = require('path');
var util = require('util');
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require('fs'));
var _ = require("lodash");

function ConfigCatcher() {
    this.configs = {};
    this.watchers = {};
    this.mtimes = {};
    this.backup_tools = {
        backup: this._defaultBackupFunc,
        restore: this._defaultRestoreFunc
    };
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

var catcher = new ConfigCatcher();

module.exports = function (opts) {
    var wmode = opts.watch || "event";
    var vmode = opts.validate || "jschema";
    var eye = require("./watcher-" + wmode);
    catcher.validator = require("./validator-" + vmode);
    return _.mixin(catcher, eye);
};