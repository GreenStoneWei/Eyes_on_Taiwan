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

con.query('SELECT * FROM washingtonpost', (err,result)=>{
    console.log(result[0]);
    // let context = result[0].context;
    // context = context.replace(/<p>/g,'').split('</p>');
    // console.log(context);
    

    // 這邊原本要改 content 為 json 格式，但一直遇到 json 欄位的 syntax error （missing 的 } or comma）但是用網上工具檢查都是 valid 的 json
    // for(let j=0;j<result.length;j++){
    //     let content = result[j].context.replace(/<p>/g,'').split('</p>');
    //     let contentJSON ={};
    //     for(let k=0;k<content.length;k++){
    //         if(content[k]!==''){
    //             let propertyName = k+'_p';
    //             contentJSON[propertyName] = content[k]; //.replace(/"/g,'\"').replace(/'/g,"\'")
    //         }
    //     }
    //     let jsonStr = JSON.stringify(contentJSON);
        // console.log(jsonStr);
        // let insert = `INSERT INTO article SET news_id = 2,
        //        url = "${result[j].url}"`
    
            //    author = "${result[j].author}",
            //    src_datetime = "${result[j].src_datetime}",
            //    unixtime = ${result[j].unixtime},`
            //    main_img = "${result[j].main_img}"
            //    context = "${result[j].context}"
            //    content = '${jsonStr}'
    //     con.query(insert,(err,result)=>{
    //         if (err) {
    //             console.log(j+'---'+err)
    //             // throw err;
    //         }
    //         console.log(j+ ' Done');
    //     })
    // }
    // title = "${result[j].title}",
    // subtitle = "${result[j].subtitle}",

    for (let i =0; i<result.length; i++){
        let insert = `INSERT INTO article SET news_id = 9,
               url = "${result[i].url}",
               title = "${result[i].title}",
               subtitle = "${result[i].subtitle}",
               author = "${result[i].author}",
               src_datetime = "${result[i].src_datetime}",
               unixtime = ${result[i].unixtime},
               main_img = "${result[i].main_img}"`
        con.query(insert,(err,result)=>{
            if(err){console.log(err)}
            // if(err) throw err;
            console.log( i+' done');
        })
    }
})