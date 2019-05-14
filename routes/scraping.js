const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const mysql = require('../util/mysql.js');
const dao = require('../dao/db.js');
const request = require('request');
const cheerio = require('cheerio');
const myLib = require('../util/config.js');
const puppeteer = require('puppeteer');
const textMining = require('../util/abstract.js');
const uploadImgToS3 = require('../controllers/s3.js');

router.get('/send/email/if/error', (req, res) =>{
	mysql.conPool.query('SELECT * FROM DoesNotExist', function(error, result) {
		if (error) {
			myLib.log(error);
			res.end();
			return;
		}
		res.end();
	});
});
// Aljazeera, news_id = 1, api list contains img
router.get('/aljazeera/list', (req, res)=>{
	const options = {
		url: 'https://sapi.aljazeera.net/apiservicesearch/index.aspx?format=mobile&contenttemplate=aje-azure-searchnoprocess&site=search&parentguid=Taiwan&offset=0&page_size=10&filter=ContentType%20eq%20%27Author%20Profile%27%20or%20ContentType%20eq%20%27Blog%20Post%27%20or%20ContentType%20eq%20%27Feature%27%20or%20ContentType%20eq%20%27Infographic%27%20or%20ContentType%20eq%20%27News%27%20or%20ContentType%20eq%20%27Opinion%27%20or%20ContentType%20eq%20%27Picture%20Gallery%27%20or%20ContentType%20eq%20%27Programme%20Episode%27&type=nosort',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const apiList = JSON.parse(body).value;
		const articleArray =[];
		let fetched = 0;
		for (let i=0; i < apiList.length; i++) {
			if (apiList[i].ContentType == 'News') {
				const url = 'https://www.aljazeera.com/'+ apiList[i].URL;
				const main_img = 'https://www.aljazeera.com/' + apiList[i].Image;
				const title = apiList[i].Title;
				const subtitle = apiList[i].Description;
				const author = apiList[i].Authors;
				const src_datetime = apiList[i].LastModifiedDate;
				const unixtime = Date.parse(src_datetime);
				if (url.search('video') == -1) {
					uploadImgToS3(main_img, 'aljazeera', Date.now().toString(), (main_img)=>{
						articleArray.push((Object.assign({url, main_img, title, subtitle, author, src_datetime, unixtime})));
						fetched++;
						if (fetched == apiList.length) {
							dao.addToDB(articleArray, 0, 1, 'url').then(()=>{
								res.redirect('/aljazeera/article');
							}).catch((error)=>{
								myLib.log(error);
							});
						}
					});
				} else {
					fetched++;
				}
			} else {
				fetched++; // 因為要把 content type 不是 news 的也算進去
			}
		}
	}); // End of request
});
router.get('/aljazeera/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 1 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			} else if (article.length===0) {
				res.send('Aljazeera up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const paragraph = $('.main-container .article-p-wrapper').children();
						let context = '';
						let pureText = '';
						for (let j = 0; j < paragraph.length; j++) {
							if (paragraph.get(j).tagName == 'p') {
								const p = paragraph.eq(j).text();
								context += '<p>' + p + '</p>';
								pureText += p;
							} else if (paragraph.get(j).tagName == 'h2') {
								const h2 = paragraph.eq(j).text();
								context += '<h2>' + h2 + '</h2>';
							}
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						if (context==='') {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched === article.length) {
									res.send('aljazeera has new article but cannot scrape');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							con.query(`UPDATE article SET context = "${context}", abstract = "${abstract}" WHERE id = ${article[i].id}`, function(err) {
								fetched++;
								if (err) {
									myLib.log(err);
									return;
								} else { // 沒有抓到 context 的話連上一個 query 都不會做，有 context 的話就能分析出 tag ，再把 tag 寫入
									dao.addTag(article[i].id, tagArray)
										.then(()=>{
											if (fetched === article.length) {
												res.send('aljazeera has new article');
												return;
											}
										})
										.catch((error)=>{
											myLib.log(error);
										});
								}
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});

// BBC, news_id = 2
router.get('/bbc/list', (req, res)=>{
	const options = {
		url: 'https://www.bbc.co.uk/search?q=taiwan&filter=news',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const $ = cheerio.load(body);
		const container = $('#search-content').find('.search-results');
		const urlList = container.find('.rs_touch');
		const articleArray = [];
		for (let i =0; i < urlList.length; i++) {
			const url = urlList.eq(i).attr('href');
			if (url.search('gallery') == -1 && url.search('video') == -1) {
				articleArray.push((Object.assign({url})));
			}
		}
		dao.addToDB(articleArray, 0, 2, 'url').then(()=>{
			res.redirect('/bbc/article');
		}).catch((error)=>{
			myLib.log(error);
		});
	}); // End of request
});
router.get('/bbc/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 2 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			} else if (article.length===0) {
				res.send('BBC up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const storyBody = $('#page .story-body');
						const title = storyBody.find('h1').text();
						const author = storyBody.find('.byline .byline__name').text();
						const unixtime = storyBody.find('.mini-info-list .date').attr('data-seconds')*1000;
						const paragraph = storyBody.find('.story-body__inner p');
						const main_img = storyBody.find('.story-body__inner img').attr('src');
						let pureText = '';
						let context = '';
						const content = {};
						for (let j = 0; j < paragraph.length; j++) {
							const p = paragraph.eq(j).text();
							const propertyName = j+'_p';
							context += '<p>' + p + '</p>';
							content[propertyName] = p.replace(/"/g, '\\"').replace(/'/g, '\\\'');
							pureText += p;
						}
						if (pureText==='') {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched === article.length) {
									res.send('aljazeera has new article but cannot scrape');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');

							uploadImgToS3(main_img, 'bbc', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET 
												title = "${title}",
												author = "${author}",
												unixtime = ${unixtime},
												context = "${context}",
												abstract = "${abstract}",
												main_img = "${main_img}"
										WHERE id = ${article[i].id}`, function(err) {
									fetched++;
									if (err) {
										myLib.log(err);
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('bbc has new article');
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});


// CNN: news_id = 3
router.get('/cnn/list', (req, res)=>{
	const options = {
		url: 'https://search.api.cnn.io/content?q=taiwan&size=10',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const apiList = JSON.parse(body).result;
		const articleArray =[];
		let fetched = 0;
		for (let i=0; i < apiList.length; i++) {
			const url = apiList[i].url;
			const main_img = apiList[i].thumbnail;
			const title = apiList[i].headline;
			const author = apiList[i].byLine;
			const src_datetime = apiList[i].lastModifiedDate;
			const unixtime = Date.parse(src_datetime);
			uploadImgToS3(main_img, 'cnn', Date.now().toString(), (main_img)=>{
				articleArray.push((Object.assign({url, main_img, title, author, src_datetime, unixtime})));
				fetched++;
				if (fetched == apiList.length) {
					dao.addToDB(articleArray, 0, 3, 'url').then(()=>{
						res.redirect('/cnn/article');
					}).catch((error)=>{
						myLib.log(error);
					});
				}
			});
		}
	}); // End of request
});
router.get('/cnn/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 3 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('CNN up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const paragraph = $('article > .l-container > .pg-rail-tall__wrapper').find('.zn-body__paragraph'); // 這個 class 底下有直接是文字的，也有 h3 tag 的
						let pureText = '';
						const content = {};
						let context = '';
						for (let j = 0; j < paragraph.length; j++) {
							const p = paragraph.eq(j).text();
							const propertyName = j+'_p';
							context += '<p>' + p + '</p>';
							content[propertyName]= p;
							pureText += p;
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\''); //

						if (context==='') {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched === article.length) {
									res.send('cnn has new article but cannot scrape');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							con.query(`UPDATE article SET context = "${context}", abstract = "${abstract}" WHERE id = ${article[i].id}`, function(err, result) {
								fetched++;
								if (err) {
									myLib.log(err);
									return;
								} else {
									dao.addTag(article[i].id, tagArray)
										.then(()=>{
											if (fetched === article.length) {
												res.send('cnn has new article');
												return;
											}
										})
										.catch((error)=>{
											myLib.log(error);
										});
								}
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});

// The Economist: news_id = 4 (require to subscribe or login) need filter out the /topic/taiwan url
router.get('/economist/list', (req, res) => {
	const url= 'https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=013751040265774567329:ylv-hrexwbc&start=0';
	(async ()=>{
		try {
			const browser = await puppeteer.launch();
			const page = await browser.newPage();
			await page.goto(url);
			const html = await page.content();
			const $ = cheerio.load(html);
			const resultArea = $('.gsc-expansionArea');
			const webResult = resultArea.find('.gsc-webResult');
			const articleArray = [];
			for (let i = 0; i < webResult.length; i++) {
				const url = webResult.eq(i).find('a').attr('data-ctorig');
				if (url !=='https://www.economist.com/topics/taiwan') {
					articleArray.push(Object.assign({url}));
				}
			}
			await dao.addToDB(articleArray, 0, 4, 'url'); // 用 url 判斷會有重複，但是 request 的來源抓不到完整的 title
			await browser.close();
			res.redirect('/economist/article');
		} catch (error) {
			myLib.log(error);
			res.end();
		}
	})();
});
router.get('/economist/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 4', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					if (article[i].context === null) {
						request(options, function(error, response, body) {
							if (error || !body) {
								myLib.log(error);
								return;
							}
							const $ = cheerio.load(body);
							const divMain = $('.main-content__clearfix ');
							const title = divMain.find('h1').find('.flytitle-and-title__title').text().replace(/"/g, '\\"').replace(/'/g, '\\\'');
							const subtitle = divMain.find('article').find('.blog-post__rubric').text();
							const author = divMain.find('article').find('.blog-post__inner').find('.blog-post__asideable-wrapper').find('.blog-post__byline-container').find('.blog-post__byline').text();
							const datetime = divMain.find('article').find('.blog-post__inner').find('time').attr('datetime');
							const unixtime = Date.parse(datetime);
							const main_img = divMain.find('article').find('.blog-post__inner').find('.component-image img').attr('src');
							const paragraph = divMain.find('article').find('.blog-post__inner .blog-post__text p');
							let pureText = '';
							let context = '';
							for (let j = 0; j < paragraph.length; j++) {
								const p = paragraph.eq(j).text();
								context += '<p>' + p + '</p>';
								pureText += p;
							}
							context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							uploadImgToS3(main_img, 'economist', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET 
                                              title = "${title}",
                                              subtitle = "${subtitle}",
                                              abstract = "${abstract}",
                                              author = "${author}", 
                                              context = "${context}",
                                              src_datetime = '${datetime}', 
                                              unixtime = ${unixtime},
                                              main_img = "${main_img}" 
                                       WHERE id = ${article[i].id}`, function(err) {
									fetched++;
									if (err) {
										myLib.log(err);
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('Economist has new article');
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						});
					} else {
						fetched++;
						if (fetched === article.length) {
							res.send('Economist up-to-date');
							return;
						}
					}
				} // End of for loop
			}
		}); // End of query
	});
});

// The guardian: news_id = 5
router.get('/guardian/list', (req, res)=>{
	const options = {
		url: 'https://www.theguardian.com/world/taiwan',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const $ = cheerio.load(body);
		const div = $('.fc-item__container .fc-item__content ');
		const urlList = div.find('a');
		const articleArray = [];
		for (let i =0; i < urlList.length; i++) {
			const url = urlList.eq(i).attr('href');
			if (url.search('gallery')==-1 && url.search('video')==-1) {
				articleArray.push((Object.assign({url})));
			}
		}
		dao.addToDB(articleArray, 0, 5, 'url').then(()=>{
			res.redirect('/guardian/article');
		}).catch((error)=>{
			myLib.log(error);
		});
	}); // End of request
});
router.get('/guardian/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 5 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('Guardian up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const divMain = $('article .content__main');
						const title = divMain.find('h1').text().replace(/"/g, '\\"').replace(/'/g, '\\\'');
						const subtitle = divMain.find('.content__standfirst').text();
						const author = divMain.find('.content__meta-container').find('.meta__contact-wrap .byline').text();
						const datetime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('datetime');
						const unixtime = divMain.find('.content__meta-container').find('.content__dateline').find('time').attr('data-timestamp');
						const main_img = divMain.find('.content__main-column').find('figure picture img').attr('src');
						const paragraph = divMain.find('.content__article-body p');
						let context = '';
						let pureText = '';
						for (let j = 0; j < paragraph.length; j++) {
							const p = paragraph.eq(j).text();
							context += '<p>' + p + '</p>';
							pureText += p;
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						if ( context===''|| title ==='' || unixtime === undefined ) {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched===article.length) {
									res.send('Guardian has new article but scrape nothing');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							uploadImgToS3(main_img, 'guardian', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}" 
                                        WHERE id = ${article[i].id}`, function(err) {
									fetched++;
									if (err) {
										myLib.log(err);
										// res.send({err:'Database query error. here'+i});
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('Guardian has new article');
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});

// Independent UK: news_id = 6;
router.get('/independent/list', (req, res) => {
	const url= 'https://cse.google.com/cse?oe=utf8&ie=utf8&source=uds&q=taiwan&safe=off&sort=&cx=006663403660930254993:oxhge2zf1ro&start=0';
	(async ()=>{
		try {
			const browser = await puppeteer.launch();
			const page = await browser.newPage();
			await page.goto(url);
			const html = await page.content();
			const $ = cheerio.load(html);
			const resultArea = $('.gsc-expansionArea');
			const articleArray = [];
			for (let i=0; i<resultArea.find('.gs-per-result-labels').length; i++) {
				const url = resultArea.find('.gs-per-result-labels').eq(i).attr('url');
				if (url!=='https://www.independent.co.uk/topic/Taiwan') {
					articleArray.push(Object.assign({url}));
				}
			}
			await dao.addToDB(articleArray, 0, 6, 'url');
			await browser.close();
			res.redirect('/independent/article');
		} catch (error) {
			myLib.log(error);
			res.end();
		}
	})();
});
router.get('/independent/article', (req, res) => {
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 6 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('Independent up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(err);
							res.end();
							return;
						}
						const $ = cheerio.load(body);
						const topContainerWrapper = $('#top-container-wrapper');
						let title = topContainerWrapper.find('h1').text();
						title = title.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						let subtitle = topContainerWrapper.find('h2').text();
						subtitle = subtitle.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						const meta = topContainerWrapper.find('.meta');
						const author = meta.find('.author').find('a').attr('title');
						const datetime = meta.find('.publish-date').find('amp-timeago').attr('datetime');
						const unixtime = Date.parse(datetime);
						const main_img = topContainerWrapper.find('.hero-wrapper figure amp-img').attr('src');
						const paragraph = $('.main-wrapper').find('.body-content').children();
						let context = '';
						let pureText = '';
						for (let j = 0; j < paragraph.length; j++) {
							if (paragraph.get(j).tagName == 'p') {
								const p = paragraph.eq(j).text();
								context += '<p>' + p + '</p>';
								pureText += p;
							}
							if (paragraph.get(j).tagName == 'hr') {
								break;
							}
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						if ( pureText===''|| title ==='') {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched ++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched === article.length) {
									res.send('Independent has new article but cannot get content');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							uploadImgToS3(main_img, 'independent', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}" 
                                    WHERE id = ${article[i].id}`, function(err) {
									fetched++;
									if (err) {
										myLib.log(err);
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('Independent has new article');
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						}
					});
				} // end of for loop
			}
		}); // End of query
	});
});

// New York Times: news_id = 7;
router.get('/nytimes/list', (req, res)=>{
	const options = {
		url: 'https://www.nytimes.com/search?query=Taiwan&sort=newest',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const $ = cheerio.load(body);
		const container = $('.css-46b038 ol');
		const searchResult = container.find('.css-1l4w6pd');
		const articleArray = [];
		for (let i = 0; i < searchResult.length; i++) {
			const url = 'https://www.nytimes.com' + searchResult.eq(i).find('a').attr('href');
			const title = searchResult.eq(i).find('a').find('.css-1lppelv').text();
			articleArray.push(Object.assign({url, title}));
		}
		dao.addToDB(articleArray, 0, 7, 'title').then((x)=>{
			// res.send('OK');
			res.redirect('/nytimes/article');
		}).catch((error)=>{
			myLib.log(error);
		});
	}); // End of request
});
router.get('/nytimes/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 7 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('NY Times up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const header = $('article').find('header');
						const title = header.find('.css-1vkm6nb h1').text();
						const main_img = header.find('.css-79elbk').find('img').attr('src');
						const author = header.find('.css-xt80pu p').text().replace('By', '');
						const src_datetime = header.find('.css-xt80pu time').attr('datetime');
						const unixtime = Date.parse(src_datetime);
						const storyBody = $('article').find('section .StoryBodyCompanionColumn');
						let context = '';
						let pureText = '';
						for (let j = 0; j < storyBody.length; j++) {
							const paragraph = storyBody.eq(j).find('p');
							for (let k = 0; k < paragraph.length; k++) {
								const p = paragraph.eq(k).text();
								context += '<p>' + p + '</p>';
								pureText += p;
							}
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						if ( context===''|| title ==='' || src_datetime === undefined ) {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched === article.length) {
									res.send('NY times has new article but cannot get content');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							uploadImgToS3(main_img, 'nytimes', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET title = "${title}",
                                                                main_img = "${main_img}",
                                                                abstract = "${abstract}",
                                                                author = "${author}",
                                                                src_datetime = "${src_datetime}",
                                                                unixtime = ${unixtime},
                                                                context = "${context}" WHERE id = ${article[i].id}`, function(err, result) {
									fetched++;
									if (err) { // The format of articles before 2011 is different!!
										myLib.log(err);
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('nytimes has new article'); // here report cannot set headers again
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});

// QUARTZ: news_id = 8
router.get('/quartz/list', (req, res)=>{
	const options = {
		url: 'https://qz.com/search/taiwan/',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const $ = cheerio.load(body);
		const urlList = $('._5ff1a');
		const articleArray = [];
		for (let i =0; i < urlList.length; i++) {
			const url = 'https://qz.com' + urlList.eq(i).attr('href');
			articleArray.push((Object.assign({url})));
		}
		dao.addToDB(articleArray, 0, 8, 'url').then((x)=>{
			res.redirect('/quartz/article');
		}).catch((error)=>{
			myLib.log(error);
		});
	}); // End of request
});
router.get('/quartz/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 8 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('QUARTZ up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const divMain = $('#main');
						const title = divMain.find('h1').text().replace(/"/g, '\\"').replace(/'/g, '\\\'');
						const subtitle = null;
						const author = divMain.find('._5e088').find('a').text();
						const datetime = divMain.find('._5e088').find('time').attr('datetime');
						const unixtime = Date.parse(datetime);
						const main_img = divMain.find('article ._83471 img').attr('src');
						const paragraph = divMain.find('._61c55 .quartz');
						let pureText = '';
						let context = '';
						for (let j = 0; j < paragraph.length; j++) {
							if (paragraph.get(j).tagName == 'p') {
								const p = paragraph.eq(j).text();
								context += '<p>' + p + '</p>';
								pureText += p;
							} else if (paragraph.get(j).tagName == 'h2') {
								const h2 = paragraph.eq(j).text();
								context += '<h2>' + h2 + '</h2>';
							}
						}
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						if (context===''|| title ==='') {
							const deleteNull = `DELETE FROM article WHERE id = ${article[i].id}`;
							con.query(deleteNull, function(error) {
								fetched++;
								if (error) {
									myLib.log(error);
									return;
								}
								if (fetched===article.length) {
									res.send('QUARTZ has new article but scrape nothing');
									return;
								}
							});
						} else {
							const tagArray = textMining.tagGen(article[i].id, pureText);
							const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
							uploadImgToS3(main_img, 'quartz', Date.now().toString(), (main_img)=>{
								con.query(`UPDATE article SET  
                                            title = "${title}",
                                            subtitle = "${subtitle}",
                                            abstract = "${abstract}",
                                            author = "${author}", 
                                            context = "${context}",
                                            src_datetime = '${datetime}', 
                                            unixtime = ${unixtime},
                                            main_img = "${main_img}"
                                    WHERE id = ${article[i].id}`, function(err) {
									fetched++;
									if (err) {
										myLib.log(err);
										return;
									} else {
										dao.addTag(article[i].id, tagArray)
											.then(()=>{
												if (fetched === article.length) {
													res.send('QUARTZ has new article');
													return;
												}
											})
											.catch((error)=>{
												myLib.log(error);
											});
									}
								});
							});
						}
					});
				} // End of for loop
			}
		}); // End of query
	});
});

// The Washington Post: news_id = 9
router.get('/washingtonpost/list', (req, res) => {
	const options = {
		url: 'https://sitesearchapp.washingtonpost.com/sitesearch-api/v2/search.json?count=20&query=taiwan&sort=relevance',
		method: 'GET',
	};
	request(options, function(error, response, body) {
		if (error || !body) {
			myLib.log(error);
			return;
		}
		const articleList = JSON.parse(body).results.documents;
		const articleArray = [];
		for ( let i = 0; i < articleList.length; i ++ ) {
			if (articleList[i].contenttype === 'Article' && articleList[i].primarysection !== 'Weather') {
				let title = articleList[i].headline;
				title = title.replace(/"/g, '\"').replace(/'/g, '\'');
				let subtitle = articleList[i].blurb;
				if (subtitle !== undefined) {
					subtitle = subtitle.replace(/"/g, '\"').replace(/'/g, '\'');
				}
				const author = articleList[i].byline;
				const src_datetime = articleList[i].pubdatetime;
				const unixtime = articleList[i].pubdatetime;
				const url = articleList[i].contenturl;
				articleArray.push(
					Object.assign({title, subtitle, author, src_datetime, unixtime, url})
				);
			}
		} // End of for loop

		dao.addToDB(articleArray, 0, 9, 'title').then(()=>{
			res.redirect('/washingtonpost/article');
		}).catch((error)=>{
			myLib.log(error);
		});
	}); // End of request
});
router.get('/washingtonpost/article', (req, res)=>{
	mysql.conPool.getConnection((err, con)=>{
		con.query('SELECT id, context, url FROM article WHERE news_id = 9 AND context IS NULL', function(err, article) {
			con.release();
			if (err) {
				myLib.log(err);
				res.send({err: 'Database query error.'});
				return;
			}
			if (article.length===0) {
				res.send('WP up-to-date');
				return;
			} else {
				let fetched = 0;
				for (let i = 0; i < article.length; i++) {
					const options = {
						url: article[i].url,
						method: 'GET',
					};
					request(options, function(error, response, body) {
						if (error || !body) {
							myLib.log(error);
							return;
						}
						const $ = cheerio.load(body);
						const main_img = $('#article-body article .inline-photo').find('img').attr('src');
						const paragraph = $('article').children();
						let context = '';
						let pureText = '';
						for (let j = 0; j < paragraph.length; j++) {
							if (paragraph.get(j).tagName == 'p') {
								const p = paragraph.eq(j).text();
								if (p.startsWith('Read more')) {
									break;
								} else {
									context += '<p>' + p + '</p>';
									pureText += p;
								}
							} else if (paragraph.get(j).tagName == 'h3') {
								const h3 = paragraph.eq(j).text();
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
						context = context.replace(/"/g, '\\"').replace(/'/g, '\\\'');
						const tagArray = textMining.tagGen(article[i].id, pureText);
						const abstract = textMining.abstractGen(pureText).replace(/"/g, '\\"').replace(/'/g, '\\\'');
						uploadImgToS3(main_img, 'washingtonpost', Date.now().toString(), (main_img)=>{
							con.query(`UPDATE article SET main_img = "${main_img}", abstract = "${abstract}", context = "${context}" WHERE id = ${article[i].id}`, function(err, result) {
								fetched++;
								if (err) {
									myLib.log(err);
									return;
								} else {
									dao.addTag(article[i].id, tagArray)
										.then(()=>{
											if (fetched === article.length) {
												res.send('WP has new article');
												return;
											}
										})
										.catch((error)=>{
											myLib.log(error);
										});
								}
							});
						});
					});
				} // End of for loop
			}
		}); // End of query
	});
});

module.exports = router;
