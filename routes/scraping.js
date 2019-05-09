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

router.get('/send/email/if/error', (req,res) =>{
    mysql.conPool.query('SELECT * FROM DoesNotExist',function(error,result){
        if(error){
            myLib.log(error);
            res.end();
            return;
        }
        res.end();
    })
})
// Aljazeera, news_id = 1, api list contains img
router.get('/aljazeera/list',(req,res)=>{
    let options = {
        url: "https://sapi.aljazeera.net/apiservicesearch/index.aspx?format=mobile&contenttemplate=aje-azure-searchnoprocess&site=search&parentguid=Taiwan&offset=0&page_size=10&filter=ContentType%20eq%20%27Author%20Profile%27%20or%20ContentType%20eq%20%27Blog%20Post%27%20or%20ContentType%20eq%20%27Feature%27%20or%20ContentType%20eq%20%27Infographic%27%20or%20ContentType%20eq%20%27News%27%20or%20ContentType%20eq%20%27Opinion%27%20or%20ContentType%20eq%20%27Picture%20Gallery%27%20or%20ContentType%20eq%20%27Programme%20Episode%27&type=nosort",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let apiList = JSON.parse(body).value;
        let articleArray =[];
        let fetched = 0;
        for (let i=0 ; i < apiList.length ; i++){
            if (apiList[i].ContentType == "News"){
                let url = 'https://www.aljazeera.com/'+ apiList[i].URL;
                let main_img = 'https://www.aljazeera.com/' + apiList[i].Image; 
                let title = apiList[i].Title;
                let subtitle = apiList[i].Description;
                let author = apiList[i].Authors;
                let src_datetime = apiList[i].LastModifiedDate;
                let unixtime = Date.parse(src_datetime);
                if (url.search('video') == -1){
                    uploadImgToS3(main_img,'aljazeera', Date.now().toString(),(main_img)=>{
                        articleArray.push((Object.assign({url, main_img, title, subtitle, author, src_datetime, unixtime})));
                        fetched++;
                        if(fetched == apiList.length){
                            dao.addToDB(articleArray,0,1,'url').then((x)=>{
                                // res.send('OK');
                                res.redirect('/aljazeera/article');
                            }).catch((error)=>{
                                myLib.log(error);
                            });
                        }
                    })
                }
                else{
                    fetched++;
                }
            }
            else{
                fetched++; // 因為要把 content type 不是 news 的也算進去
            }
        }
    }) // End of request
})
router.get('/aljazeera/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 1', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
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
                    if (article[i].context === ''){
                        request(options, function(error, response, body){
                            if (error || !body) {
                                myLib.log(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let paragraph = $('.main-container .article-p-wrapper').children();
                            let context = '';
                            let content = {};
                            let pureText = '';
                            for (let j = 0; j < paragraph.length; j++){                             
                                if(paragraph.get(j).tagName == 'p'){
                                    let p = paragraph.eq(j).text();
                                    let propertyName = j+'_p';
                                    context += '<p>' + p + '</p>';
                                    pureText += p;
                                }
                                else if (paragraph.get(j).tagName == 'h2'){
                                    let h2 = paragraph.eq(j).text();
                                    let propertyName = j+'_h2';
                                    context += '<h2>' + h2 + '</h2>';
                                }                                            
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");

                            con.query(`UPDATE article SET context = "${context}", abstract = "${abstract}" WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    myLib.log(err);
                                    return;
                                }
                                // 沒有抓到 context 的話連上一個 query 都不會做，有 context 的話就能分析出 tag ，再把 tag 寫入
                                else{
                                    dao.addTag(article[i].id, tagArray)
                                    .then(()=>{
                                        if (fetched === article.length){
                                            res.send('aljazeera has new article');
                                            return;
                                        }
                                    })
                                    .catch((error)=>{
                                        myLib.log(error);
                                    })
                                }    
                            })
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('aljazeera up-to-date');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// BBC, news_id = 2
router.get('/bbc/list',(req,res)=>{
    let options = {
        url: "https://www.bbc.co.uk/search?q=taiwan&filter=news",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let $ = cheerio.load(body);
        let container = $('#search-content').find('.search-results');
        let urlList = container.find('.rs_touch');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let url = urlList.eq(i).attr('href');
            if (url.search('gallery') == -1 && url.search('video') == -1){
                articleArray.push((Object.assign({url})));
            }
        }
        dao.addToDB(articleArray,0,2,'url').then((x)=>{
            // res.send('OK');
            res.redirect('/bbc/article');
        }).catch((error)=>{
            myLib.log(error);
        });
    }) // End of request
})
router.get('/bbc/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 2', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
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
                                myLib.log(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let storyBody = $('#page .story-body');
                            let title = storyBody.find('h1').text();
                            let author = storyBody.find('.byline .byline__name').text();
                            let unixtime = storyBody.find('.mini-info-list .date').attr('data-seconds')*1000;
                            let paragraph = storyBody.find('.story-body__inner p');
                            let main_img = storyBody.find('.story-body__inner img').attr('src');
                            let pureText = '';
                            let context = '';
                            let content = {};
                            for (let j = 0; j < paragraph.length; j++){                               
                                let p = paragraph.eq(j).text();
                                let propertyName = j+'_p';
                                context += '<p>' + p + '</p>';
                                content[propertyName] = p.replace(/"/g,'\\"').replace(/'/g,"\\'");
                                pureText += p;       
                            }

                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");

                            uploadImgToS3(main_img,'bbc', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET 
                                              title = "${title}",
                                              author = "${author}",
                                              unixtime = ${unixtime},
                                              context = "${context}",
                                              abstract = "${abstract}",
                                              main_img = "${main_img}"
                                       WHERE id = ${article[i].id}`, function(err){
                                    fetched++;
                                    if (err){ 
                                        myLib.log(err);
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('bbc has new article');
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            })
                        })
                    } 
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('BBC up-to-date');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})


// CNN: news_id = 3
router.get('/cnn/list',(req,res)=>{
    let options = {
        url: "https://search.api.cnn.io/content?q=taiwan&size=10",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let apiList = JSON.parse(body).result;
        let articleArray =[];
        let fetched = 0;
        for (let i=0 ; i < apiList.length ; i++){
            let url = apiList[i].url;
            let main_img = apiList[i].thumbnail; 
            let title = apiList[i].headline;
            let author = apiList[i].byLine;
            let src_datetime = apiList[i].lastModifiedDate;
            let unixtime = Date.parse(src_datetime);
            uploadImgToS3(main_img,'cnn', Date.now().toString(),(main_img)=>{
                articleArray.push((Object.assign({url, main_img, title, author, src_datetime, unixtime})));
                fetched++;
                if(fetched == apiList.length){
                    dao.addToDB(articleArray,0,3,'url').then(()=>{
                        res.redirect('/cnn/article');
                    }).catch((error)=>{
                        myLib.log(error);
                    });
                }
            })
        }
    }) // End of request
})
router.get('/cnn/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 3 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            if(article.length===0){
                res.send('CNN up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    request(options, function(error, response, body){   
                        if (error || !body) {
                            myLib.log(error);
                            return;
                        }
                        let $ = cheerio.load(body);
                        let paragraph = $('article > .l-container > .pg-rail-tall__wrapper').find('.zn-body__paragraph'); // 這個 class 底下有直接是文字的，也有 h3 tag 的 
                        let pureText = '';
                        let content = {};
                        let context = '';
                        for (let j = 0; j < paragraph.length; j++){                               
                            let p = paragraph.eq(j).text();
                            let propertyName = j+'_p';
                            context += '<p>' + p + '</p>';
                            content[propertyName]= p;
                            pureText += p;               
                        }
                        context = context.replace(/"/g,'\\"').replace(/'/g,"\\'"); //
                    
                        if(context===''){
                            let deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
                            con.query(deleteNull,function(error){
                                fetched++;
                                if(error){
                                    myLib.log(error);
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('cnn has new article but cannot scrape');
                                    return;
                                }
                            })
                        }
                        else{
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            con.query(`UPDATE article SET context = "${context}", abstract = "${abstract}" WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){ 
                                    myLib.log(err);
                                    return;
                                }
                                else{
                                    dao.addTag(article[i].id, tagArray)
                                    .then(()=>{
                                        if (fetched === article.length){
                                            res.send('cnn has new article');
                                            return;
                                        }
                                    })
                                    .catch((error)=>{
                                        myLib.log(error);
                                    })
                                }
                            })
                        }
                    })
                } // End of for loop
            }
        }) // End of query
    })
})

// The Economist: news_id = 4 (require to subscribe or login) need filter out the /topic/taiwan url
router.get('/economist/list', (req, res) => {
    let url= "https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=013751040265774567329:ylv-hrexwbc&start=0";
    (async()=>{
        try{
            let browser = await puppeteer.launch();
            let page = await browser.newPage();
            await page.goto(url);
            let html = await page.content();
            let $ = cheerio.load(html);
            let resultArea = $('.gsc-expansionArea');
            let webResult = resultArea.find('.gsc-webResult');
            let articleArray = [];
            for (let i = 0; i < webResult.length ; i++){
                let url = webResult.eq(i).find('a').attr('data-ctorig');
                if(url !=="https://www.economist.com/topics/taiwan"){
                    articleArray.push(Object.assign({url}));
                }
            }
            await dao.addToDB(articleArray,0,4,'url'); // 用 url 判斷會有重複，但是 request 的來源抓不到完整的 title
            await browser.close();
            res.redirect('/economist/article');
        }
        catch(error){
            myLib.log(error);
            res.end();
        }
    })();
})
router.get('/economist/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 4', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
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
                                myLib.log(error);
                                return;
                            }
                            let $ = cheerio.load(body);
                            let divMain = $('.main-content__clearfix ');
                            let title = divMain.find('h1').find('.flytitle-and-title__title').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let subtitle = divMain.find('article').find('.blog-post__rubric').text();
                            let author = divMain.find('article').find('.blog-post__inner').find('.blog-post__asideable-wrapper').find('.blog-post__byline-container').find('.blog-post__byline').text();
                            let datetime = divMain.find('article').find('.blog-post__inner').find('time').attr('datetime');
                            let unixtime = Date.parse(datetime);
                            let main_img = divMain.find('article').find('.blog-post__inner').find('.component-image img').attr('src');
                            let paragraph = divMain.find('article').find('.blog-post__inner .blog-post__text p');
                            let pureText = '';
                            let context = '';
                            for (let j = 0; j < paragraph.length; j++){                             
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';
                                pureText += p;                      
                            }
                            context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            uploadImgToS3(main_img,'economist', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET 
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              abstract = "${abstract}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime},
                                              main_img = "${main_img}" 
                                       WHERE id = ${article[i].id}`, function(err){
                                    fetched++;
                                    if (err){                                        
                                        myLib.log(err);
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('Economist has new article');
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            })
                        })
                    }
                    else{
                        fetched++;
                        if (fetched === article.length){
                            res.send('Economist up-to-date');
                            return;
                        }
                    }
                } // End of for loop
            }
        }) // End of query
    })
})

// The guardian: news_id = 5
router.get('/guardian/list',(req,res)=>{
    let options = {
        url: "https://www.theguardian.com/world/taiwan",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let $ = cheerio.load(body);
        let div = $('.fc-item__container .fc-item__content ');
        let urlList = div.find('a');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let url = urlList.eq(i).attr('href');
            if (url.search('gallery')==-1 && url.search('video')==-1){
                articleArray.push((Object.assign({url})));
            }
        }
        dao.addToDB(articleArray,0,5,'url').then((x)=>{
            // res.send('OK');
            res.redirect('/guardian/article');
        }).catch((error)=>{
            myLib.log(error);
        });
    }) // End of request
})
router.get('/guardian/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 5 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            if(article.length===0){
                res.send('Guardian up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    request(options, function(error, response, body){
                        if (error || !body) {
                            myLib.log(error);
                            return;
                        }
                        let $ = cheerio.load(body);
                        let divMain = $('article .content__main');
                        let title = divMain.find('h1').text().replace(/"/g,'\\"').replace(/'/g,"\\'");
                        let subtitle = divMain.find('.content__standfirst').text();
                        let author = divMain.find('.content__meta-container').find('.meta__contact-wrap .byline').text();
                        let datetime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('datetime');
                        let unixtime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('data-timestamp');
                        let main_img = divMain.find('.content__main-column').find('figure picture img').attr('src');
                        let paragraph = divMain.find('.content__article-body p');
                        let context = '';
                        let pureText = '';
                        for (let j = 0; j < paragraph.length; j++){                             
                            let p = paragraph.eq(j).text();
                            context += '<p>' + p + '</p>';
                            pureText += p;                      
                        }
                        context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                        if( context===''|| title ==='' || unixtime === undefined ){
                            let deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
                            con.query(deleteNull,function(error){
                                fetched++;
                                if(error){
                                    myLib.log(error);
                                    return;
                                }
                                if(fetched===article.length){
                                    res.send('Guardian has new article but scrape nothing');
                                    return;
                                }
                            })
                        }
                        else{
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            uploadImgToS3(main_img,'guardian', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}" 
                                        WHERE id = ${article[i].id}`, function(err){
                                    fetched++;
                                    if (err){
                                        myLib.log(err);
                                        // res.send({err:'Database query error. here'+i});
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('Guardian has new article');
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            })
                        }
                    })
                } // End of for loop
            }
        }) // End of query
    })
})

// Independent UK: news_id = 6;
router.get('/independent/list', (req, res) => {
    let url= "https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=006663403660930254993:oxhge2zf1ro&start=0";
    (async()=>{
        try{
            let browser = await puppeteer.launch();
            let page = await browser.newPage();
            await page.goto(url);
            let html = await page.content();
            let $ = cheerio.load(html);
            let resultArea = $('.gsc-expansionArea');
            let articleArray = [];
            for (let i=0; i<resultArea.find('.gs-per-result-labels').length;i++){
                let url = resultArea.find('.gs-per-result-labels').eq(i).attr('url');
                if(url!=="https://www.independent.co.uk/topic/Taiwan"){
                    articleArray.push(Object.assign({url}));
                }
            }
            await dao.addToDB(articleArray,0,6,'url');
            await browser.close();
            res.redirect('/independent/article');
        }
        catch(error){
            myLib.log(error);
            res.end();
        }
    })();
});
router.get('/independent/article', (req, res) => {
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 6 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            console.log('article.length');
            if(article.length===0){
                res.send('Independent up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    request(options, function(error, response, body){                    
                        if (error || !body) {
                            myLib.log(err);
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
                        let main_img = topContainerWrapper.find('.hero-wrapper figure amp-img').attr('src');
                        let paragraph = $('.main-wrapper').find('.body-content').children();
                        let context = '';
                        let pureText = '';
                        for (let j = 0; j < paragraph.length; j++){
                            if(paragraph.get(j).tagName == 'p'){
                                let p = paragraph.eq(j).text();
                                context += '<p>' + p + '</p>';
                                pureText += p;
                            }
                            if(paragraph.get(j).tagName == 'hr'){
                                break;
                            }
                        }
                        context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                        if( pureText===''|| title ===''){
                            let deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
                            con.query(deleteNull,function(error){
                                fetched ++;
                                if(error){
                                    myLib.log(error);
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('Independent has new article but cannot get content');
                                    return;
                                }
                            })
                        }
                        else{
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            uploadImgToS3(main_img,'independent', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}" 
                                    WHERE id = ${article[i].id}`, function(err){
                                    fetched++;
                                    if (err){
                                        myLib.log(err);
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('Independent has new article');
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            });
                        }
                        
                    })
                } // end of for loop
            }
        }) // End of query
    })
})

// New York Times: news_id = 7;
router.get('/nytimes/list',(req,res)=>{
    let options = {
        url:"https://www.nytimes.com/search?query=Taiwan&sort=newest",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let $ = cheerio.load(body);
        let container = $('.css-46b038 ol');
        let searchResult = container.find('.css-1l4w6pd');
        let articleArray = [];
        for (let i = 0; i < searchResult.length ; i++){
            let url = 'https://www.nytimes.com' + searchResult.eq(i).find('a').attr('href');
            let title = searchResult.eq(i).find('a').find('.css-1lppelv').text();
            articleArray.push(Object.assign({url, title}));
        }
        dao.addToDB(articleArray,0,7,'title').then((x)=>{
            // res.send('OK');
            res.redirect('/nytimes/article');
        }).catch((error)=>{
            myLib.log(error);
        });
    }) // End of request
})
router.get('/nytimes/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 7 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            if(article.length===0){
                res.send('NY Times up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    request(options, function(error, response, body){
                        if (error || !body) {
                            myLib.log(error);
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
                        let pureText = '';
                        for (let j = 0; j < storyBody.length; j++){
                            let paragraph = storyBody.eq(j).find('p');
                            for (let k = 0; k < paragraph.length; k++){
                                let p = paragraph.eq(k).text();
                                context += '<p>' + p + '</p>';
                                pureText += p;
                            }                                 
                        }
                        context = context.replace(/"/g,'\\"').replace(/'/g,"\\'");
                        if( context===''|| title ==='' || src_datetime === undefined ){
                            let deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
                            con.query(deleteNull,function(error){
                                fetched++;
                                if(error){
                                    myLib.log(error);
                                    return;
                                }
                                if (fetched === article.length){
                                    res.send('NY times has new article but cannot get content'); 
                                    return;
                                }
                            })
                        }
                        else{
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            uploadImgToS3(main_img,'nytimes', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET title = "${title}",
                                                                main_img = "${main_img}",
                                                                abstract = "${abstract}",
                                                                author = "${author}",
                                                                src_datetime = "${src_datetime}",
                                                                unixtime = ${unixtime},
                                                                context = "${context}" WHERE id = ${article[i].id}`, function(err,result){
                                    fetched++;
                                    if (err){ // The format of articles before 2011 is different!!
                                        myLib.log(err);
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('nytimes has new article'); // here report cannot set headers again
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            })
                        }
                    })
                } // End of for loop
            }
        }) // End of query
    })
})

// QUARTZ: news_id = 8
router.get('/quartz/list',(req,res)=>{
    let options = {
        url: "https://qz.com/search/taiwan/",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let $ = cheerio.load(body);
        let urlList = $('._5ff1a');
        let articleArray = [];
        for (let i =0; i < urlList.length; i++){
            let url = 'https://qz.com' + urlList.eq(i).attr('href');
            articleArray.push((Object.assign({url})));
        }
        dao.addToDB(articleArray,0,8,'url').then((x)=>{
            res.redirect('/quartz/article');
        }).catch((error)=>{
            myLib.log(error);
        });
    }) // End of request
})
router.get('/quartz/article', (req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 8 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            if(article.length===0){
                res.send('QUARTZ up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
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
                        if(context===''|| title ===''){
                            let deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
                            con.query(deleteNull,function(error){
                                fetched++;
                                if(error){
                                    myLib.log(error);
                                    return;
                                }
                                if(fetched===article.length){
                                    res.send('QUARTZ has new article but scrape nothing');
                                    return;
                                }
                            })
                        }
                        else{
                            let tagArray = textMining.tagGen(article[i].id, pureText);
                            let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                            uploadImgToS3(main_img,'quartz', Date.now().toString(),(main_img)=>{
                                con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}"
                                    WHERE id = ${article[i].id}`, function(err){
                                    fetched++;
                                    if (err){
                                        myLib.log(err);
                                        return;
                                    }
                                    else{
                                        dao.addTag(article[i].id, tagArray)
                                        .then(()=>{
                                            if (fetched === article.length){
                                                res.send('QUARTZ has new article');
                                                return;
                                            }
                                        })
                                        .catch((error)=>{
                                            myLib.log(error);
                                        })
                                    }
                                })
                            }); 
                        }                   
                    })
                } // End of for loop
            }
        }) // End of query
    })
})

// The Washington Post: news_id = 9
router.get('/washingtonpost/list', (req, res) => {
    let options = {
        url: "https://sitesearchapp.washingtonpost.com/sitesearch-api/v2/search.json?count=20&query=taiwan&sort=relevance",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            myLib.log(error);
            return;
        }
        let articleList = JSON.parse(body).results.documents;
        let articleArray = [];
        for ( let i = 0 ; i < articleList.length ; i ++ ){
            if (articleList[i].contenttype === 'Article' && articleList[i].primarysection !== 'Weather'){
                let title  = articleList[i].headline;
                title = title.replace(/"/g,'\"').replace(/'/g,"\'");
                let subtitle = articleList[i].blurb;
                if (subtitle !== undefined){
                    subtitle = subtitle.replace(/"/g,'\"').replace(/'/g,"\'");
                }
                let author = articleList[i].byline;
                let src_datetime = articleList[i].pubdatetime;
                let unixtime = articleList[i].pubdatetime;
                let url = articleList[i].contenturl;
                articleArray.push(
                    Object.assign({title, subtitle, author, src_datetime, unixtime, url})
                );
            }
        } // End of for loop

        dao.addToDB(articleArray,0,9,'title').then((x)=>{
            res.redirect('/washingtonpost/article');
        }).catch((error)=>{
            myLib.log(error);
        });
    }) // End of request
})
router.get('/washingtonpost/article',(req,res)=>{
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT id, context, url FROM article WHERE news_id = 9 AND context IS NULL', function(err, article){
            con.release();
            if(err){
                myLib.log(err);
                res.send({err:'Database query error.'});
                return;
            }
            if(article.length===0){
                res.send('WP up-to-date');
                return;
            }
            else{
                let fetched = 0;
                for (let i = 0 ; i < article.length; i++){
                    let options = {
                        url: article[i].url,
                        method: "GET"
                    }
                    request(options, function(error, response, body){
                        if (error || !body) {
                            myLib.log(error);
                            return;
                        }
                        let $ = cheerio.load(body);
                        let main_img = $('#article-body article .inline-photo').find('img').attr('src');
                        let paragraph = $('article').children();
                        let context = '';
                        let pureText = '';
                        for (let j = 0; j < paragraph.length; j++){
                            if(paragraph.get(j).tagName == 'p'){
                                let p = paragraph.eq(j).text();
                                if(p.startsWith('Read more')){
                                    break;
                                }
                                else{
                                    context += '<p>' + p + '</p>';
                                    pureText += p;
                                }
                            }
                            else if(paragraph.get(j).tagName == 'h3'){
                                let h3 = paragraph.eq(j).text();
                                context += '<h3>' + h3 + '</h3>';
                            }
                            
                            // else if(paragraph.get(j).tagName == 'div'){
                            //     if(paragraph.eq(j).find('img').length > 0){
                            //         let src = paragraph.eq(j).find('img').attr('src');
                            //         console.log(src);
                            //         console.log(j);
                            //         context += `<img src="${src}">`;
                            //     }
                            // }
                        }
                        context = context.replace(/"/g,'\\"').replace(/'/g,"\\'"); 
                        let tagArray = textMining.tagGen(article[i].id, pureText);
                        let abstract = textMining.abstractGen(pureText).replace(/"/g,'\\"').replace(/'/g,"\\'");
                        uploadImgToS3(main_img,'washingtonpost', Date.now().toString(),(main_img)=>{
                            con.query(`UPDATE article SET main_img = "${main_img}", abstract = "${abstract}", context = "${context}" WHERE id = ${article[i].id}`, function(err,result){
                                fetched++;
                                if (err){
                                    myLib.log(err);
                                    return;
                                }
                                else{
                                    dao.addTag(article[i].id, tagArray)
                                    .then(()=>{
                                        if (fetched === article.length){
                                            res.send('WP has new article');
                                            return;
                                        }
                                    })
                                    .catch((error)=>{
                                        myLib.log(error);
                                    })
                                }
                            })
                        })
                    })
                } // End of for loop
            }
        }) // End of query
    })
})

module.exports = router;