const express = require('express');
const app = express();
const mysql = require('./util/mysql.js');
app.use(express.static('public'));

// CORS Control
app.use("/", function(req, res, next){
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
	res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
	res.set("Access-Control-Allow-Credentials", "true");
	next();
});

const scraping = require('./routes/scraping');
app.use('/', scraping);

const api = require('./routes/api.js')
app.use('/api', api)

app.get('/', (req, res) => {
  res.send('Hello My Server!');
})

function getArticleByNewsName (newsName, array){
    return new Promise((resovle,reject)=>{
        mysql.conPool.query(`SELECT * FROM ${newsName}`,function(error,result){
            if (error){
                console.log(`error at ${newsName} query`);
                reject(error);
            }
            let fetched = 0;
            for (let i=0; i< result.length;i++){
                if (result[i].context !== "" && result[i].title !== null){
                    fetched ++;
                    array.push(result[i]);
                }
                fetched ++;
                if (fetched == result.length){
                    resovle();
                }
            }
        })
    })
}



app.get('/singletest', (req, res) => {
    let options = {
        url: "https://sitesearchapp.washingtonpost.com/sitesearch-api/v2/search.json?count=20&datefilter=displaydatetime:%5B*+TO+NOW%2FDAY%2B1DAY%5D&facets.fields=%7B!ex%3Dinclude%7Dcontenttype,%7B!ex%3Dinclude%7Dname&highlight.fields=headline,body&highlight.on=true&highlight.snippets=1&query=taiwan&sort=&callback=angular.callbacks._0",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            return;
        }
        let trimBody = body.replace('/**/angular.callbacks._0(', '').replace(');',''); // remove redundant characters 
        let url = JSON.parse(trimBody).results.documents[0].contenturl;
        const $ = cheerio.load(body); // 載入 body
        let title = $('.topper-headline').text();
        let author = $('.author-name').eq(0).text();
        let date = $('.author-timestamp').attr('content');
        let article = $('article').find('p');
        console.log(article.length);
        let p2 = article.eq(1).text();
        let p3 = $('article').find('p')[22].text();
        let temp = {Title: title,
                    Author: author,
                    Date: date,
                    P2: p2}
        res.send(url);
        })
})
app.get('/pendingtest', (req,res)=>{
	let array = ['a','b','c','d','e'];
	let pending = array.length;
	let count = 0;
	for (let i=0;i<array.length;i++){
		count += 1;
		// pending = pending - 1;
        console.log('pending=' + pending);
        console.log('count= '+count);
        if (--pending===0){
            console.log('finished');
            res.end();
            break;
        }
	}
})

app.get('/existtest',(req,res)=>{
//    let arrayTest = ['a','b','c','d','e'];
//    let pending = arrayTest.length;
//    for (let i =0 ; i< arrayTest.length; i++){
//        console.log(arrayTest[i])
//        if (--pending===0){
//            res.send('finished');
//        }
//    }
    mysql.conPool.query('SELECT * FROM guardian', function(err,result){
        res.send(result);
    })
})
app.listen(3000, () => {
  console.log('The application is running on localhost:3000!');
});
