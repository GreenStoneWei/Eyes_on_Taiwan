const mysql = require('../util/mysql.js');
const myLib = require('../util/config.js');

const addToDB = function(array, j, news_id, identifier) {
	return new Promise(function(resolve, reject) {
		if (j < array.length) {
			mysql.conPool.getConnection((err, con)=>{
				if (err) {
					myLib.log(err);
					addToDB(array, j+1, news_id, identifier);
				}
				const checkIfExist = `SELECT * FROM article WHERE news_id = ${news_id} AND ${identifier} = ?`;
				con.query(checkIfExist, array[j][identifier], function(err, rows) {
					con.release();
					if (err) {
						myLib.log(err);
						addToDB(array, j+1, news_id, identifier).then(()=>{
							reject(new Error(`error: 'newsID' + ${news_id} + check exist failed.`));
						});
					}
					if (rows.length === 0) {
						const insertNewURL = `INSERT INTO article SET ?`;
						const oneRow = {
							news_id: `${news_id}`,
							url: array[j].url,
							title: array[j].title,
							subtitle: array[j].subtitle,
							abstract: array[j].abstract,
							author: array[j].author,
							src_datetime: array[j].src_datetime,
							unixtime: array[j].unixtime,
							content: array[j].content,
							context: array[j].context,
							main_img: array[j].main_img,
							similar_article: array[j].similer_article,
						};
						con.query(insertNewURL, oneRow, function(err, result, fields) {
							if (err) {
								myLib.log(err);
								addToDB(array, j+1, news_id, identifier).then(()=>{
									reject(new Error(`error: 'newsID' + ${news_id} + check exist failed.`));
								});
							}
							if (j===array.length-1) {
								resolve({success: 'insert to DB finish.'});
							} else {
								addToDB(array, j+1, news_id, identifier).then(()=>{
									resolve();
								});
							}
						});
					} else {
						if (j===array.length-1) {
							resolve({success: 'insert to DB finish.'});
						} else {
							addToDB(array, j+1, news_id, identifier).then(()=>{
								resolve();
							});
						}
					}
				});
			});
		}
	}); // end of Promise
};

const addTag = function(id, tagArray) {
	return new Promise((resolve, reject)=>{
		mysql.conPool.getConnection((err, con)=>{
			con.query(`SELECT * FROM tag WHERE article_id = ${id}`, (err, result)=>{
				con.release();
				if (err) {
					reject(err);
					return;
				}
				if (result.length == 0) {
					con.query('INSERT INTO tag (article_id,tag) VALUES ? ', [tagArray], (err, result)=>{
						if (err) {
							reject(err);
							return;
						}
						resolve('Tag added.');
					});
				} else {
					resolve('tags already generated.');
				}
			});
		});
	});
};

module.exports = {
	addToDB: addToDB,
	addTag: addTag,
};

