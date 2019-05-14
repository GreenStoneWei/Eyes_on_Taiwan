const natural = require('natural');
const mysql = require('../util/mysql.js');
const TfIdf = natural.TfIdf;
const dimensionN = 50;

mysql.conPool.query('SELECT id, context FROM article WHERE context != ""', (err, result)=>{
	const articleList = [];
	// 把所有文章撈出來
	result.forEach(function(article) {
		articleList.push(Object.assign({id: article.id, text: article.context}));
	});

	const corpus = calCorpusTF(articleList, dimensionN);
	const similarResult = findSimilarArticle(articleList, corpus, 3);
	// console.log(similarResult[0]);
	let done = 0;
	for (let i = 0; i<similarResult.length; i++) {
		const similarJSON = JSON.stringify(similarResult[i].similar);
		mysql.conPool.query(`UPDATE article SET similar_article = '${similarJSON}' WHERE id = ${similarResult[i].id}`, (err, result)=>{
			done ++;
			console.log(done);
			if (err) {
				throw err;
			}
			if (done == similarResult.length) {
				console.log('Done');
			}
		});
	}
});

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

function calWordVector(targetArticle_i, allArticle, corpusTF, dimensionN) {
	// content 放進目標文字、corpusTF 放入所有文章總和的字頻 array
	// let textFeed = content.replace(/<p>/g,'').replace(/<\/p>/g,' ');
	const tfIDF = new TfIdf();

	// tfIDF.addDocument(textFeed);
	for (let j=0; j<allArticle.length; j++) {
		tfIDF.addDocument(allArticle[j].text.replace(/<p>/g, '').replace(/<\/p>/g, ' '));
	}

	const articleFreq = {};
	tfIDF.listTerms(targetArticle_i).forEach(function(item) {
		articleFreq[item.term] = item.tfidf;
	});
	// 將文章的字頻依照分數排列，取前 n 個排進 array 中
	const tfSorted = Object.keys(articleFreq).sort(function(a, b) {
		return articleFreq[b]-articleFreq[a]
		;
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

// 算 cos theta similarity
function sqrtOfSumSq(array) {
	let sumSquare = 0;
	for (let i=0; i< array.length; i++) {
		sumSquare += Math.pow(array[i], 2);
	}
	return Math.sqrt(sumSquare);
}

// cos theta 越接近 1 代表夾角越接近 0 度，也代表兩個向量的越相似
function cosDistance(arr1, arr2) {
	let sumOfArrayMultiply = 0;
	for (let i =0; i< arr1.length; i++) {
		sumOfArrayMultiply += arr1[i]*arr2[i];
	}
	return sumOfArrayMultiply/(sqrtOfSumSq(arr1)*sqrtOfSumSq(arr2));
}

// 找到最相近的三篇文章 (return 回 media id, article id, 篇數)
function findSimilarArticle(allArticle, corpusTF, returnN) {
	// allArticle 參數應要 array，含有每篇 article 的 obj 其中至少有 article_id 和 content 兩個 property
	// 計算每篇文章的 vector 存回 obj 裡
	for (let i=0; i < allArticle.length; i++) {
		const targetVector = calWordVector(i, allArticle, corpusTF, dimensionN);
		allArticle[i].vector = targetVector;
	}
	// vector 間逐一計算餘弦相似度
	for (let j=0; j<allArticle.length; j++) {
		const cosDistObj = {};
		for (let k=0; k<allArticle.length; k++) {
			const cosD = cosDistance(allArticle[j].vector, allArticle[k].vector);
			cosDistObj[allArticle[k].id] = cosD;
		}
		// 排序後拿回前三個分數的 id
		const result = Object.keys(cosDistObj).sort(function(a, b) {
			return cosDistObj[b]-cosDistObj[a]
			;
		}).slice(1, returnN+1); // 因為第一篇會是自己
		allArticle[j].similar = result;
	}
	return allArticle;
}

module.exports = {
	updateSimilarArticle: function() {
		mysql.conPool.query('SELECT id, context FROM article WHERE context != ""', (err, result)=>{
			const articleList = [];
			// 把所有文章撈出來
			result.forEach(function(article) {
				articleList.push(Object.assign({id: article.id, text: article.context}));
			});

			const corpus = calCorpusTF(articleList, dimensionN);
			const similarResult = findSimilarArticle(articleList, corpus, 3);
			// console.log(similarResult[0]);
			let done = 0;
			for (let i = 0; i<similarResult.length; i++) {
				const similarJSON = JSON.stringify(similarResult[i].similar);
				mysql.conPool.query(`UPDATE article SET similar_article = '${similarJSON}' WHERE id = ${similarResult[i].id}`, (err, result)=>{
					done ++;
					console.log(done);
					if (err) {
						throw err;
					}
					if (done == similarResult.length) {
						console.log('Done');
					}
				});
			}
		})
		;
	},
};
