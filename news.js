const express = require('express');
const app = express();
const mysql = require('./util/mysql.js');
const request = require("request");
app.use(express.static('public'));

// CORS Control
app.use("/", function(req, res, next){
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
	res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
	res.set("Access-Control-Allow-Credentials", "true");
	next();
});

const scraping = require('./routes/scraping');
app.use('/', scraping);

const api = require('./routes/api.js')
app.use('/api', api)

const autoDeploy = require('./controllers/autodeploy')
app.use('/', autoDeploy);

// app.get('/', (req, res) => {
//   res.send('Hello My Server!');
// })




app.get('/singletest', (req, res) => {
    let options = {
        url: "https://s3.amazonaws.com/wheatxstone/news/wpost_default.jpg",
        method: "GET"
    }
    request(options, function(error, response, body){
        if (error || !body) {
            return;
        }
        res.end();
        })
})

const fs = require('fs');

app.get('/downloadtest', (req,res)=>{
    let download = function(uri, filename, callback){
        request.head(uri, function(err, res, body){
            console.log('content-type:', res.headers['content-type']);
            console.log('content-length:', res.headers['content-length']);
            request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
    };
    
    download('https://s3.amazonaws.com/wheatxstone/news/wpost_default.jpg', 'test.png', function(){
        console.log('done');
    });
})



app.get('/schedule/test',(req,res)=>{
    console.log('schedule test!');
    res.end();
})

app.listen(3000, () => {
  console.log('The application is running on localhost:3000!');
});
