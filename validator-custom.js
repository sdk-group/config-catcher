'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var validator = require('validator');
var traverse = require('traverse');
var _ = require("lodash");

validator.extend('isRegExp', function (str, reg) {
    return reg.test(str);
});

var validate = function (cfg_path) {
    var validate = null;
    return Promise.props({
            cfg_obj: _loadConfig(cfg_path),
            sch_obj: _loadSchema(cfg_path)
        })
        .then(function (res) {
            var res = traverse_validate(res.cfg_obj, res.sch_obj);
            return res;
        })
        .catch(function (err) {
            console.log("Validation error: ", err.message);
            console.error(err.stack);
            return false;
        });
}

var traverse_validate = function traverse_validate(cfg, sch) {
    var tr_sch = traverse(sch);
    return traverse(cfg).reduce(function (acc, x) {
        if (!this.isLeaf) return acc;
        var sch_fields = tr_sch.get(this.path);
        var args = _.union([x], sch_fields.ext_args);
        return acc && validator[sch_fields.validator].apply(null, args);
    }, true);
}

var _loadConfig = function (cfg_path) {
    console.log("Loading ", cfg_path);
    return fs.readFileAsync(cfg_path, "utf8")
        .then(JSON.parse)
        .catch(function (e) {
            console.error("Config loading error", e.stack);
            throw e;
        });
}

var _loadSchema = function (cfg_path) {
    var pc = path.parse(cfg_path);
    pc.dir = path.resolve(pc.dir, "schema");
    pc.ext = ".custom";
    pc.base = pc.name + pc.ext;
    var schema_path = path.format(pc);
    console.log("Loading ", schema_path);
    return fs.readFileAsync(schema_path, "utf8")
        .then(JSON.parse)
        .catch(function (e) {
            console.error("Schema loading error", e.stack);
            throw e;
        });
}

module.exports = validate;