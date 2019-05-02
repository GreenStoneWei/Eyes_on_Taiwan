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
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

con.query('SELECT * FROM article WHERE id = 113',(err,result)=>{
    let context = result[0].context;
    async function googleTranslate(){
        let testTranslation = await translate.translate(context, translateTarget);
        console.log(testTranslation[1].data);
    }
    googleTranslate();
})