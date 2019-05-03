const mysql   = require('../util/mysql.js');
const credential = require('../util/credentials.js');
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

mysql.conPool.getConnection((err,connection)=>{
    if (err) throw err;
    mysql.conPool.query('SELECT * FROM tag WHERE id > 348', async (err,result)=>{
        connection.release();
        if (err) throw err;
        try{
            for(let i=0; i<result.length;i++){
                let tag = result[i];
                let translatedTag = await translate.translate(tag.tag, translateTarget);
                connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [translatedTag[0], tag.id], (err,result)=>{
                    if(err)throw err;
                    console.log(tag.id+ ' done');
                })
            }
        }    
        catch(e){
            throw e;
        }
    })
})
