const express = require('express');
const router  = express.Router();
const mysql   = require('../util/mysql.js');
const dao     = require('../dao/db.js');
const request = require("request");
const cheerio = require("cheerio");
const myLib   = require('../util/config.js');
const puppeteer = require('puppeteer');
const textMining    = require('../util/abstract.js');
const uploadImgToS3 = require('../controllers/s3.js');

let options = {
    url: 'https://qz.com/1480126/taiwan-can-legalize-gay-marriage-with-another-law-post-referendum/',
    method: "GET"
}

request(options, function(error, response, body){
    if (error || !body) {
        myLib.log(error);
        return;
    }
    let $ = cheerio.load(body);
    let divMain = $('#main');
    let title = divMain.find('h1').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
    let subtitle = null;
    let author = divMain.find('._5e088').find('a').text();
    let datetime = divMain.find('._5e088').find('time').attr('datetime');
    let unixtime = Date.parse(datetime);
    let main_img = divMain.find('article ._83471 img').attr('src');
    let paragraph = divMain.find('._61c55 .quartz');
    let pureText = '';
    let context = '';
    for (let j = 0; j < paragraph.length; j++){
        if(paragraph.get(j).tagName == 'p'){
            let p = paragraph.eq(j).text();
            context += '<p>' + p + '</p>';
            pureText += p;
        }
        else if (paragraph.get(j).tagName == 'h2'){
            let h2 = paragraph.eq(j).text();
            context += '<h2>' + h2 + '</h2>';
        }                           
    }
    context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
    console.log('bbb'+context);

    // let tagArray = textMining.tagGen(article[i].id, pureText);
    // let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
    // uploadImgToS3(main_img,'quartz', Date.now().toString(),(main_img)=>{
    //     con.query(`UPDATE article SET  
    //                     title = "${title}",
    //                     subtitle = "${subtitle}",
    //                     abstract = "${abstract}",
    //                     author = "${author}", 
    //                     context = "${context}",
    //                     src_datetime = '${datetime}', 
    //                     unixtime = ${unixtime},
    //                     main_img = "${main_img}"
    //             WHERE id = ${article[i].id}`, function(err,result){
    //         fetched++;
    //         if (err){
    //             myLib.log(err);
    //             // res.send({err:'Database query error. here'+i});
    //             return;
    //         }
    //         else{
    //             dao.addTag(article[i].id, tagArray)
    //             .then((result)=>{
    //                 if (fetched === article.length){
    //                     res.send('ok');
    //                     return;
    //                 }
    //             })
    //             .catch((error)=>{
    //                 myLib.log(error);
    //             })
    //         }
    //     })
    // });                            
})
