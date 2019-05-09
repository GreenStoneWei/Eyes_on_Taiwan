const natural = require('natural');
const mysql = require('../util/mysql.js');
const TfIdf = natural.TfIdf;
const redis = require('redis');
const client = redis.createClient();
const dimensionN = 50;

/**
 * Calculate total corpus Term Frequency
 * @param {obj} allArticle selected from mysql.
 * @param {int} dimensionN how many demensions are assigned to this model.
 * @return {array} return a freq-sorted term array.
 */
function calCorpusTF(allArticle, dimensionN) {
	// allArticle 是所有文章的 array
	let corpus='';
	allArticle.forEach(function(item) {
		corpus += item.text;
	});
	corpus = corpus.replace(/<p>/g, '').replace(/<\/p>/g, ' ');
	const tfidf = new TfIdf();
	const corpusTF={};
	tfidf.addDocument(corpus);
	tfidf.listTerms(0).forEach(function(item) {
		corpusTF[item.term] = item.tfidf;
	});
	const corpusSorted = Object.keys(corpusTF).sort(function(a, b) {
		return corpusTF[b]-corpusTF[a];
	}).slice(0, dimensionN); // corpus 的 top 50 word Freq array

	return corpusSorted;
}

/**
 * Calculate each article's vector.
 * @param {string} content content of target article.
 * @param {array} corpusTF an array returned from function calCorpusTF.
 * @param {int} dimensionN how many demensions are assigned to this model.
 * @return {array} return each article's vector.
 */
function calWordVector(content, corpusTF, dimensionN) {
	// content 放進目標文字、corpusTF 放入所有文章總和的字頻 array
	// 先不考慮 idf 的修正， idf 後推薦的結果反而比較不相關
	const textFeed = content.replace(/<p>/g, '').replace(/<\/p>/g, ' ');
	const tfIDF = new TfIdf();
	tfIDF.addDocument(textFeed);

	const articleFreq = {};
	tfIDF.listTerms(0).forEach(function(item) {
		articleFreq[item.term] = item.tfidf;
	});

	// 將文章的字頻依照分數排列，取前 n 個排進 array 中
	const tfSorted = Object.keys(articleFreq).sort(function(a, b) {
		return articleFreq[b]-articleFreq[a];
	}).slice(0, dimensionN);
	const wordVector = [];
	for (let i=0; i< tfSorted.length; i++) {
		const termIndex = corpusTF.indexOf(tfSorted[i]);

		// check if exist in corpus freq
		if (termIndex == -1) {
			wordVector.push(0);
		}
		// 將頻率當作距離也考慮進去，因為只算夾角的話，如果朝同一個向量方向遠離，夾角不變但歐幾里德距離增加，不太合理
		if (termIndex !== -1) {
			wordVector.push(articleFreq[tfSorted[i]]);
		}
	}
	return wordVector;
}

/**
 * Calculate suqare root of sum square of an array.
 * @param {obj} array selected from mysql.
 * @return {float} return suqare root of sum square of an array.
 */
function sqrtOfSumSq(array) {
	let sumSquare = 0;
	for (let i=0; i< array.length; i++) {
		sumSquare += Math.pow(array[i], 2);
	}
	return Math.sqrt(sumSquare);
}

/**
 * Calculate cosine theta angle of two array vectors. The smaller the value, the closer the two vectors.
 * @param {array} arr1 article one's vector.
 * @param {array} arr2 article two's vector.
 * @return {float} return value of cosine theta.
 */
function cosTheta(arr1, arr2) {
	let sumOfArrayMultiply = 0;
	for (let i =0; i< arr1.length; i++) {
		sumOfArrayMultiply += arr1[i]*arr2[i];
	}
	return sumOfArrayMultiply/(sqrtOfSumSq(arr1)*sqrtOfSumSq(arr2));
}


/**
 * Find the most similar article for target article.
 * @param {array} allArticle
 * @param {array} corpusTF
 * @param {int} returnN how many similar articles we need.
 * @return {obj} return an obj includes news_id, article_id and similar articles.
 */
function findSimilarArticle(allArticle, corpusTF, returnN) {
	// allArticle 參數應要 array，含有每篇 article 的 obj 其中至少有 article_id 和 content 兩個 property
	// 計算每篇文章的 vector 存回 obj 裡
	for (let i=0; i < allArticle.length; i++) {
		const targetVector = calWordVector(allArticle[i].text, corpusTF, dimensionN); // allArticle[i].text 的 text 必須跟撈出文章後給的 property name 一樣
		allArticle[i].vector = targetVector;
	}
	// vector 間逐一計算餘弦相似度
	for (let j=0; j<allArticle.length; j++) {
		const cosDistObj = {};
		for (let k=0; k<allArticle.length; k++) {
			const cosD = cosTheta(allArticle[j].vector, allArticle[k].vector);
			cosDistObj[allArticle[k].id] = cosD;
		}
		// 排序後拿回前三個分數的 id
		const result = Object.keys(cosDistObj).sort(function(a, b) {
			return cosDistObj[b]-cosDistObj[a];
		}).slice(1, returnN+1); // 因為第一篇會是自己
		allArticle[j].similar = result;
	}
	return allArticle;
}

/**
 * Calculate and find similar articles for all articles.
 * @return {undefined}
 */
function calSimilarArticle() {
	return new Promise((resolve, reject)=>{
		mysql.conPool.query('SELECT id, context FROM article WHERE context != ""', (err, result)=>{
			const articleList = [];
			result.forEach(function(article) {
				articleList.push(Object.assign({id: article.id, text: article.context}));
			});

			const corpus = calCorpusTF(articleList, dimensionN);
			const similarResult = findSimilarArticle(articleList, corpus, 3);

			let done = 0;
			for (let i = 0; i<similarResult.length; i++) {
				const similarJSON = JSON.stringify(similarResult[i].similar);
				mysql.conPool.query(`UPDATE article SET similar_article = '${similarJSON}' WHERE id = ${similarResult[i].id}`, (err, result)=>{
					done ++;
					console.log('calSimilarAritlce '+done);
					if (err) {
						reject(err);
					}
					if (done === similarResult.length) {
						client.flushall();
						console.log('Done');
						resolve('ok');
					}
				});
			}
		});
	});
}
module.exports = calSimilarArticle;
