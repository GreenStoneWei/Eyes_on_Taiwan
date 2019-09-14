const express = require('express')
const app = express()
const credentials = require('./util/credentials.js')
app.use(express.static('public'))

// CORS Control
app.use('/', function (req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization')
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.set('Access-Control-Allow-Credentials', 'true')
	next()
})

app.use(require('prerender-node').set('prerenderToken', credentials.myPreRenderToken));

app.set('view engine', 'ejs');

const scraping = require('./routes/scraping');
app.use('/', scraping);

const renderView = require('./routes/renderview/renderarticle');
app.use('/', renderView);

const api = require('./routes/api.js');
app.use('/api', api);


app.listen(8000, () => {
	console.log('The application is running on localhost:8000!');
});
