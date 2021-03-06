const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const mysql = require('../util/mysql.js');
const myLib = require('../util/config.js');
const redis = require('redis');
const client = redis.createClient({
	retry_strategy: function(options) {
		if (options.error && options.error.code === 'ECONNREFUSED') {
			return new Error('The server refused the connection'); // End reconnecting on a specific error and flush all commands with a individual error
		}
		if (options.total_retry_time > 1000 * 60 * 60) {
			return new Error('Retry time exhausted'); // End reconnecting after a specific timeout and flush all commands with a individual error
		}
		if (options.attempt > 10) {
			return undefined; // End reconnecting with built in error
		}
		return Math.min(options.attempt * 100, 3000); // reconnect after 3 secs
	},
});
const cacheExpireTime = 60 * 60 * 24; // EX unit: sec, this equals 1 day.

router.get('/index', (req, res)=>{
	let paging = parseInt(req.query.page);
	if (!Number.isInteger(paging)) {
		paging = 1;
	}
	if (paging <= 0) {
		res.send(JSON.stringify({error: `Page ${paging} Not Found`}));
		return;
	}
	const pageLimit = 9;
	const sort = req.query.sort;
	const tag = req.query.tag;
	const keyword = req.query.keyword;
	let orderBy = '';
	const offset = (paging-1) * pageLimit;
	const limiter = ` LIMIT ${offset}, ${pageLimit}`;
	let filter = '';
	const getColumn = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count';
	let selectFromJoin = '';
	if (keyword !== undefined) {
		selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id';
		filter = ` WHERE title != "null" AND context != "null" AND context != "" AND LOWER(title) LIKE "%${keyword.toLowerCase()}%"`;
		switch (sort) {
		case 'date':
			orderBy = ' ORDER BY unixtime DESC';
			break;
		case 'most_viewed':
			orderBy = ' ORDER BY viewed_count DESC';
			break;
		default:
			orderBy = ' ORDER BY unixtime DESC';
		}
	} else {
		switch (tag) {
		case 'null':
			selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id';
			filter = ` WHERE title != "null" AND context != "null" AND context != "" `;
			break;
		default:
			selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id INNER JOIN tag ON article.id = tag.article_id';
			filter = ` WHERE title != "null" AND context != "null" AND context != "" AND tag = "${tag}"`;
		}
		switch (sort) {
		case 'date':
			orderBy = ' ORDER BY unixtime DESC';
			break;
		case 'most_viewed':
			orderBy = ' ORDER BY viewed_count DESC';
			break;
		default:
			orderBy = ' ORDER BY unixtime DESC';
		}
	}
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT count(*) AS count'+selectFromJoin+filter+orderBy, (err, count)=>{
			con.release();
			const totalArticleCount = count[0].count*1; // *1 to convert into int
			const totalPage = Math.ceil(totalArticleCount/pageLimit);
			// query
			con.query(getColumn+selectFromJoin+filter+orderBy+limiter, function(error, result) {
				if (error) {
					throw error;
				}
				if (result.length ==0 && keyword !== undefined) {
					res.send({error: `No Search Result for "${keyword}"`});
				}
				if (result.length ==0 && tag !== undefined) {
					res.send({error: `Tag "${tag}" Not Found`});
				}
				// add viewed count in cached. another solution is making the caching addition in another route. Front-end calls 2 api.
				let added = 0;
				for (let i=0; i<result.length; i++) {
					const viewCountCache = 'view_count_'+ result[i].id;
					client.get(viewCountCache, (err, cacheCount)=>{
						added++;
						// 處理 cachecount = null 的情況
						if (cacheCount==null) {
							cacheCount=0;
						}
						result[i].viewed_count += parseInt(cacheCount);
						if (added===result.length) {
							// console.log(result);
							res.send(JSON.stringify({totalPage: totalPage, data: result}));
						}
					});
				}
			});
		});
	});
});

router.get('/article', (req, res)=>{
	// client.flushdb();
	const id = parseInt(req.query.id);
	if (!Number.isInteger(id)) {
		res.send({error: 'Invalid Article ID'});
		return;
	}
	const viewCountCache = 'view_count_'+id;
	client.incr(viewCountCache, ()=>{ // view count + 1, if the article has not been viewed yet, redis generates a key and sets the value = 0
		const articleCache = 'article_'+id;
		client.get(articleCache, function(err, reply) {
			if (reply) {
				// 更新 cache 中 similar article count
				const cacheReply = JSON.parse(reply);

				const cacheSimilar = cacheReply[0].similar_article;

				let similarCountAdded = 0;
				for (let i=0; i<cacheSimilar.length; i++) {
					// console.log(cacheSimilar[i].id);
					const cachekey = 'view_count_'+cacheSimilar[i].id;
					client.get(cachekey, (err, cacheCount)=>{
						similarCountAdded ++;
						if (cacheCount == null) { // cacheCount 出來的計數會是字串，沒有的話是 null
							cacheCount = 0;
						}
						cacheSimilar[i].viewed_count += parseInt(cacheCount);
						if (similarCountAdded==cacheSimilar.length) {
							client.get(viewCountCache, (err, cacheCount)=>{
								const originCount = parseInt(cacheReply[0].viewed_count);
								cacheReply[0].viewed_count = originCount + parseInt(cacheCount);
								res.send(JSON.stringify(cacheReply));
							});
						}
					});
				}
			} else {
				const getArticle = `SELECT * FROM article INNER JOIN news ON article.news_id = news.id WHERE article.id = ${id}`;
				mysql.conPool.getConnection((err, con)=>{
					con.query(getArticle, (err, article)=>{
						con.release();
						if (err) {
							myLib.log(err);
							return;
						}
						if (article.length===0) {
							res.send({error: `Article ID ${id} Does Not Exist.`});
							return;
						}
						const similarArticle = JSON.parse(article[0].similar_article);
						const getArticle = 'SELECT article.id, news.news, main_img, unixtime, title, abstract, url, viewed_count FROM article INNER JOIN news ON article.news_id = news.id ';
						const articleID = `WHERE article.id = ${similarArticle[0]} OR article.id = ${similarArticle[1]} OR article.id = ${similarArticle[2]}`;
						con.query(getArticle+articleID, (err, similarResult)=>{
							// 在更新文章後還沒有算出 similar article 前會出錯 cannot read property 0 of undefined.
							if (err) {
								myLib.log(err);
								return;
							}
							// similar article 的 view Count 也要加上 cache 的數字
							let similarCountAdded = 0;
							for (let i=0; i<similarResult.length; i++) {
								const similarArticleID = similarResult[i].id;
								const cacheKey = 'view_count_'+similarArticleID;
								client.get(cacheKey, (err, cacheCount)=>{
									similarCountAdded++;
									if (cacheCount == null) {
										cacheCount=0;
									}
									similarResult[i].viewed_count += parseInt(cacheCount);

									if (similarCountAdded===similarResult.length) {
										// 把更新的 similar result 塞回 article 中
										article[0].similar_article = similarResult;
										client.get(viewCountCache, (err, viewedCount)=>{
											article[0].viewed_count += parseInt(viewedCount);
											client.set(articleCache, JSON.stringify(article), 'EX', cacheExpireTime);
											res.send(JSON.stringify(article));
										});
									}
								});
							}
						});
					});
				});
			}
		});
	});
});

router.get('/card/tags', (req, res)=>{
	const id = parseInt(req.query.id);
	mysql.conPool.query(`SELECT t1.tag FROM tag AS t1 INNER JOIN article AS t2 ON t1.article_id = t2.id WHERE t2.id = ${id} LIMIT 5`, (err, tag)=>{
		if (err) {
			myLib.log(err);
			return;
		}
		const tagArray = [];
		for (let i = 0; i < tag.length; i++) {
			tagArray.push(tag[i].tag);
		}
		res.send(JSON.stringify(tagArray));
	});
});

router.get('/word/cloud', (req, res)=>{
	const tag = req.query.tag;
	mysql.conPool.query('SELECT count(tag) AS count , tag FROM newscraping.tag GROUP BY tag ORDER BY count DESC limit 50', (err, result)=>{
		const cloudList = [];
		const score = [];
		result.forEach((element) => {
			const eachTag = [element.tag, getBaseLog(1.5, element.count)];
			score.push(element.count);
			cloudList.push(eachTag);
		});
		res.send(JSON.stringify(cloudList));
	});
});

/**
 * Get log base on x for assigned y
 * @param {float} x log base
 * @param {int} y target integer
 * @return {float} log y base on x
 */
function getBaseLog(x, y) {
	return Math.log(y) / Math.log(x);
}


// zh-tw route
router.get('/zh-tw/index', (req, res)=>{
	let paging = parseInt(req.query.page);
	if (!Number.isInteger(paging)) {
		paging = 1;
	}
	if (paging <= 0) {
		res.send(JSON.stringify({error: `Page ${paging} Not Found`}));
		return;
	}
	const pageLimit = 9;
	const sort = req.query.sort;
	const tag = req.query.tag;
	const keyword = req.query.keyword;
	let orderBy = '';
	const offset = (paging-1) * pageLimit;
	const limiter = ` LIMIT ${offset}, ${pageLimit}`;
	let filter = '';
	const getColumn = 'SELECT article.id, news.news_zhtw AS news, main_img, unixtime, title_zhtw AS title, abstract_zhtw AS abstract, viewed_count';
	let selectFromJoin = '';
	if (keyword !== undefined) {
		selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id';
		filter = ` WHERE title_zhtw != "null" AND context_zhtw != "null" AND context_zhtw != "" AND title_zhtw LIKE "%${keyword}%"`;
		switch (sort) {
		case 'date':
			orderBy = ' ORDER BY unixtime DESC';
			break;
		case 'most_viewed':
			orderBy = ' ORDER BY viewed_count DESC';
			break;
		default:
			orderBy = ' ORDER BY unixtime DESC';
		}
	} else {
		switch (tag) {
		case 'null':
			selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id';
			filter = ` WHERE title_zhtw != "null" AND context_zhtw != "null" AND context != "" `;
			break;
		default:
			selectFromJoin = ' FROM article INNER JOIN news ON article.news_id = news.id INNER JOIN tag ON article.id = tag.article_id';
			filter = ` WHERE title_zhtw != "null" AND context_zhtw != "null" AND context != "" AND tag_zhtw = "${tag}"`;
		}
		switch (sort) {
		case 'date':
			orderBy = ' ORDER BY unixtime DESC';
			break;
		case 'most_viewed':
			orderBy = ' ORDER BY viewed_count DESC';
			break;
		default:
			orderBy = ' ORDER BY unixtime DESC';
		}
	}
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT count(*) AS count'+selectFromJoin+filter+orderBy, (err, count)=>{
			con.release();
			const totalArticleCount = count[0].count*1; // *1 to convert into int
			const totalPage = Math.ceil(totalArticleCount/pageLimit);
			// query to sql
			con.query(getColumn+selectFromJoin+filter+orderBy+limiter, function(error, result) {
				if (error) {
					throw error;
				}
				if (result.length ==0 && keyword !== undefined) {
					res.send({error: `沒有關鍵字 "${keyword}" 的搜尋結果`});
				}
				if (result.length ==0 && tag !== undefined) {
					res.send({error: `查無此標籤： "${tag}" `});
				}
				// add viewed count in cached. another solution is making the caching addition in another route. Front-end calls 2 api.
				let added = 0;
				for (let i=0; i<result.length; i++) {
					const viewCountCache = 'view_count_'+ result[i].id;
					client.get(viewCountCache, (err, cacheCount)=>{
						added++;
						// 處理 cachecount = null 的情況
						if (cacheCount==null) {
							cacheCount=0;
						}
						result[i].viewed_count += parseInt(cacheCount);
						if (added===result.length) {
							res.send(JSON.stringify({totalPage: totalPage, data: result}));
						}
					});
				}
			});
		});
	});
});

router.get('/zh-tw/article', (req, res)=>{
	// client.flushdb();
	const id = parseInt(req.query.id);
	if (!Number.isInteger(id)) {
		res.send({error: 'Invalid Article ID'});
		return;
	}
	const viewCountCache = 'view_count_'+id;
	client.incr(viewCountCache, ()=>{ // view count + 1, if the article has not been viewed yet, redis generates a key and sets the value = 0
		const articleCache = 'article_'+'zh-tw_'+id;
		client.get(articleCache, function(err, reply) {
			if (reply) {
				// 更新 cache 中 similar article count
				const cacheReply = JSON.parse(reply);

				const cacheSimilar = cacheReply[0].similar_article;

				let similarCountAdded = 0;
				for (let i=0; i<cacheSimilar.length; i++) {
					// console.log(cacheSimilar[i].id);
					const cachekey = 'view_count_'+cacheSimilar[i].id;
					client.get(cachekey, (err, cacheCount)=>{
						similarCountAdded ++;
						if (cacheCount == null) { // cacheCount 出來的計數會是字串，沒有的話是 null
							cacheCount = 0;
						}
						cacheSimilar[i].viewed_count += parseInt(cacheCount);
						if (similarCountAdded==cacheSimilar.length) {
							client.get(viewCountCache, (err, cacheCount)=>{
								const originCount = parseInt(cacheReply[0].viewed_count);
								cacheReply[0].viewed_count = originCount + parseInt(cacheCount);
								res.send(JSON.stringify(cacheReply));
							});
						}
					});
				}
			} else {
				const getArticle = `SELECT news.news_zhtw AS news, url, title_zhtw AS title, subtitle_zhtw AS subtitle, abstract_zhtw AS abstract, author, unixtime, context_zhtw AS context, main_img, similar_article FROM article INNER JOIN news ON article.news_id = news.id WHERE article.id = ${id}`;
				mysql.conPool.getConnection((err, con)=>{
					con.query(getArticle, (err, article)=>{
						con.release();
						if (err) {
							myLib.log(err);
							return;
						}
						if (article.length===0) {
							res.send({error: `Article ID ${id} Does Not Exist.`});
							return;
						}
						const similarArticle = JSON.parse(article[0].similar_article);
						const getArticle = 'SELECT article.id, news.news_zhtw AS news, main_img, unixtime, title_zhtw AS title, abstract_zhtw AS abstract, url, viewed_count FROM article INNER JOIN news ON article.news_id = news.id ';
						const articleID = `WHERE article.id = ${similarArticle[0]} OR article.id = ${similarArticle[1]} OR article.id = ${similarArticle[2]}`;
						con.query(getArticle+articleID, (err, similarResult)=>{
							// 在更新文章後還沒有算出 similar article 前會出錯 cannot read property 0 of undefined.
							if (err) {
								myLib.log(err);
								return;
							}
							// similar article 的 view Count 也要加上 cache 的數字
							let similarCountAdded = 0;
							for (let i=0; i<similarResult.length; i++) {
								const similarArticleID = similarResult[i].id;
								const cacheKey = 'view_count_'+similarArticleID;
								client.get(cacheKey, (err, cacheCount)=>{
									similarCountAdded++;
									if (cacheCount == null) {
										cacheCount=0;
									}
									similarResult[i].viewed_count += parseInt(cacheCount);

									if (similarCountAdded===similarResult.length) {
										// 把更新的 similar result 塞回 article 中
										article[0].similar_article = similarResult;
										client.get(viewCountCache, (err, viewedCount)=>{
											article[0].viewed_count += parseInt(viewedCount);
											client.set(articleCache, JSON.stringify(article), 'EX', cacheExpireTime);
											res.send(JSON.stringify(article));
										});
									}
								});
							}
						});
					});
				});
			}
		});
	});
});

router.get('/zh-tw/card/tags', (req, res)=>{
	const id = parseInt(req.query.id);
	mysql.conPool.query(`SELECT t1.tag_zhtw AS tag FROM tag AS t1 INNER JOIN article AS t2 ON t1.article_id = t2.id WHERE t2.id = ${id} LIMIT 5`, (err, tag)=>{
		if (err) {
			myLib.log(err);
			return;
		}
		const tagArray = [];
		for (let i = 0; i < tag.length; i++) {
			tagArray.push(tag[i].tag);
		}
		res.send(JSON.stringify(tagArray));
	});
});

router.get('/zh-tw/word/cloud', (req, res)=>{
	const tag = req.query.tag;
	mysql.conPool.query('SELECT count(tag_zhtw) AS count , tag_zhtw AS tag FROM tag GROUP BY tag_zhtw ORDER BY count DESC limit 50', (err, result)=>{
		const cloudList = [];
		const score = [];
		result.forEach((element) => {
			const eachTag = [element.tag, getBaseLog(1.5, element.count)];
			score.push(element.count);
			cloudList.push(eachTag);
		});
		res.send(JSON.stringify(cloudList));
	});
});

// save redis cache to sql
router.get('/rediscount2sql', (req, res)=>{
	client.keys('view_count*', (err, reply)=>{
		let updated = 0;
		for (let i=0; i<reply.length; i++) {
			const countKey = reply[i];
			const cachedID = parseInt(reply[i].replace('view_count_', ''));
			client.getset(countKey, '0', (err, reply)=>{
				mysql.conPool.query(`UPDATE article SET viewed_count = viewed_count + ${reply} WHERE id = ${cachedID}`, (err, result)=>{
					updated ++;
					if (err) {
						myLib.log(err);
					}
					if (updated===reply.length) {
						res.send({success: 'redis count update to mysql.'});
					}
				});
			});
		}
	});
});
module.exports = router;
