// crontab job
// 0 */6 * * * node /path/to/promise_schedule.js

const myLib = require('../util/config.js');
const request = require('request');
const localHost = 'http://localhost:3000';
const domainName = 'https://wheatxstone.com';
const host = localHost;

const fixImgs = require('./img_fixer.js');
const findSimilarArticle = require('./similar_article_finder.js').calSimilarArticle;
const translator = require('./translator.js');

const routeList = ['/washingtonpost/list',
	'/independent/list',
	'/quartz/list',
	'/economist/list',
	'/guardian/list',
	'/aljazeera/list',
	'/nytimes/list',
	'/cnn/list',
	'/bbc/list'];


const getNewArticle = function() {
	const promiseArray = [];
	for (let i=0; i<routeList.length; i++) {
		let onePromise = 'promise' + i.toString();
		onePromise = new Promise((resolve, reject)=>{
			const options = {
				url: host+routeList[i],
				method: 'GET',
			};
			request(options, function(error, response, body) {
				if (error || !body) {
					reject(error);
				} else {
					console.log(body);
					resolve('article update');
				}
			});
		});
		promiseArray.push(onePromise);
	}
	return promiseArray;
};

/**
 * Fix lost images that didn't be scraped.
 * @return {undefine} none.
 */
async function schedule() {
	try {
		const scrapeTask = getNewArticle();
		await Promise.all(scrapeTask);
		await fixImgs();
		await findSimilarArticle();
		await translator.article();
		await translator.tag();
		console.log('all done');
	} catch (error) {
		myLib.log(error);
	}
}

schedule();
