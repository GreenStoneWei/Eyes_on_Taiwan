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

con.query('SELECT * FROM article WHERE news_id = 1', (err,result)=>{
    console.log(result);
})