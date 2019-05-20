const express = require('express');
const router = express.Router();
const mysql = require('../../util/mysql.js');
const myLib = require('../../util/config.js');

router.get('/view/article', (req, res)=>{
	const id = parseInt(req.query.id);
	if (!Number.isInteger(id)) {
		res.render('error_page.ejs', {error: 'Invalid Article ID'});
		return;
	}
	const getArticle = `SELECT id, url, title, abstract, main_img FROM article WHERE id = ${id}`;
	mysql.conPool.getConnection((err, con)=>{
		con.query(getArticle, (err, result)=>{
			con.release();
			if (err) {
				myLib.log(err);
				return;
			}
			if (result.length===0) {
				res.render('error_page.ejs', {error: `Article ID ${id} Does Not Exist`});
				return;
			}
			result[0].url = myLib.hostName+'/view/article?id='+result[0].id;
			if (result[0].abstract.length>150) {
				result[0].abstract = result[0].abstract.substring(0, 147)+'...';
			};
			res.render('article.ejs', {article: result[0]});
		});
	});
});

router.get('/zh_tw/view/article', (req, res)=>{
	const id = parseInt(req.query.id);
	if (!Number.isInteger(id)) {
		res.render('error_page.ejs', {error: '錯誤的搜尋，不要玩網址！'});
		return;
	}
	const getArticle = `SELECT id, url, title_zhtw AS title, abstract_zhtw AS abstract, main_img FROM article WHERE id = ${id}`;
	mysql.conPool.getConnection((err, con)=>{
		con.query(getArticle, (err, result)=>{
			con.release();
			if (err) {
				myLib.log(err);
				return;
			}
			if (result.length===0) {
				res.render('error_page.ejs', {error: `文章編號 ${id} 不存在`});
				return;
			}
			result[0].url = myLib.hostName+'/zh_tw/view/article?id='+result[0].id;
			if (result[0].abstract.length>150) {
				result[0].abstract = result[0].abstract.substring(0, 147)+'...';
			};
			res.render('article_zhtw.ejs', {article: result[0]});
		});
	});
});

module.exports = router;
