const uploadS3 = require('../controllers/s3.js');

const url = 'https://cms.qz.com/wp-content/uploads/2019/05/RTS16OMC.jpg?quality=75&strip=all&w=410&h=273';
uploadS3(url, 'test', 's3uploadtest', (finalURL)=>{
	console.log(finalURL);
});
