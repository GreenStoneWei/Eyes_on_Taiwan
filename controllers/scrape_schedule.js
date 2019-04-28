// crontab job
// 0 */6 * * * node /path/to/scrape_schedule.js

const request = require("request");
const myLib   = require('../util/config.js');
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;
const updateSimilarArticle = require('./classifier_schedule.js')

let routeList = ['/washingtonpost/list',
                 '/independent/list',
                 '/quartz/list',
                 '/economist/list',
                 '/guardian/list',
                 '/aljazeera/list',
                 '/nytimes/list',
                 '/cnn/list',
                 '/bbc/list'];
let fetched = 0;
for (let i=0; i< routeList.length ; i++){
    let options = {
        url: host+routeList[i],
        method: "GET"
    }
    request(options, function(error, response, body){
        
        if(error || !body) {
            fetched++;
            if(fetched === routeList.length){
                myLib.log(new Error('The update of similar article failed.'));
            }
        }
        else{
            fetched++;
            if(fetched === routeList.length){
                updateSimilarArticle.updateSimilarArticle();
            }
        }
    })
}

// let schedule = {
//         url: host+"/schedule/test",
//         method: "GET"
//     }
// request(schedule, function(error, response, body){
//     if (error || !body) {
//         return;
//     }
// })
