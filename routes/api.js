const express = require('express');
const router  = express.Router();
const mysql   = require('../util/mysql.js');
const newsDB = {
    aljazeera:'Aljazeera',
    bbc: 'BBC',
    cnn: 'CNN',
    economist: 'The Economist',
    guardian: 'The Guardian',
    independent: 'INDEPEDENT',
    nytimes: 'NY Times',
    quartz: 'QUARTZ',
    washingtonpost: 'The Washington Post'
}

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

router.get('/article',(req,res)=>{
    let source = '';
    let {id} = req.query;
    for (let name in newsDB){
        if(req.query.source == newsDB[name]){
            source = name;
        }
    }
    let getArticle = `SELECT * FROM ${source} WHERE id = ${id}`;
    mysql.conPool.query(getArticle,function(error,result){
        res.send(result);
    })
})

router.get('/migration',(req,res)=>{
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
})
module.exports = router;