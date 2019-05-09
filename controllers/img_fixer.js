const mysql   = require('../util/mysql.js');
const request = require('request');
const urlencode = require('urlencode');
const uploadImgToS3 = require('../controllers/s3.js');
const credentials = require('../util/credentials.js')

function imgFix(){
    return new Promise((resolve,reject)=>{
        let searchEngineID ='';
        let bucketName = '';
        let query = 'SELECT article.id, article.title, news.news, article.main_img FROM article INNER JOIN news ON article.news_id = news.id WHERE main_img = "undefined"';
        mysql.conPool.getConnection((err,con)=>{
            con.query(query,(err,imgToBeFixed)=>{
                console.log(imgToBeFixed.length+' img to fix');
                con.release();
                if(err){
                    reject(err);
                    return;
                }
                if(imgToBeFixed.length ===0){
                    resolve('ok');
                    return;
                }
                let getImageDone = 0;
                for (let i=0; i<imgToBeFixed.length; i++){ // 這邊有 for 迴圈
                    let id = imgToBeFixed[i].id;
                    let title = urlencode(imgToBeFixed[i].title);
                    let news = imgToBeFixed[i].news;
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
                            con.query(`UPDATE article SET main_img = "${main_img}" WHERE id = ${id}`, function(err){
                                getImageDone++;
                                console.log('getImageDone '+getImageDone);
                                if (err){ 
                                    reject(err);
                                    return;
                                }
                                if (getImageDone === imgToBeFixed.length){
                                    resolve('ok');     
                                }
                            })
                        })
                    })
                }
            })
        })
    })
}

module.exports = imgFix;