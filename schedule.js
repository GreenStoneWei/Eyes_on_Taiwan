const request = require("request");
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;

let routeList = ['/washingtonpost/list',
                 '/independent/list',
                 '/quartz/list',
                 '/economist/list',
                 '/guardian/list',
                 '/aljazeera/list',
                 '/nytimes/list',
                 '/cnn/list',
                 '/bbc/list'];

let schedule = {
    url: host+"/schedule/test",
    method: "GET"
}
request(schedule, function(error, response, body){
if (error || !body) {
    return;
}
})

for (let i=0; i< routeList.length ; i++){
    let options = {
        url: host+routeList[i],
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            return;
        }
    })
}
