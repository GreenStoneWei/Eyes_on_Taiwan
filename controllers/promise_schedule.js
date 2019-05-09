// crontab job
// 0 */6 * * * node /path/to/promise_schedule.js

const myLib   = require('../util/config.js');
const request = require('request');
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;

const fixImgs = require('./img_fixer.js');
const findSimilarArticle = require('./similar_article_finder.js');
const translator = require('./translator.js');

let routeList = ['/washingtonpost/list',
                 '/independent/list',
                 '/quartz/list',
                 '/economist/list',
                 '/guardian/list',
                 '/aljazeera/list',
                 '/nytimes/list',
                 '/cnn/list',
                 '/bbc/list'];


let getNewArticle = function(){
    let promiseArray = [];
    for (let i=0; i<routeList.length; i++){
        let onePromise = 'promise' + i.toString();
        onePromise = new Promise ((resolve, reject)=>{
            let options = {
                url: host+routeList[i],
                method: "GET"
            }
            request(options, function(error, response, body){
                if(error || !body) {
                    reject(error);
                }
                else{
                    console.log(body);
                    resolve('article update');
                }
            })
        })
        promiseArray.push(onePromise);
    }
    return promiseArray;
}

async function schedule(){
    try{
        let scrapeTask = getNewArticle();
        let getAllArticle     = await Promise.all(scrapeTask);
        let imgFixer          = await fixImgs();
        let calSimilarAritlce = await findSimilarArticle();
        let articleTranslated = await translator.article();
        let tagTranslated     = await translator.tag();
        console.log('all done');
    }
    catch(error){
        console.log(error);
    }
}

schedule();