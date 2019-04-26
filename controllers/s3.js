const request = require("request");
const aws = require('aws-sdk');
const s3 = new aws.S3();
const sharp = require('sharp');
const credential = require('../util/credentials.js');
const awsS3 = 'https://s3.amazonaws.com/wheatxstone/news/';

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
            // console.log("failed to get image");
            // console.log(error);
            callback(url);
        } 
        else {
            sharp(body)
            .resize({canvas: 'max', height: 360, width: 480, withoutEnlargement: true})
            .toBuffer((error,data,info)=>{
                if(error){
                    // console.log(error);
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
                        // console.log("error downloading image to s3");
                        callback(url);
                        return;
                    } else {
                        // console.log("success uploading to s3");
                        // console.log(awsS3+newsBucket+'/'+fileName);
                        callback(awsS3+newsBucket+'/'+fileName);
                    }
                }); 
            })
        }   
    });
}

module.exports = uploadImgToS3;

// router.get('/upload/test',(req,res)=>{
// 	let options = {
// 			url: 'https://images3.alphacoders.com/975/thumb-1920-975999.png',
// 			encoding: null
// 	}
// 	request(options, function(error, response, body) {
// 			if (error || response.statusCode !== 200) { 
// 					console.log("failed to get image");
// 					console.log(error);
// 			} 
// 			else {
// 					sharp(body)
// 					.resize({ canvas: 'max', height: 360, width: 480, withoutEnlargement: true })
// 					.toBuffer((error,data,info)=>{
// 							if(error){
// 									console.log(error);
// 									res.end();
// 									return;
// 							}
// 							s3.putObject({
// 									Body: data,
// 									Key: 'resize',
// 									Bucket: 'wheatxstone/news',
// 									ACL: 'public-read'
// 							}, function(error, data) { 
// 									if (error) {
// 											console.log("error downloading image to s3");
// 											res.end();
// 									} else {
// 											console.log("success uploading to s3");
// 											res.end();
// 									}
// 							}); 
// 					})
// 			}   
// 	});
// })


// router.get('/upload/test',(req,res)=>{
//     uploadImgToS3('https://images3.alphacoders.com/975/thumb-1920-975999.png','test','callbackTest2',(url)=>{
//         console.log(url);
//         res.end();
//     });
// })