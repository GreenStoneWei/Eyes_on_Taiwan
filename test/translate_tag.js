const mysql   = require('../util/mysql.js');
const credential = require('../util/credentials.js');
const {Translate} = require('@google-cloud/translate');
const projectID = 'moonlit-vine-237907';
const translate = new Translate({projectId: projectID});
const translateTarget = 'zh-tw';

mysql.conPool.getConnection((err,connection)=>{
    if (err) throw err;
    mysql.conPool.query('SELECT * FROM tag WHERE tag_zhtw IS NULL', (err, tobeTranslated)=>{
        connection.release();
        if (err) throw err;
        try{
            for (let i=0; i<tobeTranslated.length;i++){
                let tagID = tobeTranslated[i].id;
                let enTag = tobeTranslated[i].tag;
                connection.query('SELECT id, tag_zhtw FROM tag WHERE tag = ?', enTag, async (err,result)=>{
                    let zhTag = result[0].tag_zhtw;
                    if(zhTag == null){
                        let translatedTag = await translate.translate(enTag, translateTarget);
                        connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [translatedTag[0], tagID], (err,result)=>{
                            if(err)throw err;
                            console.log(tagID + ' done by google translation');
                        })
                    }
                    else{
                        connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [zhTag, tagID],(err,result)=>{
                            console.log(tagID + ' updated by exist dictionary.');
                        })
                    }
                })
            }
            


            // for(let i=0; i<result.length;i++){
            //     let tag = result[i];
            //     let translatedTag = await translate.translate(tag.tag, translateTarget);
            //     connection.query('UPDATE tag SET tag_zhtw = ? WHERE id = ?', [translatedTag[0], tag.id], (err,result)=>{
            //         if(err)throw err;
            //         console.log(tag.id+ ' done');
            //     })
            // }
        }    
        catch(e){
            throw e;
        }
    })
})
