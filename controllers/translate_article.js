const mysql   = require('../util/mysql.js');
const credential = require('../util/credentials.js');
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

mysql.conPool.getConnection((err,connection)=>{
    if (err) throw err;
    mysql.conPool.query('SELECT * FROM article WHERE id > 321', async (err,result)=>{
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
                    title_zhtw: translatedTitle[0],
                    subtitle_zhtw: article.subtitle,
                    abstract_zhtw: translatedabstract[0],
                    context_zhtw: translatedContext[0]
                }
                connection.query(`UPDATE article SET ? WHERE id = ${article.id}`, oneRow, (err,result)=>{
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
