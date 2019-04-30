const express = require('express');
const router  = express.Router();
const mysql   = require('../util/mysql.js');
const myLib   = require('../util/config.js');
const redis   = require('redis');
const client  = redis.createClient();
const cacheExpireTime = 60 * 60 * 24; // EX unit: sec, this equals 1 day.

// router.get('/showindex',(req,res)=>{
//     let page = parseInt(req.query.page);
//     if (!Number.isInteger(page)){
//         page = 1;
//     }
//     let getAllArticle = '';
//     let newsCounter = 0;
//     for (let i = 0; i < Object.keys(newsDB).length; i++){
//         newsCounter ++;
//         if (newsCounter == Object.keys(newsDB).length){
//             getAllArticle += `SELECT id, url, source, unixtime, main_img, title, abstract, context FROM ${Object.keys(newsDB)[i]}`;
//         }
//         else{
//             getAllArticle += `SELECT id, url, source, unixtime, main_img, title, abstract, context FROM ${Object.keys(newsDB)[i]}` + ' UNION ';
//         }
//     }
//     mysql.conPool.query(getAllArticle+' ORDER BY unixtime DESC LIMIT 150',function(error, result){
//         if (error){
//             throw error;
//         }
//         result = result.filter(function(obj){
//             return obj.context !== '' && obj.title !== null;
//         })
//         res.send(result.slice((page-1)*10,page*10));
//     })
// })



router.get('/article',(req,res)=>{
    // client.flushdb();
    let id = parseInt(req.query.id);
    if (!Number.isInteger(id)){
        res.send({error:"Invalid article ID"});
        return;
    }
    let viewCountCache = 'view_count_'+id;
    client.incr(viewCountCache,()=>{ // view count + 1, if the article has not been viewed yet, redis generates a key and sets the value = 0
        let articleCache = 'article_'+id;
        client.get(articleCache, function(err, reply){
            if (reply){
                // 更新 cache 中 similar article count
                let cacheReply = JSON.parse(reply);

                let cacheSimilar = cacheReply[0].similar_article;

                let similarCountAdded = 0;
                for (let i=0;i<cacheSimilar.length;i++){
                    // console.log(cacheSimilar[i].id);
                    let cachekey = 'view_count_'+cacheSimilar[i].id;
                    client.get(cachekey,(err,cacheCount)=>{
                        similarCountAdded ++;
                        if(cacheCount == null){ // cacheCount 出來的計數會是字串，沒有的話是 null
                            cacheCount = 0;
                        }
                        cacheSimilar[i].viewed_count += parseInt(cacheCount);
                        if(similarCountAdded==cacheSimilar.length){
                            client.get(viewCountCache,(err,cacheCount)=>{
                                let originCount = parseInt(cacheReply[0].viewed_count);
                                cacheReply[0].viewed_count = originCount + parseInt(cacheCount);
                                res.send(JSON.stringify(cacheReply));
                            })
                        }
                    })
                }
            }
            else{
                let getArticle = `SELECT * FROM article INNER JOIN news ON article.news_id = news.id WHERE article.id = ${id}`;
                mysql.conPool.getConnection((err,con)=>{
                    con.query(getArticle,(err,article)=>{
                        con.release();
                        if (err) {
                            myLib.log(err);
                            return;
                        }
                        if (article.length===0){
                            res.send({error:"Article does not exist."});
                            return;
                        }
                        let similarArticle = JSON.parse(article[0].similar_article);
                        let getArticle = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count FROM article INNER JOIN news ON article.news_id = news.id ';
                        let articleID = `WHERE article.id = ${similarArticle[0]} OR article.id = ${similarArticle[1]} OR article.id = ${similarArticle[2]}`;
                        con.query(getArticle+articleID,(err,similarResult)=>{
                            // 在更新文章後還沒有算出 similar article 前會出錯 cannot read property 0 of undefined.
                            if(err){
                                myLib.log(err);
                                return;
                            }
                            // similar article 的 view Count 也要加上 cache 的數字
                            let similarCountAdded = 0;
                            for(let i=0;i<similarResult.length;i++){
                                let similarArticleID = similarResult[i].id;
                                let cacheKey = 'view_count_'+similarArticleID;
                                client.get(cacheKey,(err,cacheCount)=>{
                                    similarCountAdded++;
                                    if(cacheCount == null){
                                        cacheCount=0;
                                    }
                                    similarResult[i].viewed_count += parseInt(cacheCount);

                                    if(similarCountAdded===similarResult.length){
                                        // 把更新的 similar result 塞回 article 中
                                        article[0].similar_article = similarResult; 
                                        client.get(viewCountCache,(err,viewedCount)=>{
                                            article[0].viewed_count += parseInt(viewedCount);
                                            client.set(articleCache, JSON.stringify(article), 'EX', cacheExpireTime);
                                            res.send(JSON.stringify(article));
                                        })  
                                    }
                                })
                            }
                        })
                    })
                })
            }
        })
    });
})

router.get('/index',(req,res)=>{
    let paging = parseInt(req.query.page);
    if (!Number.isInteger(paging)){
        paging = 1;
    }
    let pageLimit = 9;
    let sort = req.query.sort;
    let tag  = req.query.tag;
    let orderBy = '';
    let offset  = (paging-1) * pageLimit;
    let limiter = ` LIMIT ${offset}, ${pageLimit}`;
    let filter  = '';
    let getColumn = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count';
    let selectFromJoin = '';
    switch(tag){
        case 'null': 
            selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id';
            filter = ` WHERE title != "null" AND context != "null" AND context != "" `;
            break;
        default:
            selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id INNER JOIN tag ON article.id = tag.article_id';
            filter = ` WHERE title != "null" AND context != "null" AND context != "" AND tag = "${tag}"`;
    }
    switch(sort){
        case 'date':
            orderBy = ' ORDER BY unixtime DESC';
            break;
        case 'most_viewed':
            orderBy = ' ORDER BY viewed_count DESC';
            break;
        default:
            orderBy = ' ORDER BY unixtime DESC';
    }
    mysql.conPool.getConnection((err,con)=>{
        con.query('SELECT count(*) AS count'+selectFromJoin+filter+orderBy,(err,count)=>{
            con.release();
            let totalArticleCount = count[0].count*1; // *1 to convert into int
            let totalPage = Math.ceil(totalArticleCount/pageLimit);
            con.query(getColumn+selectFromJoin+filter+orderBy+limiter,function(error, result){
                if (error){
                    throw error;
                }
                // add viewed count in cached. another solution is making the caching addition in another route. Front-end calls 2 api. 
                let added = 0;
                for(let i=0;i<result.length;i++){
                    let viewCountCache = 'view_count_'+ result[i].id;
                    client.get(viewCountCache,(err,cacheCount)=>{ 
                        added++;
                        // 處理 cachecount = null 的情況
                        if(cacheCount==null){
                            cacheCount=0;
                        }
                        result[i].viewed_count += parseInt(cacheCount);
                        if (added===result.length){
                            res.send(JSON.stringify({totalPage: totalPage, data: result}));
                        }
                    })
                }
            })
        })
    })
    
})

router.get('/card/tags',(req,res)=>{
    let id = parseInt(req.query.id);
    mysql.conPool.query(`SELECT t1.tag FROM tag AS t1 INNER JOIN article AS t2 ON t1.article_id = t2.id WHERE t2.id = ${id} LIMIT 5`, (err, tag)=>{
        if (err){
           myLib.log(err);
           return; 
        }
        let tagArray = [];
        for(let i = 0; i < tag.length; i++){
            tagArray.push(tag[i].tag);
        }
        res.send(JSON.stringify(tagArray));
    })
})

router.get('/word/cloud',(req,res)=>{
    let tag = req.query.tag;
    mysql.conPool.query('SELECT count(tag) AS count , tag FROM newscraping.tag GROUP BY tag ORDER BY count DESC limit 50', (err, result)=>{
        let cloudList = [];
        let score = [];
        result.forEach(element => {
            let eachTag = [element.tag, getBaseLog(1.5,element.count)];
            score.push(element.count);
            cloudList.push(eachTag);
        });
        res.send(JSON.stringify(cloudList));
    })
})
function getBaseLog(x, y){
    return Math.log(y) / Math.log(x);
}

router.get('/rediscount2sql',(req,res)=>{
    client.keys('view_count*',(err,reply)=>{
        let updated = 0; 
        for(let i=0;i<reply.length;i++){
            let countKey = reply[i];
            let cachedID = parseInt(reply[i].replace('view_count_',''));
            client.getset(countKey,"0",(err,reply)=>{
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