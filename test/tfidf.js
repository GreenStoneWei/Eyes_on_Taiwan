const natural = require('natural');
const mysql = require("mysql");
const credential = require('../util/credentials.js');
const con = mysql.createConnection({
	host:"localhost",
	user:"root",
	password: credential.mysqlPWD,
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


var tokenizer = new natural.WordTokenizer();
var sentencer = new natural.SentenceTokenizer();

var TfIdf = natural.TfIdf;
var tfidf = new TfIdf();

// let text0 = 'this is a car, a big car and apple'
let text1 = 'car is good. I want one.'
// let text2 = 'nothing to do, lame'

// tfidf.addDocument(text0);
tfidf.addDocument(text1);
// tfidf.addDocument(text2);

// tfidf.tfidfs('car', function(i, measure) {
//     console.log('document #' + i + ' is ' + measure);
// });

tfidf.listTerms(0).forEach((item)=>{
    console.log(item.term+' / '+item.tfidf);
})

// con.query('SELECT context FROM cnn WHERE id = 25', (err,result)=>{
    
//     let article = result[0].context;

//     article = article.replace(/<p>/g,'').replace(/<\/p>/g,' ');
//     // console.log(article);
//     // build a dictionary containing important word freq
//     let sentence = sentencer.tokenize(article);
//     let imptDict = {};
//     tfidf.addDocument(article);
//     tfidf.listTerms(0).forEach(function(item){
//         imptDict[item.term] = item.tfidf;
//     })
    
//     let dicTermArr = Object.keys(imptDict);
//     // console.log(imptDict[1]);
//     let sentenceImportanceScore = {};
//     let indexPos = [];
//     for(let i=0; i < sentence.length; i++){
//         let tdiftSent = new TfIdf();
//         tdiftSent.addDocument(sentence[i]); // 找每一個句子的字頻
//         let score = 0;
//         tdiftSent.listTerms(0).forEach(function(item){ // 句子中每一個字的分數 word = item.term
//             let termIndex = dicTermArr.indexOf(item.term);
            
//             // console.log(typeof item.term);
//             if (termIndex !== -1){
//                 score += imptDict[item.term];
//                 // console.log(imptDict[item.term]);
//                 // console.log(sentenceImportanceScore[i]);
//             }
//             // console.log(i+"---"+ x.term + ': ' + x.tfidf);
//         });
//         sentenceImportanceScore[i] = score;
//         indexPos.push(score);
//         // console.log(score);
//     }
//     let keysSorted = Object.keys(sentenceImportanceScore).sort(function(a,b){return sentenceImportanceScore[a]-sentenceImportanceScore[b]})
//     // console.log(keysSorted.slice(-1)[0]);
//     // console.log(imptDict);
//     let indexOfMaxValue = indexPos.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
//     console.log(indexOfMaxValue);
//     // console.log(keysSorted.reverse());
//     console.log(sentence[28])
//     // console.log(sentenceImportanceScore[keysSorted.slice(-1)[0]]);
//     // console.log(sentence[keysSorted.slice(-1)[0]]);
// })