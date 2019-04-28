const request = require("request");
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;

let options = {
    url: host+'/washingtonpost/article',
    method: "GET"
}
request(options, function(error, response, body){
    if (error || !body) {
        return;
    }
    console.log(body);
})

