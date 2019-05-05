const mysql = require("mysql");
const con = mysql.createConnection({
	host:"localhost",
	user:"root",
	password:"@WEIzinc6538",
    database:"newscraping",
    debug: true
});
con.connect(function(err){
	if (err) {
		throw err;
    }
    else {
		console.log("mysql Connected!");
	}
});

con.query('SELECT id, main_img FROM article WHERE main_img LIKE "https://s3.amazonaws.com/wheatxstone/news/%" ', (err,result)=>{
    for(let i=0; i<result.length; i++){
        let id = result[i].id;
        let originURL = result[i].main_img;
        let cdnURL = originURL.replace('https://s3.amazonaws.com/wheatxstone/news/','https://d37273sceiavoe.cloudfront.net/news/');
        con.query('UPDATE article SET main_img = ? WHERE id = ?', [cdnURL,id],(err,result)=>{
            console.log(id + ' done');
        })  
    }
    
})