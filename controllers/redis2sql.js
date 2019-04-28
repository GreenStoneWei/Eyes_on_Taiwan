// 30 * * * * node /path/to/redis2sql.js

const request = require("request");
const myLib   = require('../util/config.js');
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = domainName;

let options = {
    url: host+'/api/rediscount2sql',
    method: "GET"
}
request(options, function(error, response, body){
    if(error || !body) {
        myLib.log(error);
        return;
    }
})

