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


con.query('SELECT id, context FROM article WHERE news_id > 1', (err,result)=>{
    let fetched = 0;
    for (let i =0; i<result.length;i++){
        if (result[i].context !== null && result[i].context !==''){
            let content = result[i].context.replace(/<p>/g,'').replace(/<\/p>/g,' ');
            let abstract = abstractGen.abstractGen(content);
            abstract = abstract.replace(/'/g,"\\'").replace(/\"/g,'\\"');
            con.query(`UPDATE article SET abstract = "${abstract}" WHERE id = ${result[i].id}`, (err,result)=>{
                fetched++;
                console.log(i);
                if (err){
                    console.log(err);
                    throw err;
                }
                if (fetched == result.length){
                    console.log('done');
                }
            })
        }
        else{
            fetched++;
        }
    }
})