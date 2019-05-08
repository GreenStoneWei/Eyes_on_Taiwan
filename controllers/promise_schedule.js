// crontab job
// 0 */6 * * * node /path/to/scrape_schedule.js
const myLib   = require('../util/config.js');
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;
// const updateSimilarArticle = require('./classifier_schedule.js');
const mysql   = require('../util/mysql.js');
const request = require('request');
const redis   = require('redis');
const client  = redis.createClient();
const urlencode = require('urlencode');
const uploadImgToS3 = require('../controllers/s3.js');
const credentials = require('../util/credentials.js')
const natural = require('natural');
const TfIdf   = natural.TfIdf;
const dimensionN = 50;
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

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
    Promise.all().then(()=>{
        return promiseArray;
    }).catch((error)=>{
        return error;
    });
}

let promise1 = new Promise ((resolve, reject)=>{
    let options = {
        url: 'http://localhost:3000/washingtonpost/list',
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
let promise2 = new Promise ((resolve, reject)=>{
    let options = {
        url: 'http://localhost:3000/washingtonpost/list',
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

function imgFix(){
    return new Promise((resolve,reject)=>{
        let searchEngineID ='';
        let bucketName = '';
        let query = 'SELECT article.id, article.title, news.news, article.main_img FROM article INNER JOIN news ON article.news_id = news.id WHERE main_img = "undefined"';
        mysql.conPool.getConnection((err,con)=>{
            con.query(query,(err,result)=>{
                con.release();
                if(err){
                    reject(err);
                }
                let getImageDone = 0;
                for (let i=0; i<result.length; i++){ // 這邊有 for 迴圈
                    let id = result[i].id;
                    let title = urlencode(result[i].title);
                    let news = result[i].news;
                    switch (news){
                        case 'The Washington Post':
                            searchEngineID = '008667877701191877032:9_eru87ihcm';
                            bucketName = 'washingtonpost';
                            break;
                        case 'New York Times':
                            searchEngineID = '008667877701191877032:uii5fpjhork';
                            bucketName = 'nytimes';
                            break;
                        case 'INDEPENDENT':
                            searchEngineID = '008667877701191877032:cigpkhicrdi';
                            bucketName = 'independent';
                            break;
                        default:
                            searchEngineID = '008667877701191877032:5oxntezhrrw'; // search google, reuters and associated press.
                            bucketName = 'miscellaneous';

                    }
                    let url = 'https://www.googleapis.com/customsearch/v1?key='+credentials.myGoogleSearchAPIKey+'&cx='+searchEngineID+'&searchType=image'+'&q='+title;
                    let options = {
                        url: url,
                        method: 'GET'
                    }
                    request(options, function(error, response, body){
                        if (error || !body) {
                            return;
                        }
                        let googleImg = JSON.parse(body).items[0].link;
                        uploadImgToS3(googleImg,bucketName, Date.now().toString(),(main_img)=>{
                            con.query(`UPDATE article SET main_img = "${main_img}" WHERE id = ${id}`, function(err,result){
                                getImageDone++;
                                console.log('getImageDone '+getImageDone);
                                if (err){ 
                                    reject(err);
                                    return;
                                }
                                let articleCache = 'article_'+id;
                                client.del(articleCache,()=>{
                                    if (getImageDone == result.length){
                                        resolve('ok');     
                                    }
                                })
                            })
                        })
                    })
                }
            })
        })
    })
}

let calSimilarArticle = function(){
    return new Promise((resolve,reject)=>{
        mysql.conPool.query('SELECT id, context FROM article WHERE context != ""', (err,result)=>{
            let articleList = [];
            
            result.forEach(function(article){
                articleList.push(Object.assign({id: article.id, text: article.context}));
            });
        
            let corpus = calCorpusTF(articleList,dimensionN);    
            let similarResult = findSimilarArticle(articleList,corpus,3);
            
            let done = 0;
            for(let i = 0; i<similarResult.length; i++){
                let similarJSON = JSON.stringify(similarResult[i].similar);
                mysql.conPool.query(`UPDATE article SET similar_article = '${similarJSON}' WHERE id = ${similarResult[i].id}`,(err,result)=>{
                    done ++;
                    console.log('calSimilarAritlce'+done);
                    if (err){
                        reject(err);
                    }
                    if(done == similarResult.length){
                        console.log('Done');
                        resolve('ok');
                    }
                })
            }
        })
    })
}

function calCorpusTF(allArticle, dimensionN){
    // allArticle 是所有文章的 array
    let corpus='';
    allArticle.forEach(function(item){
        corpus += item.text;
    })
    corpus = corpus.replace(/<p>/g,'').replace(/<\/p>/g,' ');
    let tfidf = new TfIdf();
    let corpusTF={};
    tfidf.addDocument(corpus);
    tfidf.listTerms(0).forEach(function(item){
        corpusTF[item.term] = item.tfidf;
    })
    let corpusSorted = Object.keys(corpusTF).sort(function(a,b){return corpusTF[b]-corpusTF[a]}).slice(0,dimensionN); // corpus 的 top 50 word Freq array
    return corpusSorted;
}

function calWordVector (targetArticle_i, allArticle, corpusTF, dimensionN){
    // content 放進目標文字、corpusTF 放入所有文章總和的字頻 array
    // let textFeed = content.replace(/<p>/g,'').replace(/<\/p>/g,' ');
    let tfIDF = new TfIdf();

    // tfIDF.addDocument(textFeed);
    for(let j=0; j<allArticle.length;j++){
        tfIDF.addDocument(allArticle[j].text.replace(/<p>/g,'').replace(/<\/p>/g,' '));
    }

    let articleFreq = {};
    tfIDF.listTerms(targetArticle_i).forEach(function(item){
        articleFreq[item.term] = item.tfidf;
    })
    // 將文章的字頻依照分數排列，取前 n 個排進 array 中
    let tfSorted = Object.keys(articleFreq).sort(function(a,b){return articleFreq[b]-articleFreq[a]}).slice(0,dimensionN);
    let wordVector = [];
    for (let i=0; i< tfSorted.length ; i++){
        let termIndex = corpusTF.indexOf(tfSorted[i]);
        // check if exist in corpus freq
        if (termIndex == -1){
            wordVector.push(0);
        }
        // 將頻率當作距離也考慮進去，因為只算夾角的話，如果朝同一個向量方向遠離，夾角不變但歐幾里德距離增加，不太合理
        if (termIndex !== -1){
            wordVector.push(articleFreq[tfSorted[i]]);
        }
    }
    return wordVector;
}

// 算 cos theta similarity
function sqrtOfSumSq (array){
    let sumSquare = 0;
    for (let i=0; i< array.length;i++){
        sumSquare += Math.pow(array[i],2);
    }
    return Math.sqrt(sumSquare);
}

// cos theta 越接近 1 代表夾角越接近 0 度，也代表兩個向量的越相似
function cosDistance (arr1,arr2){
    let sumOfArrayMultiply = 0; 
    for (let i =0; i< arr1.length;i++){
        sumOfArrayMultiply += arr1[i]*arr2[i]; 
    }
    return sumOfArrayMultiply/(sqrtOfSumSq(arr1)*sqrtOfSumSq(arr2));
}

// 找到最相近的三篇文章 (return 回 media id, article id, 篇數)
function findSimilarArticle (allArticle, corpusTF, returnN){
    // allArticle 參數應要 array，含有每篇 article 的 obj 其中至少有 article_id 和 content 兩個 property
    // 計算每篇文章的 vector 存回 obj 裡
    for(let i=0; i < allArticle.length;i++){
        let targetVector = calWordVector(i,allArticle,corpusTF,dimensionN);
        allArticle[i].vector = targetVector;
    }
    // vector 間逐一計算餘弦相似度
    for(let j=0; j<allArticle.length;j++){
        let cosDistObj = {};
        for (let k=0;k<allArticle.length;k++){
            let cosD = cosDistance(allArticle[j].vector,allArticle[k].vector);
            cosDistObj[allArticle[k].id] = cosD;
        }
        // 排序後拿回前三個分數的 id 
        let result = Object.keys(cosDistObj).sort(function(a,b){return cosDistObj[b]-cosDistObj[a]}).slice(1,returnN+1); // 因為第一篇會是自己
        allArticle[j].similar = result;
    }
    return allArticle;
}


let articleTranslator = function(){
    return new Promise((resolve,reject)=>{
        mysql.conPool.getConnection((err,connection)=>{
            if(err){
                reject(err);
            }
            mysql.conPool.query('SELECT * FROM article WHERE context_zhtw IS NULL', async (err,result)=>{
                connection.release();
                if(err){
                    reject(err);
                }
                try{
                    let done = 0;
                    for(let i=0; i<result.length;i++){
                        let article = result[i];
                        let translatedTitle = await translate.translate(article.title, translateTarget);
                        if (article.subtitle !== 'null' && article.subtitle !== null){
                            let translatedSubtitle = await translate.translate(article.subtitle, translateTarget);
                            article.subtitle = translatedSubtitle[0];
                        }
                        let translatedabstract = await translate.translate(article.abstract, translateTarget);
                        let translatedContext = await translate.translate(article.context, translateTarget);
                        let oneRow = {
                            title_zhtw: translatedTitle[0],
                            subtitle_zhtw: article.subtitle,
                            abstract_zhtw: translatedabstract[0],
                            context_zhtw: translatedContext[0]
                        }
                        connection.query(`UPDATE article SET ? WHERE id = ${article.id}`, oneRow, (err,result)=>{
                            done ++;
                            if(err){
                                reject(err);
                            }
                            console.log(article.id+ ' done');
                            if(done===result.length){
                                resolve('ok');
                            }
                        })
                    }
                }    
                catch(e){
                    throw e;
                }
            })
        })
    })
}

let tagTranslator = function(){
    return new Promise((resolve,reject)=>{
        mysql.conPool.getConnection((err,connection)=>{
            if(err){
                reject(err);
            }
            mysql.conPool.query('SELECT * FROM tag WHERE tag_zhtw IS NULL', (err, tobeTranslated)=>{
                connection.release();
                if(err){
                    reject(err);
                }
                try{
                    let done = 0;
                    for (let i=0; i<tobeTranslated.length;i++){
                        let tagID = tobeTranslated[i].id;
                        let enTag = tobeTranslated[i].tag;
                        connection.query('SELECT id, tag_zhtw FROM tag WHERE tag = ?', enTag, async (err,result)=>{
                            let zhTag = result[0].tag_zhtw;
                            if(zhTag == null){
                                let translatedTag = await translate.translate(enTag, translateTarget);
                                connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [translatedTag[0], tagID], (err,result)=>{
                                    done ++;
                                    if(err){
                                        reject(err);
                                    }
                                    console.log(tagID + ' done by google translation');
                                    if(done===tobeTranslated.length){
                                        resolve('ok');
                                    }
                                })
                            }
                            else{
                                connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [zhTag, tagID],(err,result)=>{
                                    done++;
                                    if(err){
                                        reject(err);
                                    }
                                    console.log(tagID + ' updated by exist dictionary.');
                                    if(done===tobeTranslated.length){
                                        resolve('ok');
                                    }
                                })
                            }
                        })
                    }
                }    
                catch(e){
                    console.log(e);
                    reject(e);
                }
            })
        })
    })
}


async function schedule(){
    try{
        let promiseall111 = await Promise.all([promise1, promise2]);
        console.log(promiseall111);
        console.log('promise all ok');
        let imgFixer = await imgFix();
        console.log(imgFixer);
        console.log('img fix ok');
        await calSimilarArticle();
        // then(()=>{
        //     articleTranslator();
        // }).then(()=>{
        //     tagTranslator();
        // });
        console.log('all done');
    }
    catch(error){
        console.log(error);
        console.log(imgFixer);
    }
}

schedule();
