'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var json_valid = require('is-my-json-valid');

var validate = function (cfg_path) {
    var validate = null;
    return Promise.props({
            cfg_obj: _loadConfig(cfg_path),
            sch_obj: _loadSchema(cfg_path)
        })
        .then(function (res) {
            validate = json_valid(res.sch_obj, {
                verbose: true
            });
            var res = validate(res.cfg_obj);
            if (!res) {
                console.log("Validation errors: ", validate.errors);
            }
            return res;
        })
        .catch(function (err) {
            console.log("Validation error: ", err.message);
            //           console.error(err.stack);
            return false;
        });
}

var _loadConfig = function (cfg_path) {
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
    var schema_path = path.format(pc);
    return fs.readFileAsync(schema_path, "utf8")
        .then(JSON.parse)
        .catch(function (e) {
            console.error("Schema loading error", e.stack);
            throw e;
        });
}

module.exports = validate;