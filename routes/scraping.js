const express = require('express');
const router  = express.Router();
const mysql   = require('../util/mysql.js');
const request = require("request");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream( __dirname + '/../errorlog/error.log', {flags : 'a'});
const logStdOut = process.stdout; // log to console as normal.
const now = new Date().toLocaleString('en-US',{timeZone: 'Asia/Taipei'});
const nodemailer = require('nodemailer');
const credential = require('../util/credentials.js');
const amsS3 = 'https://s3.amazonaws.com/wheatxstone/news';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: credential.gmail.user,
        pass: credential.gmail.pass,
    }
});


const consoleFile = function(d){
    logFile.write('---start---'+'\n'+now + '\n' + util.format(d) + '\n' + '----end----'+'\n');
    logStdOut.write('---start---'+'\n'+now + '\n' + util.format(d) + '\n' + '----end----'+'\n'); // log to console as normal.
    let mailOptions = {
        from: credential.gmail.user,
        to: credential.gmail.user,
        subject: 'Eyes on Taiwan: Errors happen!',
        text: `${d}`,
      };
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        }
        else {
            console.log('Email sent: ', info.response);
        }
    });
}
const aws = require('aws-sdk');
const s3 = new aws.S3();



  router.get('/upload/test',(req,res)=>{
    let options = {
        url: 'https://www.geek.com/wp-content/uploads/2018/07/amazon-625x352.jpg',
        encoding: null
    }
    request(options, function(error, response, body) {
        if (error || response.statusCode !== 200) { 
            console.log("failed to get image");
            console.log(error);
        } else {
            s3.putObject({
                Body: body,
                Key: 'test',
                Bucket: 'wheatxstone/news',
                ACL: 'public-read'
            }, function(error, data) { 
                if (error) {
                    console.log("error downloading image to s3");
                } else {
                    console.log("success uploading to s3");
                }
            }); 
        }   
    });
})


router.get('/console/test', (req,res) =>{
    mysql.conPool.query('SELECT * FROM xxx',function(error,result){
        if(error){
            consoleFile(error);
            return;
        }
        res.end();
    })
})

// Washington Post
router.get('/washingtonpost/list', (req, res) => {
    let options = {
        url: "https://sitesearchapp.washingtonpost.com/sitesearch-api/v2/search.json?count=20&query=taiwan&sort=relevance",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let articleList = JSON.parse(body).results.documents;
        let articleArray = [];
        for ( let i = 0 ; i < articleList.length ; i ++ ){
            if (articleList[i].contenttype === 'Article' && articleList[i].primarysection !== 'Weather'){
                let title  = articleList[i].headline;
                title = title.replace(/"/g,'\"').replace(/'/g,"\'");
                let subtitle = articleList[i].blurb;
                subtitle = subtitle.replace(/"/g,'\"').replace(/'/g,"\'");
                let author = articleList[i].byline;
                let src_datetime = articleList[i].pubdatetime;
                let unixtime = articleList[i].pubdatetime;
                let url = articleList[i].contenturl;
                articleArray.push(
                    Object.assign({title, subtitle, author, src_datetime, unixtime, url})
                );
            }
        } // End of for loop
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'})
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM washingtonpost WHERE title = "${array[j].title}"`; // Must to use double quote because there are signle quotes in titles
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'})
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO washingtonpost SET ?`;
                            let oneRow = {
                                url: array[j].url,
                                source: 'The Washington Post',
                                category: array[j].category,
                                title: array[j].title,
                                subtitle: array[j].subtitle, 
                                abstract: null,
                                author: array[j].author, 
                                src_datetime: array[j].src_datetime, 
                                unixtime: array[j].unixtime,
                                context: null,
                                translate: null,
                                tag: null,
                                main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/washingtonpost/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/washingtonpost/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})

router.get('/washingtonpost/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM washingtonpost', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let main_img = $('#article-body article .inline-photo').find('img').attr('src');
                            let paragraph = $('article').children();
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){
                                if(paragraph.get(j).tagName == 'p'){
                                    let p = paragraph.eq(j).text();
                                    if(p.startsWith('Read more')){
                                        break;
                                    }
                                    else{
                                        context += '<p>' + p + '</p>';
                                    }
                                }
                                else if(paragraph.get(j).tagName == 'h3'){
                                    let h3 = paragraph.eq(j).text();
                                    context += '<h3>' + h3 + '</h3>';
                                }
                                
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");        
                            con.query(`UPDATE washingtonpost SET main_img = "${main_img}", context = "${context}" WHERE id = ${article[i].id}`, function(err,result){
                                if (err){
                                    fetched++;
                                    consoleFile(err);
                                    // res.send({err:'Database query error.'});
                                    return;
                                }
                                fetched++;
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    }
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// Independent UK
router.get('/independent/list', (req, res) => {
    let url= "https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=006663403660930254993:oxhge2zf1ro&start=0";
    puppeteer.launch()
            .then(function(browser){
                return browser.newPage();
            })
            .then(function(page){
                return page.goto(url).then(function(){
                    return page.content();
                });
            })
            .then(function(html){
                let $ = cheerio.load(html);
                let resultArea = $('.gsc-expansionArea');
                let list = [];
                for (let i=0; i<resultArea.find('.gs-per-result-labels').length;i++){
                    let source = 'INDEPEDENT';
                    let url = resultArea.find('.gs-per-result-labels').eq(i).attr('url');
                    if(url!=="https://www.independent.co.uk/topic/Taiwan"){
                        list.push(Object.assign({source, url}));
                    }
                }
                function idinsert(array, j){ // this function should recompose in DAO.
                    if (j < array.length){
                        mysql.conPool.getConnection((err,con)=>{
                            if (err){
                                consoleFile(err);
                                res.send({err:'Database query error.'})
                                return;
                            }
                            let checkIfTitleExist = `SELECT * FROM independent WHERE url = "${array[j].url}"`; // Must to use double quote because there are signle quotes in titles
                            con.query(checkIfTitleExist, function(err, rows){
                                con.release();
                                if (err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'})
                                    return;
                                }
                                if (rows.length === 0){
                                    let insertNewURL = `INSERT INTO independent SET ?`;
                                    let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].pubDatetime, 
                                        unixtime: array[j].pubDatetime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                                    }
                                    con.query(insertNewURL, oneRow, function(err, result, fields){
                                        if(err){
                                            consoleFile(err);
                                            res.send({err:'Database query error.'});
                                            return;
                                        }
                                        if (j==array.length-1){
                                            res.redirect('/independent/article');
                                            return;
                                        }
                                        else{
                                            idinsert(array,j+1);
                                        }
                                    })
                                }
                                else{
                                    if (j==array.length-1){
                                        res.redirect('/independent/article');
                                        return;
                                    }
                                    else{
                                        idinsert(array,j+1);
                                    }
                                }
                            })
                        })
                    }
                }
                idinsert(list,0);
            })
            .catch(function(error){
                consoleFile(error);
                res.end();
            })
})

router.get('/independent/article', (req, res) => {
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM independent', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            
                            if (error || !body) {
                                consoleFile(err);
                                res.end();
                                return;
                            }
                            let $ = cheerio.load(body);
                            let topContainerWrapper = $('#top-container-wrapper');
                            let title = topContainerWrapper.find('h1').text();
                            title = title.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let subtitle = topContainerWrapper.find('h2').text();
                            subtitle = subtitle.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let meta = topContainerWrapper.find('.meta');
                            let author = meta.find('.author').find('a').attr('title');
                            let datetime = meta.find('.publish-date').find('amp-timeago').attr('datetime');
                            let unixtime = Date.parse(datetime);
                            let paragraph = $('.main-wrapper').find('.body-content').children();
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){
                                if(paragraph.get(j).tagName == 'p'){
                                    let p = paragraph.eq(j).text();
                                    context += '<p>' + p + '</p>';
                                }
                                if(paragraph.get(j).tagName == 'hr'){
                                    break;
                                }
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE independent SET  
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime} 
                                       WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    consoleFile(err);
                                    // res.send({err:'Database query error. here'+i});
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    }
                    else{
                        fetched++;
                        // console.log('fetched '+i);
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// QUARTZ (static html. LOVE YOU!!)
router.get('/quartz/list',(req,res)=>{
    let options = {
        url: "https://qz.com/search/taiwan/",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let $ = cheerio.load(body);
        let urlList = $('._5ff1a');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let source = 'QUARTZ';
            let url = 'https://qz.com' + urlList.eq(i).attr('href');
            articleArray.push((Object.assign({source, url})));
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'})
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM quartz WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'});
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO quartz SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].pubDatetime, 
                                        unixtime: array[j].pubDatetime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    console.log('schedule test QUARTZ');
                                    res.redirect('/quartz/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/quartz/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})

router.get('/quartz/article', (req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM quartz', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let divMain = $('#main');
                            let title = divMain.find('h1').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let subtitle = null;
                            let author = divMain.find('._5e088').find('a').text();
                            let datetime = divMain.find('._5e088').find('time').attr('datetime');
                            let unixtime = Date.parse(datetime);
                            let paragraph = divMain.find('._61c55').children();
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){
                                if(paragraph.get(j).tagName == 'p'){
                                    let p = paragraph.eq(j).text();
                                    context += '<p>' + p + '</p>';
                                }
                                else if (paragraph.get(j).tagName == 'h2'){
                                    let h2 = paragraph.eq(j).text();
                                    context += '<h2>' + h2 + '</h2>';
                                }                           
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE quartz SET  
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime} 
                                       WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    consoleFile(err);
                                    // res.send({err:'Database query error. here'+i});
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    }
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// The Economist (require to subscribe or login) need filter out the /topic/taiwan url
router.get('/economist/list', (req, res) => {
    let url= "https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=013751040265774567329:ylv-hrexwbc&start=0";
    puppeteer.launch()
            .then(function(browser){
                return browser.newPage();
            })
            .then(function(page){
                return page.goto(url).then(function(){
                    return page.content();
                });
            })
            .then(function(html){
                let $ = cheerio.load(html);
                let resultArea = $('.gsc-expansionArea');
                let webResult = resultArea.find('.gsc-webResult');
                let articleArray = [];
                for (let i = 0; i < webResult.length ; i++){
                    let source = 'The Economist';
                    let url = webResult.eq(i).find('a').attr('data-ctorig');
                    if(url !=="https://www.economist.com/topics/taiwan"){
                        articleArray.push(Object.assign({source, url}));
                    }
                }
                // console.log(articleArray);
                function insert(array, j){ // this function should recompose in DAO.
                    if (j < array.length){
                        mysql.conPool.getConnection((err,con)=>{
                            if (err){
                                consoleFile(err);
                                res.send({err:'Database query error.'})
                                return;
                            }
                            let checkIfTitleExist = `SELECT * FROM economist WHERE url = "${array[j].url}"`; // Must to use double quote because there are signle quotes in titles
                            con.query(checkIfTitleExist, function(err, rows){
                                con.release();
                                if (err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'})
                                    return;
                                }
                                if (rows.length === 0){
                                    let insertNewURL = `INSERT INTO economist SET ?`;
                                    let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].src_datetime, 
                                        unixtime: array[j].unixtime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                                    }
                                    con.query(insertNewURL, oneRow, function(err, result, fields){
                                        if(err){
                                            consoleFile(err);
                                            res.send({err:'Database query error.'});
                                            return;
                                        }
                                        if (j==array.length-1){
                                            res.redirect('/economist/article');
                                            return;
                                        }
                                        else{
                                            insert(array,j+1);
                                        }
                                    })
                                }
                                else{
                                    if (j==array.length-1){
                                        res.redirect('/economist/article');
                                        return;
                                    }
                                    else{
                                        insert(array,j+1);
                                    }
                                }
                            })
                        })
                    }
                }
                insert(articleArray,0);
            })
            .catch(function(error){
                consoleFile(error);
                res.end();
            })
})

router.get('/economist/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM economist', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let divMain = $('.main-content__clearfix ');
                            let title = divMain.find('h1').find('.flytitle-and-title__title').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let subtitle = divMain.find('article').find('.blog-post__rubric').text();
                            let author = divMain.find('article').find('.blog-post__inner').find('.blog-post__asideable-wrapper').find('.blog-post__byline-container').find('.blog-post__byline').text();
                            let datetime = divMain.find('article').find('.blog-post__inner').find('time').attr('datetime');
                            let unixtime = Date.parse(datetime);
                            let paragraph = divMain.find('article').find('.blog-post__inner .blog-post__text p');
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                             
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';                      
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE economist SET  
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime} 
                                       WHERE id = ${article[i].id}`, function(err,result){
                                if (err){
                                    fetched++;
                                    consoleFile(err);
                                    // res.send({err:'Database query error. here'+i});
                                    return;
                                }
                                fetched++;
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    }
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// The guardian
router.get('/guardian/list',(req,res)=>{
    let options = {
        url: "https://www.theguardian.com/world/taiwan",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let $ = cheerio.load(body);
        let div = $('.fc-item__container .fc-item__content ');
        let urlList = div.find('a');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let source = 'The Guardian';
            let url = urlList.eq(i).attr('href');
            if (url.search('gallery')==-1 && url.search('video')==-1){
                articleArray.push((Object.assign({source, url})));
            }
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'})
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM guardian WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'})
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO guardian SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].pubDatetime, 
                                        unixtime: array[j].pubDatetime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/guardian/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/guardian/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})

router.get('/guardian/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM guardian', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let divMain = $('article .content__main');
                            let title = divMain.find('h1').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let subtitle = divMain.find('.content__standfirst').text();
                            let author = divMain.find('.content__meta-container').find('.meta__contact-wrap .byline').text();
                            let datetime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('datetime');
                            let unixtime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('data-timestamp');
                            let paragraph = divMain.find('.content__article-body p');
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                             
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';                      
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE guardian SET  
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime} 
                                       WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    consoleFile(err);
                                    // res.send({err:'Database query error. here'+i});
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    }
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// aljazeera
router.get('/aljazeera/list',(req,res)=>{
    let options = {
        url: "https://sapi.aljazeera.net/apiservicesearch/index.aspx?format=mobile&contenttemplate=aje-azure-searchnoprocess&site=search&parentguid=Taiwan&offset=0&page_size=30&filter=ContentType%20eq%20%27Author%20Profile%27%20or%20ContentType%20eq%20%27Blog%20Post%27%20or%20ContentType%20eq%20%27Feature%27%20or%20ContentType%20eq%20%27Infographic%27%20or%20ContentType%20eq%20%27News%27%20or%20ContentType%20eq%20%27Opinion%27%20or%20ContentType%20eq%20%27Picture%20Gallery%27%20or%20ContentType%20eq%20%27Programme%20Episode%27&type=nosort",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let apiList = JSON.parse(body).value;
        let articleArray =[];
        for (let i=0 ; i < apiList.length ; i++){
            if (apiList[i].ContentType == "News"){
                let url = 'https://www.aljazeera.com/'+ apiList[i].URL;
                let source = 'Aljazeera';
                let main_img = 'https://www.aljazeera.com/' + apiList[i].Image; 
                let title = apiList[i].Title;
                let subtitle = apiList[i].Description;
                let author = apiList[i].Authors;
                let src_datetime = apiList[i].LastModifiedDate;
                let unixtime = Date.parse(src_datetime);
                articleArray.push((Object.assign({url, source, main_img, title, subtitle, author, src_datetime, unixtime})));
            }
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'});
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM aljazeera WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'})
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO aljazeera SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        main_img: array[j].main_img,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].src_datetime, 
                                        unixtime: array[j].unixtime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/aljazeera/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/aljazeera/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})

router.get('/aljazeera/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM aljazeera', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let paragraph = $('.main-container .article-p-wrapper').children();
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                             
                                if(paragraph.get(j).tagName == 'p'){
                                    let p = paragraph.eq(j).text();
                                    context += '<p>' + p + '</p>';
                                }
                                else if (paragraph.get(j).tagName == 'h2'){
                                    let h2 = paragraph.eq(j).text();
                                    context += '<h2>' + h2 + '</h2>';
                                }                                            
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE aljazeera SET  
                                              context = "${context}"
                                       WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    consoleFile(err);
                                    // res.send({err:'Database query error. here'+i});
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// NY times
router.get('/nytimes/list',(req,res)=>{
    let options = {
        url: "https://www.nytimes.com/search?query=Taiwan&sort=best",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let $ = cheerio.load(body);
        let container = $('.css-46b038 ol');
        let searchResult = container.find('.css-1l4w6pd');
        let articleArray = [];
        for (let i = 0; i < searchResult.length ; i++){
            let url = 'https://www.nytimes.com' + searchResult.eq(i).find('a').attr('href');
            let source = 'NY Times';
            articleArray.push(Object.assign({url, source}));
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'})
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM nytimes WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'})
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO nytimes SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,                                      
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].src_datetime, 
                                        unixtime: array[j].unixtime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/nytimes/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/nytimes/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})
router.get('/nytimes/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM nytimes', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let header = $('article').find('header');
                            let title = header.find('.css-1vkm6nb h1').text();
                            let main_img = header.find('.css-79elbk').find('img').attr('src');
                            let author = header.find('.css-xt80pu p').text().replace('By','');
                            let src_datetime = header.find('.css-xt80pu time').attr('datetime');
                            let unixtime = Date.parse(src_datetime);
                            let storyBody = $('article').find('section .StoryBodyCompanionColumn');
                            let context = '';
                            for (let j = 0; j < storyBody.length; j++){
                                let paragraph = storyBody.eq(j).find('p');
                                for (let k = 0; k < paragraph.length; k++){
                                    let p = paragraph.eq(k).text();
                                    context += '<p>' + p + '</p>';
                                }                                 
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            if( context===''|| title ==='' || src_datetime === undefined ){
                                let deleteNull = `DELETE FROM nytimes WHERE id = ${article[i].id}`;
                                con.query(deleteNull,function(error,result){
                                    if(error){
                                        consoleFile(error);
                                        return;
                                    }
                                })
                            }
                            else{
                                con.query(`UPDATE nytimes SET 
                                              title = "${title}",
                                              main_img = "${main_img}",
                                              author = "${author}",
                                              src_datetime = "${src_datetime}",
                                              unixtime = ${unixtime},
                                              context = "${context}"
                                       WHERE id = ${article[i].id}`, function(err,result){
                                    fetched++;
                                    if (err){ // The format of articles before 2011 is different!!
                                        consoleFile(err);
                                        return;
                                    }
                                    if (fetched === article.length){
                                        res.send('ok');
                                        return;
                                    }
                                })
                            }
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// CNN
router.get('/cnn/list',(req,res)=>{
    let options = {
        url: "https://search.api.cnn.io/content?q=taiwan&size=20",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let apiList = JSON.parse(body).result;
        let articleArray =[];
        for (let i=0 ; i < apiList.length ; i++){
            let url = apiList[i].url;
            let source = 'CNN';
            let main_img = apiList[i].thumbnail; 
            let title = apiList[i].headline;
            let author = apiList[i].byLine;
            let src_datetime = apiList[i].lastModifiedDate;
            let unixtime = Date.parse(src_datetime);
            // let imgToS3 ={
            //     url: main_img,
            //     encoding: null
            // }
            // request(imgToS3,function(error,response,body){
            //     if(error||response.statusCode !== 200){
            //         consoleFile(error);
            //     }
            //     else{

            //     }
            // })
            articleArray.push((Object.assign({url, source, main_img, title, author, src_datetime, unixtime})));
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'});
                        return;
                    }
                    let checkIfTitleExist = `SELECT * FROM cnn WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'});
                            return;
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO cnn SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].src_datetime, 
                                        unixtime: array[j].unixtime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/cnn/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/cnn/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})
router.get('/cnn/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM cnn', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){   
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let paragraph = $('article > .l-container > .pg-rail-tall__wrapper').find('.zn-body__paragraph');
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                               
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';                
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE cnn SET 
                                              context = "${context}"
                                       WHERE id = ${article[i].id}`, function(err,result){
                                if (err){ 
                                    fetched++;
                                    consoleFile(err);
                                    // res.send({err:`Database query error at ${i}`});
                                    return;
                                }
                                fetched++;
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// BBC
router.get('/bbc/list',(req,res)=>{
    let options = {
        url: "https://www.bbc.co.uk/search?q=taiwan&filter=news",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            consoleFile(error);
            return;
        }
        let $ = cheerio.load(body);
        let container = $('#search-content').find('.search-results');
        let urlList = container.find('.rs_touch');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let source = 'BBC';
            let url = urlList.eq(i).attr('href');
            if (url.search('gallery')==-1 && url.search('video')==-1){
                articleArray.push((Object.assign({source, url})));
            }
        }
        function insert(array, j){ // this function should recompose in DAO.
            if (j < array.length){
                mysql.conPool.getConnection((err,con)=>{
                    if (err){
                        consoleFile(err);
                        res.send({err:'Database query error.'});
                    }
                    let checkIfTitleExist = `SELECT * FROM bbc WHERE url = "${array[j].url}"`;
                    con.query(checkIfTitleExist, function(err, rows){
                        con.release();
                        if (err){
                            consoleFile(err);
                            res.send({err:'Database query error.'})
                        }
                        if (rows.length === 0){
                            let insertNewURL = `INSERT INTO bbc SET ?`;
                            let oneRow = {
                                        url: array[j].url,
                                        source: array[j].source,
                                        category: array[j].category,
                                        title: array[j].title,
                                        subtitle: array[j].subtitle, 
                                        abstract: array[j].abstract,
                                        author: array[j].author, 
                                        src_datetime: array[j].src_datetime, 
                                        unixtime: array[j].unixtime,
                                        context: array[j].context,
                                        translate: array[j].translate,
                                        tag: array[j].tag,
                                        main_img: array[j].main_img
                            }
                            con.query(insertNewURL, oneRow, function(err, result, fields){
                                if(err){
                                    consoleFile(err);
                                    res.send({err:'Database query error.'});
                                    return;
                                }
                                if (j===array.length-1){
                                    res.redirect('/bbc/article');
                                    return;
                                }
                                else{
                                    insert(array,j+1);
                                }
                            })
                        }
                        else{
                            if (j===array.length-1){
                                res.redirect('/bbc/article');
                                return;
                            }
                            else{
                                insert(array,j+1);
                            }
                        }
                    })
                })
            }
        }
        insert(articleArray,0);
    }) // End of request
})
router.get('/bbc/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM bbc', function(err, article){
            con.release();
            if(err){
                consoleFile(err);
                res.send({err:'Database query error.'});
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    if (article[i].context === null){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                consoleFile(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let storyBody = $('#page .story-body');
                            let title = storyBody.find('h1').text();
                            let author = storyBody.find('.byline .byline__name').text();
                            let unixtime = storyBody.find('.mini-info-list .date').attr('data-seconds')*1000;
                            let paragraph = storyBody.find('.story-body__inner p');
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                               
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';                
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE bbc SET 
                                              title = "${title}",
                                              author = "${author}",
                                              unixtime = ${unixtime},
                                              context = "${context}"
                                       WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){ 
                                    consoleFile(err);
                                    // res.send({err:`Database query error at ${i}`});
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('ok');
                                    return;
                                }
                            })
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('All fetched');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

module.exports = router;