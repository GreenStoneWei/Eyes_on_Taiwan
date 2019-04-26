const mysql   = require('../util/mysql.js');
const request = require('request');
const redis   = require('redis');
const client  = redis.createClient();
const urlencode = require('urlencode');
const uploadImgToS3 = require('../controllers/s3.js');
const credentials = require('../util/credentials.js')

let searchEngineID ='';
let bucketName = '';
// let washingtonpostID = '008667877701191877032:9_eru87ihcm';
// let indepentID = '008667877701191877032:cigpkhicrdi';
// let nytimesID ='008667877701191877032:uii5fpjhork';

let query = 'SELECT article.id, article.title, news.news, article.main_img FROM article INNER JOIN news ON article.news_id = news.id WHERE main_img = "undefined"';
mysql.conPool.getConnection((err,con)=>{
    con.query(query,(err,result)=>{
        con.release();
        if(err){
            throw err;
        }
        let getImageDone = 0;
        for (let i=0; i<result.length; i++){
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
                        if (err){ 
                            myLib.log(err);
                            return;
                        }
                        let articleCache = 'article_'+id;
                        client.del(articleCache,()=>{
                            if (getImageDone == result.length){
                                console.log('ok');     
                            }
                        })
                    })
                })
            })
        }
    })
})
