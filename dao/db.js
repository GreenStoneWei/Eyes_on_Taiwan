const mysql = require('../util/mysql.js');
const myLib = require('../util/config.js');

const insertUrlList = function(res ,array, j, newsname, identifier, redirect){
    // return new Promise(function(resolve,reject){
        if (j < array.length){
            mysql.conPool.getConnection((err,con)=>{
                if (err){
                    myLib.log(err);
                    insertUrlList(res, array,j+1,newsname, identifier, redirect);
                }
                let checkIfExist = `SELECT * FROM ${newsname} WHERE ${identifier} = ?`;
                con.query(checkIfExist, array[j][identifier] ,function(err, rows){
                    con.release();
                    if (err){
                        console.log('aaa');
                        myLib.log(err);
                        insertUrlList(res, array,j+1,newsname, identifier, redirect);
                    }
                    if (rows.length === 0){
                        let insertNewURL = `INSERT INTO ${newsname} SET ?`;
                        let oneRow = {
                                    url: array[j].url,
                                    source: array[j].source,
                                    main_img: array[j].main_img,
                                    category: array[j].category,
                                    title: array[j].title,
                                    subtitle: array[j].subtitle, 
                                    abstract: array[j].abstract,
                                    author: array[j].author, 
                                    src_datetime: array[j].src_datetime, 
                                    unixtime: array[j].unixtime,
                                    context: array[j].context,
                                    translate: array[j].translate,
                                    tag: array[j].tag,
                                    main_img: array[j].main_img
                        }
                        con.query(insertNewURL, oneRow, function(err, result, fields){
                            if(err){
                                console.log('bbb');
                                myLib.log(err);
                                // insertUrlList(res, array,j+1,newsname, identifier, redirect);
                            }
                            if (j===array.length-1){
                                console.log('last A');
                                res.redirect(redirect);
                                return;
                            }
                            else{
                                console.log('running '+j);
                                insertUrlList(res, array,j+1,newsname, identifier, redirect);
                            }
                        })
                    }
                    else{
                        if (j===array.length-1){
                            console.log('last '+j);
                            res.redirect(redirect);
                            return;
                        }
                        else{
                            console.log('ccc '+j);
                            insertUrlList(res, array,j+1,newsname, identifier, redirect);
                        }
                    }
                })
            })
        }
    // }) // end of Promise
}

const promiseInsert = function(array, j, newsname, identifier){
    return new Promise(function(resolve,reject){
        if (j < array.length){
            mysql.conPool.getConnection((err,con)=>{
                if (err){
                    myLib.log(err);
                    promiseInsert(array,j+1,newsname, identifier);
                }
                let checkIfExist = `SELECT * FROM ${newsname} WHERE ${identifier} = ?`;
                con.query(checkIfExist, array[j][identifier] ,function(err, rows){
                    con.release();
                    if (err){
                        console.log('aaa');
                        myLib.log(err);
                        promiseInsert(array,j+1,newsname, identifier).then(()=>{
                            resolve('111');
                        });
                    }
                    if (rows.length === 0){
                        let insertNewURL = `INSERT INTO ${newsname} SET ?`;
                        let oneRow = {
                                    url: array[j].url,
                                    source: array[j].source,
                                    main_img: array[j].main_img,
                                    category: array[j].category,
                                    title: array[j].title,
                                    subtitle: array[j].subtitle, 
                                    abstract: array[j].abstract,
                                    author: array[j].author, 
                                    src_datetime: array[j].src_datetime, 
                                    unixtime: array[j].unixtime,
                                    context: array[j].context,
                                    translate: array[j].translate,
                                    tag: array[j].tag,
                                    main_img: array[j].main_img
                        }
                        con.query(insertNewURL, oneRow, function(err, result, fields){
                            if(err){
                                console.log('bbb');
                                myLib.log(err);
                            }
                            if (j===array.length-1){
                                console.log('last A');
                                resolve();
                            }
                            else{
                                console.log('running '+j);
                                promiseInsert(array,j+1,newsname, identifier).then(()=>{
                                    resolve();
                                });
                            }
                        })
                    }
                    else{
                        if (j===array.length-1){
                            console.log('last '+j);
                            resolve();
                        }
                        else{
                            console.log('ccc '+j);
                            promiseInsert(array,j+1,newsname, identifier).then(()=>{
                                resolve();
                            });
                            
                        }
                    }
                })
            })
        }
    }) // end of Promise
}

const addToDB = function(array, j, news_id, identifier){
    return new Promise(function(resolve,reject){
        if (j < array.length){
            mysql.conPool.getConnection((err,con)=>{
                if (err){
                    myLib.log(err);
                    addToDB(array, j+1, news_id, identifier);
                }
                let checkIfExist = `SELECT * FROM article WHERE news_id = ${news_id} AND ${identifier} = ?`;
                con.query(checkIfExist, array[j][identifier] ,function(err, rows){
                    con.release();
                    if (err){
                        console.log('aaa'+err);
                        myLib.log(err);
                        addToDB(array, j+1, news_id, identifier).then(()=>{
                            reject('111');
                        });
                    }
                    if (rows.length === 0){
                        let insertNewURL = `INSERT INTO article SET ?`;
                        let oneRow = {
                                    news_id: `${news_id}`,
                                    url: array[j].url,
                                    title: array[j].title,
                                    subtitle: array[j].subtitle,
                                    abstract: array[j].abstract,
                                    author: array[j].author, 
                                    src_datetime: array[j].src_datetime,
                                    unixtime: array[j].unixtime,
                                    content: array[j].content,
                                    context: array[j].context,
                                    main_img: array[j].main_img,
                                    similar_article: array[j].similer_article
                        }
                        con.query(insertNewURL, oneRow, function(err, result, fields){
                            if(err){
                                console.log('bbb');
                                myLib.log(err);
                                addToDB(array, j+1, news_id, identifier).then(()=>{
                                    reject('555');
                                });
                            }
                            if (j===array.length-1){
                                console.log('last A');
                                resolve('last');
                            }
                            else{
                                console.log('running '+j);
                                addToDB(array, j+1, news_id, identifier).then(()=>{
                                    resolve();
                                });
                            }
                        })
                    }
                    else{
                        if (j===array.length-1){
                            console.log('last '+j);
                            resolve();
                        }
                        else{
                            console.log('ccc '+j);
                            addToDB(array, j+1, news_id, identifier).then(()=>{
                                resolve();
                            });
                            
                        }
                    }
                })
            })
        }
    }) // end of Promise
}

const addTag = function(tagArray){
    return new Promise ((resolve,reject)=>{
        mysql.conPool.query('INSERT INTO tag (article_id,tag) VALUES ? ',[tagArray],(err,result)=>{
            if (err){
                reject(err);
                return;
            }
            resolve('Tag added.');
        })
    })
}

module.exports = {
    insertUrlList: insertUrlList,
    promiseInsert: promiseInsert,
    addToDB: addToDB,
    addTag: addTag
};
    