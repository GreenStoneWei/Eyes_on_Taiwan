function insertUrlList(array, j, newsname, identifier, resdirect){
    if (j < array.length){
        mysql.conPool.getConnection((err,con)=>{
            if (err){
                consoleFile(err);
                insertUrlList(array,j+1,newsname, identifier, resdirect);
            }
            let checkIfTitleExist = `SELECT * FROM ${newsname} WHERE ${identifier} = "${array[j].identifier}"`;
            con.query(checkIfTitleExist, function(err, rows){
                con.release();
                if (err){
                    consoleFile(err);
                    insertUrlList(array,j+1,newsname, identifier, resdirect);
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
                            consoleFile(err);
                            insertUrlList(array,j+1,newsname, identifier, resdirect);
                        }
                        if (j===array.length-1){
                            res.redirect(resdirect);
                            return;
                        }
                        else{
                            insertUrlList(array,j+1,newsname, identifier, resdirect);
                        }
                    })
                }
                else{
                    if (j===array.length-1){
                        res.redirect(resdirect);
                        return;
                    }
                    else{
                        insertUrlList(array,j+1,newsname, identifier, resdirect);
                    }
                }
            })
        })
    }
}