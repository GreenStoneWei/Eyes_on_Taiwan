const mysql = require("mysql");
const request = require("request");
const cheerio = require("cheerio");
const uploadImgToS3 = require('../controllers/s3.js')
const con = mysql.createConnection({
	host:"localhost",
	user:"root",
	password:"@WEIzinc6538",
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


con.query('SELECT id, content, url FROM article WHERE news_id = 1', function(err, article){
    if(err){
        console.log(error);
        return;
    }
    else{
        console.log(article[0].url);
        let fetched = 0;
        // for (let i = 0 ; i < article.length; i++){
            let options = {
                // url: 'https://www.washingtonpost.com/business/why-might-china-want-to-steal-these-silicon-secrets/2019/04/11/55ebbdf4-5c56-11e9-98d4-844088d135f2_story.html?noredirect=on&utm_term=.e3b12dd1cc08',
                url: article[0].url,
                method: "GET"
            }
            // if (article[i].content === null){
                request(options, function(error, response, body){
                    if (error || !body) {
                        console.log(error);
                        return;
                    }
                    let $ = cheerio.load(body);
                    console.log($.html());
                    // let main_img = $('#article-body article .inline-photo').find('img').attr('src');
                    let paragraph = $('article').children();
                    let context = '';
                    let content = {};
                    for (let j = 0; j < paragraph.length; j++){
                        if(paragraph.get(j).tagName == 'p'){
                            let p = paragraph.eq(j).text();
                            if(p.startsWith('Read more')){
                                break;
                            }
                            else{
                                let propertyName = j+'_p';
                                content[propertyName] = p;
                                context += '<p>' + p + '</p>';
                            }
                        }
                        else if(paragraph.get(j).tagName == 'h3'){
                            let propertyName = j+'_h3';
                            let h3 = paragraph.eq(j).text();
                            content[propertyName] = h3;
                            context += '<h3>' + h3 + '</h3>';
                        }
                        // else if(paragraph.get(j).tagName == 'div'){
                        //     if(paragraph.eq(j).find('img').length > 0){
                        //         let src = paragraph.eq(j).find('img').attr('src');
                        //         console.log(src);
                        //         console.log(j);
                        //         context += `<img src="${src}">`;
                        //     }
                        // }
                    }
                    // context = context.replace(/"/g,'\\"').replace(/'/g,"\\'"); 
                    console.log(context);
                    console.log(content);
                    // con.query(`UPDATE washingtonpost SET main_img = "${main_img}", context = "${context}" WHERE id = ${article[i].id}`, function(err,result){
                    //     if (err){
                    //         fetched++;
                    //         console.log(err);
                    //         return;
                    //     }
                    //     fetched++;
                    //     if (fetched === article.length){
                    //         console.log('ok');
                    //         return;
                    //     }
                    // })
                })
            // }
            // else{
            //     fetched++;
            //     if (fetched === article.length){
            //         console.log('All fetched');
            //         return;
            //     }
            // }
        // } // End of for loop
    }
}) // End of query
