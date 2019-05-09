const request = require("request");
const aws = require('aws-sdk');
const s3 = new aws.S3();
const sharp = require('sharp');
const credential = require('../util/credentials.js');
const awsS3 = 'https://s3.amazonaws.com/wheatxstone/news/';
const cdn = 'https://d37273sceiavoe.cloudfront.net/news/';

aws.config.update({
    secretAccessKey: credential.awsConfig.secretAccessKey,
    accessKeyId: credential.awsConfig.accessKeyId,
    region: 'us-east-1'
});

const uploadImgToS3 = function(url, newsBucket, fileName, callback){
    let options = {
        url: url,
        encoding: null
    }
    request(options, function(error, response, body) {
        if (error || response.statusCode !== 200) { 
            callback(url);
        } 
        else {
            sharp(body)
            .resize({canvas: 'max', height: 630, width: 1200, withoutEnlargement: true})
            .toBuffer((error,data,info)=>{
                if(error){
                    callback(url);
                    return;
                }
                s3.putObject({
                    Body: data,
                    Key: fileName,
                    Bucket: 'wheatxstone/news/'+newsBucket,
                    ACL: 'public-read'
                }, function(error, data) { 
                    if (error) {
                        callback(url);
                        return;
                    } else {
                        callback(cdn+newsBucket+'/'+fileName);
                    }
                }); 
            })
        }   
    });
}

module.exports = uploadImgToS3;
