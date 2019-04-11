const request = require("request");

let routeList = ['/washingtonpost/list',
                 '/independent/list',
                 '/quartz/list',
                 '/economist/list',
                 '/guardian/list',
                 '/aljazeera/list',
                 '/nytimes/list',
                 '/cnn/list',
                 '/bbc/list']
for (let i=0; i< routeList.length ; i++){
    let options = {
        url: "https://wheatxstone"+routeList[i],
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            return;
        }
    })
}
