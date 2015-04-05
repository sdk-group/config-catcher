'use strict';

//maybe should wrap something like winston
var logger = function (logfile) {
    return {
        name: "Message logging util.",
        logfile: logfile,
        log: function (message) {

        }
    }
}

module.exports = logger;