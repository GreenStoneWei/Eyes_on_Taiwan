const natural = require('natural');
const mysql = require("mysql");
const credential = require('../util/credentials.js');
const con = mysql.createConnection({
	host:"localhost",
	user:"root",
	password:credential.mysqlPWD,
	database:"newscraping"
});
con.connect(function(err){
	if (err) {
		throw err;
    }
    else {
		console.log("mysql Connected!");
	}
});
const TfIdf = natural.TfIdf;
const dimensionN = 50;

con.query('SELECT id, context FROM cnn WHERE context != ""', (err,result)=>{
    let articleList = []

    // 把所有文章撈出來
    result.forEach(function(article){
        articleList.push(Object.assign({id: article.id, text: article.context}));
    })
    
    // 算 corpus 的 word freq
    let totalContent='';
    articleList.forEach(function(item){
        totalContent += item.text;
    })
    
    totalContent = totalContent.replace(/<p>/g,'').replace(/<\/p>/g,' ');
    var TfIdf = natural.TfIdf;
    var tfidf = new TfIdf();
    let imptDict={};
    tfidf.addDocument(totalContent);
    tfidf.listTerms(0).forEach(function(item){
        imptDict[item.term] = item.tfidf;
    })
    let keysSorted = Object.keys(imptDict).sort(function(a,b){return imptDict[b]-imptDict[a]})
    keysSorted = keysSorted.slice(0,50); // corpus 的 top 50 word Freq array
    // console.log(keysSorted);

    let dictArray = Object.keys(imptDict); // corpus 的 word Freq


    // 文章一
    let target = result[0].context.replace(/<p>/g,'').replace(/<\/p>/g,' '); // 使用者看的文章
    let tfidfForTarget = new TfIdf();
    tfidfForTarget.addDocument(target);
    
    let articleFreq = {};

    tfidfForTarget.listTerms(0).forEach(function(item){
        articleFreq[item.term] = item.tfidf;
    })

    let wordVector = [];
    let articleSorted = Object.keys(articleFreq).sort(function(a,b){return articleFreq[b]-articleFreq[a]}).slice(0,50); //含有 字頻 排序的 array
    for (let i=0; i< articleSorted.length ; i++){
        let termIndex = keysSorted.indexOf(articleSorted[i]);
        // check if exist in corpus freq
        if (termIndex == -1){
            wordVector.push(0);
        }
        if (termIndex !== -1){
            wordVector.push(articleFreq[articleSorted[i]]);
        }
    }
    // console.log(calWordVector(target,keysSorted,dimensionN));
    // console.log("-----"+wordVector.length+"------");

    // 比較用的第二篇文章
    let target2 = result[1].context.replace(/<p>/g,'').replace(/<\/p>/g,' '); // 使用者看的文章
    let tfidfForTarget2 = new TfIdf();
    tfidfForTarget2.addDocument(target2);
    
    let articleFreq2 = {};

    tfidfForTarget2.listTerms(0).forEach(function(item){
        articleFreq2[item.term] = item.tfidf;
    })

    let wordVector2 = [];
    let articleSorted2 = Object.keys(articleFreq2).sort(function(a,b){return articleFreq2[b]-articleFreq2[a]}).slice(0,50); //含有 字頻 排序的 array
    for (let i=0; i< articleSorted2.length ; i++){
        let termIndex2 = keysSorted.indexOf(articleSorted2[i]);
        // check if exist in corpus freq
        if (termIndex2 == -1){
            wordVector2.push(0);
        }
        if (termIndex2 !== -1){
            wordVector2.push(articleFreq2[articleSorted2[i]]);
        }
    }
    // console.log(wordVector2.length);
    // console.log(cosDistance(wordVector,wordVector2));
})


function calCorpusTF(allArticle, dimensionN){
    // allArticle 是所有文章的 array
    let corpus='';
    allArticle.forEach(function(item){
        corpus += item.text;
    })
    corpus = corpus.replace(/<p>/g,'').replace(/<\/p>/g,' ');
    let tfidf = new TfIdf();
    let corpusTF={};
    tfidf.addDocument(corpus);
    tfidf.listTerms(0).forEach(function(item){
        corpusTF[item.term] = item.tfidf;
    })
    let corpusSorted = Object.keys(corpusTF).sort(function(a,b){return corpusTF[b]-corpusTF[a]}).slice(0,dimensionN); // corpus 的 top 50 word Freq array
    return corpusSorted;
}

function calWordVector (content, corpusTF, dimensionN){
    // content 放進目標文字、corpusTF 放入所有文章總和的字頻 array
    let textFeed = content.replace(/<p>/g,'').replace(/<\/p>/g,' ');
    let tfIDF = new TfIdf();
    tfIDF.addDocument(textFeed);

    let articleFreq = {};
    tfIDF.listTerms(0).forEach(function(item){
        articleFreq[item.term] = item.tfidf;
    })
    // 將文章的字頻依照分數排列，取前 n 個排進 array 中
    let tfSorted = Object.keys(articleFreq).sort(function(a,b){return articleFreq[b]-articleFreq[a]}).slice(0,dimensionN);
    let wordVector = [];
    for (let i=0; i< tfSorted.length ; i++){
        let termIndex = corpusTF.indexOf(tfSorted[i]);
        // check if exist in corpus freq
        if (termIndex == -1){
            wordVector.push(0);
        }
        // 將頻率當作距離也考慮進去，因為只算夾角的話，如果朝同一個向量方向遠離，夾角不變但歐幾里德距離增加，不太合理
        if (termIndex !== -1){
            wordVector.push(articleFreq[tfSorted[i]]);
        }
    }
    return wordVector;
}

// 算 cos theta similarity
function sqrtOfSumSq (array){
    let sumSquare = 0;
    for (let i=0; i< array.length;i++){
        sumSquare += Math.pow(array[i],2);
    }
    return Math.sqrt(sumSquare);
}

// cos theta 越接近 1 代表夾角越接近 0 度，也代表兩個向量的越相似
function cosDistance (arr1,arr2){
    let sumOfArrayMultiply = 0; 
    for (let i =0; i< arr1.length;i++){
        sumOfArrayMultiply += arr1[i]*arr2[i]; 
    }
    return sumOfArrayMultiply/(sqrtOfSumSq(arr1)*sqrtOfSumSq(arr2));
}

// 找到最相近的三篇文章 (return 回 media id, article id, 篇數)
function findSimilarArticle (allArticle, corpusTF, returnN){
    // allArticle 參數應要 array，含有每篇 article 的 obj 其中至少有 article_id 和 content 兩個 property
    // 計算每篇文章的 vector 存回 obj 裡
    for(let i=0; i < allArticle.length;i++){
        let targetVector = calWordVector(allArticle[i].text,corpusTF,dimensionN); // allArticle[i].text 的 text 必須跟撈出文章後給的 property name 一樣
        allArticle[i].vector = targetVector;
    }
    // vector 間逐一計算餘弦相似度
    for(let j=0; j<allArticle.length;j++){
        let cosDistObj = {};
        for (let k=0;k<allArticle.length;k++){
            let cosD = cosDistance(allArticle[j].vector,allArticle[k].vector);
            cosDistObj[allArticle[k].id] = cosD;
        }
        // 排序後拿回前三個分數的 id 
        let result = Object.keys(cosDistObj).sort(function(a,b){return cosDistObj[b]-cosDistObj[a]}).slice(1,returnN+1); // 因為第一篇會是自己
        allArticle[j].similar = result;
    }
    return allArticle;
}

con.query('SELECT id, context FROM washingtonpost WHERE context != ""', (err,result)=>{
    let articleList = [];
    // 把所有文章撈出來
    result.forEach(function(article){
        articleList.push(Object.assign({id: article.id, text: article.context}));
    });
    // console.log(articleList);

    let corpus = calCorpusTF(articleList,dimensionN);
    // console.log(corpus);
    
    findSimilarArticle(articleList,corpus,3);
    
})