const request = require('request');

let options = {
    url: "http://3.14.38.182:3000/api/1.0/products/all",
    method: "GET"
}
request(options, function(error, response, body){
    if (error || !body) {
        myLib.log(error);
        return;
    }
})