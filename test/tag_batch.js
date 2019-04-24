const mysql = require("mysql");
const natural = require('natural');
const credential = require('../util/credentials.js');
const abstractGen = require('../util/abstract.js');
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

function tagGen (id, content){
    let tfidf = new TfIdf();
    let tagFreq = {};
    tfidf.addDocument(content);
    tfidf.listTerms(0).forEach(function(item){
        tagFreq[item.term] = item.tfidf;
    })
    let sortedFreq = Object.keys(tagFreq).sort(function(a,b){return tagFreq[b]-tagFreq[a]});
    let tag = [];
    for (let i=0; i< 10; i++){
        if (sortedFreq[i].toLowerCase()!=='taiwan'){
            let oneRow = [id, sortedFreq[i]];
            tag.push(oneRow);
        }
    }
    return tag;
}

const TfIdf = natural.TfIdf;

con.query('SELECT id, context FROM article', (err,result)=>{
    let calTag =0;
    for (let i = 0 ; i < result.length ; i++){
        // 處理 context = null;
        if( result[i].context=='' || result[i].context == null){
            calTag++;
            if(calTag==result.length){
                console.log('Done');
            }
        }
        else{
            let articleID = result[i].id;
            let article = result[i].context;
            article = article.replace(/<h2>/g,'').replace(/<\/h2>/g,' ').replace(/<h3>/g,'').replace(/<\/h3>/g, ' ').replace(/<p>/g,'').replace(/<\/p>/g,' ');
            let tag = tagGen(articleID, article);
            con.query('INSERT INTO tag (article_id, tag) VALUES ?',[tag],(err,result)=>{
                calTag++
                console.log(i);
                if(err){
                    console.log('>>>>>' + i + '\n'+ err);
                }
                if(calTag==result.length){
                    console.log('Done');
                }
            })
        }
    }
})


// let tfidf = new TfIdf();
// tfidf.addDocument(article);
// let tagFreq = {};

// tfidf.listTerms(0).forEach(function(item){
//     tagFreq[item.term] = item.tfidf;
// })
// let sortedFreq = Object.keys(tagFreq).sort(function(a,b){return tagFreq[b]-tagFreq[a]});
// let tag =[];
// for (let i=0; i< 4; i++){
//     if (sortedFreq[i].toLowerCase()!=='taiwan'){
//         tag.push(sortedFreq[i]);
//     }
// }
// return tag;
