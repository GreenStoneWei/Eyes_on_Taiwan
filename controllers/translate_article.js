const mysql   = require('../util/mysql.js');
const credential = require('../util/credentials.js');
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

mysql.conPool.getConnection((err,connection)=>{
    if (err) throw err;
    mysql.conPool.query('SELECT * FROM article WHERE id > 251', async (err,result)=>{
        connection.release();
        if (err) throw err;
        try{
            for(let i=0; i<result.length;i++){
                let article = result[i];
                let translatedTitle = await translate.translate(article.title, translateTarget);
                if (article.subtitle !== 'null' && article.subtitle !== null){
                    let translatedSubtitle = await translate.translate(article.subtitle, translateTarget);
                    article.subtitle = translatedSubtitle[0];
                }
                let translatedabstract = await translate.translate(article.abstract, translateTarget);
                let translatedContext = await translate.translate(article.context, translateTarget);
                let oneRow = {
                    id: article.id,
                    news_id: article.news_id,
                    url: article.url,
                    title: translatedTitle[0],
                    subtitle: article.subtitle,
                    abstract: translatedabstract[0],
                    author: article.author,
                    src_datetime: article.src_datetime,
                    unixtime: article.unixtime,
                    context: translatedContext[0],
                    content: article.content,
                    main_img: article.main_img,
                    similar_article: article.similar_article
                }
                connection.query('INSERT INTO article_zh_tw SET ?', oneRow, (err,result)=>{
                    if(err)throw err;
                    console.log(article.id+ ' done');
                })
            }
        }    
        catch(e){
            throw e;
        }
    })
})
