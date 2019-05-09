const mysql = require('../util/mysql.js');
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

/**
 * Send request to Google translator to translate article content.
 * @return {undefined}
 */
function articleTranslator() {
	return new Promise((resolve, reject)=>{
		mysql.conPool.getConnection((err, connection)=>{
			if (err) {
				reject(err);
			}
			mysql.conPool.query('SELECT * FROM article WHERE context_zhtw IS NULL', async (err, resultToBeTranslated)=>{
				connection.release();
				if (err) {
					reject(err);
					return;
				}
				if (resultToBeTranslated.length===0) {
					resolve('No Article To Be Translated');
					return;
				}
				try {
					let translateDone = 0;
					for (let i=0; i<resultToBeTranslated.length; i++) {
						const article = resultToBeTranslated[i];
						const translatedTitle = await translate.translate(article.title, translateTarget);
						if (article.subtitle !== 'null' && article.subtitle !== null) {
							const translatedSubtitle = await translate.translate(article.subtitle, translateTarget);
							article.subtitle = translatedSubtitle[0];
						}
						const translatedabstract = await translate.translate(article.abstract, translateTarget);
						const translatedContext = await translate.translate(article.context, translateTarget);
						const oneRow = {
							title_zhtw: translatedTitle[0],
							subtitle_zhtw: article.subtitle,
							abstract_zhtw: translatedabstract[0],
							context_zhtw: translatedContext[0],
						};
						connection.query(`UPDATE article SET ? WHERE id = ${article.id}`, oneRow, (err)=>{
							translateDone ++;
							if (err) {
								reject(err);
								return;
							}
							console.log(article.id+ ' done');
							if (translateDone===resultToBeTranslated.length) {
								resolve('ok');
							}
						});
					}
				} catch (e) {
					throw e;
				}
			});
		});
	});
}

/**
 * Send request to Google translator to translate new tags.
 * @return {undefined}
 */
function tagTranslator() {
	return new Promise((resolve, reject)=>{
		mysql.conPool.getConnection((err, connection)=>{
			if (err) {
				reject(err);
			}
			mysql.conPool.query('SELECT * FROM tag WHERE tag_zhtw IS NULL', (err, tobeTranslated)=>{
				connection.release();
				if (err) {
					reject(err);
					return;
				}
				try {
					let done = 0;
					for (let i=0; i<tobeTranslated.length; i++) {
						const tagID = tobeTranslated[i].id;
						const enTag = tobeTranslated[i].tag;
						connection.query('SELECT id, tag_zhtw FROM tag WHERE tag = ?', enTag, async (err, result)=>{
							const zhTag = result[0].tag_zhtw;
							if (zhTag == null) {
								const translatedTag = await translate.translate(enTag, translateTarget);
								connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [translatedTag[0], tagID], (err)=>{
									done ++;
									if (err) {
										reject(err);
									}
									console.log(tagID + ' done by google translation');
									if (done === tobeTranslated.length) {
										resolve('ok');
									}
								});
							} else {
								connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [zhTag, tagID], (err)=>{
									done++;
									if (err) {
										reject(err);
									}
									console.log(tagID + ' updated by exist dictionary.');
									if (done===tobeTranslated.length) {
										resolve('ok');
									}
								});
							}
						});
					}
				} catch (e) {
					console.log(e);
					reject(e);
				}
			});
		});
	});
}

module.exports={
	article: articleTranslator,
	tag: tagTranslator,
};
