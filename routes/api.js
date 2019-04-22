const express = require('express');
const router  = express.Router();
const mysql   = require('../util/mysql.js');
const myLib   = require('../util/config.js');
const redis   = require('redis');
const client  = redis.createClient();
const cacheExpireTime = 60 * 60 * 24; // EX unit: sec
// const newsDB = {
//     aljazeera:'Aljazeera',
//     bbc: 'BBC',
//     cnn: 'CNN',
//     economist: 'The Economist',
//     guardian: 'The Guardian',
//     independent: 'INDEPEDENT',
//     nytimes: 'NY Times',
//     quartz: 'QUARTZ',
//     washingtonpost: 'The Washington Post'
// }

router.get('/showindex',(req,res)=>{
    let page = parseInt(req.query.page);
    if (!Number.isInteger(page)){
        page = 1;
    }
    let getAllArticle = '';
    let newsCounter = 0;
    for (let i = 0; i < Object.keys(newsDB).length; i++){
        newsCounter ++;
        if (newsCounter == Object.keys(newsDB).length){
            getAllArticle += `SELECT id, url, source, unixtime, main_img, title, abstract, context FROM ${Object.keys(newsDB)[i]}`;
        }
        else{
            getAllArticle += `SELECT id, url, source, unixtime, main_img, title, abstract, context FROM ${Object.keys(newsDB)[i]}` + ' UNION ';
        }
    }
    mysql.conPool.query(getAllArticle+' ORDER BY unixtime DESC LIMIT 150',function(error, result){
        if (error){
            throw error;
        }
        result = result.filter(function(obj){
            return obj.context !== '' && obj.title !== null;
        })
        res.send(result.slice((page-1)*10,page*10));
    })
    // (async function(){
    //     await getArticleByNewsName('aljazeera', allArticleList);
    //     await getArticleByNewsName('bbc', allArticleList);
    //     await getArticleByNewsName('cnn', allArticleList);
    //     await getArticleByNewsName('economist', allArticleList);
    //     await getArticleByNewsName('guardian', allArticleList);
    //     await getArticleByNewsName('indepedent', allArticleList);
    //     await getArticleByNewsName('nytimes', allArticleList);
        
    //     res.send(allArticleList);
    // })();
})

// router.get('/article_old_ver',(req,res)=>{
//     let source = '';
//     let {id} = req.query;
//     for (let name in newsDB){
//         if(req.query.source == newsDB[name]){
//             source = name;
//         }
//     }
//     let getArticle = `SELECT * FROM ${source} WHERE id = ${id}`;
//     mysql.conPool.query(getArticle,function(error,result){
//         res.send(result);
//     })
// })

router.get('/article',(req,res)=>{
    // client.flushdb();
    let {id} = req.query;
    let viewCountCache = 'view_count_'+id;
    client.incr(viewCountCache,()=>{ // view count + 1, if the article has not been viewed yet, redis generates a key and inits the value = 0
        let articleCache = 'article_'+id;
        client.get(articleCache, function(err, reply){
            if (reply){
                client.get(viewCountCache,(err,viewedCount)=>{
                    let cacheReply = JSON.parse(reply);
                    let originCount = parseInt(cacheReply[0].viewed_count);
                    cacheReply[0].viewed_count = originCount + parseInt(viewedCount);
                    // console.log(cacheReply[0].viewed_count);
                    res.send(JSON.stringify(cacheReply));
                })
            }
            else{
                let getArticle = `SELECT * FROM article INNER JOIN news ON article.news_id = news.id WHERE article.id = ${id}`;
                mysql.conPool.getConnection((err,con)=>{
                    con.query(getArticle,(err,article)=>{
                        con.release();
                        if (err) {
                            myLib.log(err);
                        }
                        let similarArticle = JSON.parse(article[0].similar_article);
                        let getArticle = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count FROM article INNER JOIN news ON article.news_id = news.id ';
                        let articleID = `WHERE article.id = ${similarArticle[0]} OR article.id = ${similarArticle[1]} OR article.id = ${similarArticle[2]}`;
                        con.query(getArticle+articleID,(err,similarResult)=>{
                            if(err){
                                myLib.log(err);
                            }
                            article[0].similar_article = similarResult; // similar article 的 view Count 也要加上 cache 的數字
                            client.get(viewCountCache,(err,viewedCount)=>{
                                article[0].viewed_count += parseInt(viewedCount);
                                client.set(articleCache, JSON.stringify(article), 'EX', cacheExpireTime);
                                res.send(JSON.stringify(article));
                            })  
                        })
                    })
                })
            }
        })
    });
})

router.get('/migration',(req,res)=>{
    let paging = parseInt(req.query.page);
    let pageLimit = 10;
    let sort = req.query.sort;
    let orderBy = '';
    let offset = (paging-1) * pageLimit;
    let limiter = ` LIMIT ${offset}, ${pageLimit}`;
    let filter  = ' WHERE title !== "null" AND context !== "null"';
    if (!Number.isInteger(paging)){
        paging = 1;
    }
    switch(sort){
        case 'date':
            orderBy = ' ORDER BY unixtime DESC';
            break;
        case 'most_viewed':
            orderBy = ' ORDER BY viewed_count DESC';
    }
    let getIndexArticle = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count FROM article INNER JOIN news ON article.news_id = news.id';
    
    mysql.conPool.query(getIndexArticle+' ORDER BY unixtime DESC LIMIT 150',function(error, result){
        if (error){
            throw error;
        }
        result = result.filter(function(obj){
            return obj.context !== '' && obj.title !== null;
        })
        console.log(result);

        res.send(result.slice((paging-1)*10,paging*10));
    })
})

router.get('/update/redis/count/to/sql',(req,res)=>{
    client.keys('view_count*',(err,reply)=>{
        let updated = 0; 
        for(let i=0;i<reply.length;i++){
            let countKey = reply[i];
            let cachedID = parseInt(reply[i].replace('view_count_',''));
            client.getset(countKey,"0",(err,reply)=>{ // 改成 SETGET
                mysql.conPool.query(`UPDATE article SET viewed_count = viewed_count + ${reply} WHERE id = ${cachedID}`,(err,result)=>{
                    updated ++;
                    if(err){
                        myLib.log(err);
                    }
                    if(updated===reply.length){
                        res.send({success:'redis count update to mysql.'});
                    }
                })
            })
        }
    })
})

module.exports = router;