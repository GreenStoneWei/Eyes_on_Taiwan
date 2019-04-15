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
                                // resolve();
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
                            // resolve();
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
                    promiseInsert(res, array,j+1,newsname, identifier);
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
module.exports = {
    insertUrlList: insertUrlList,
    promiseInsert: promiseInsert
};
    