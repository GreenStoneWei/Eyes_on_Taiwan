const express = require('express');
const router  = express.Router();
const mysql   = require('../../util/mysql.js');
const myLib   = require('../../util/config.js');

router.get('/view/article',(req,res)=>{
    let id = parseInt(req.query.id);
    if (!Number.isInteger(id)){
        res.send({error:"Invalid article ID"});
        return;
    }
    let getArticle = `SELECT id, url, title, abstract, main_img FROM article WHERE id = ${id}`;
    mysql.conPool.getConnection((err,con)=>{
        con.query(getArticle,(err,result)=>{
            con.release();
            if (err) {
                myLib.log(err);
                return;
            }
            if (result.length===0){
                res.send({error:"Article does not exist."});
                return;
            }
            result[0].url = myLib.hostName+'/view/article?id='+result[0].id;
            if(result[0].abstract.length>150){
                result[0].abstract = result[0].abstract.substring(0,147)+'...';
            };
            res.render('article.ejs',{article: result[0]});               
        })
    })
})

module.exports = router;