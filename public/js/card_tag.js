/* global dateFormat */
/* exported createArticleCard */
/* eslint no-unused-vars: ["error", {"vars": "local"}] */

/**
 * Create article cards on index page
 * @param {array} array contains all article information to be shown
 * @param {obj} parentElement Where the card elements append
 * @return {undefined}
 */
function createArticleCard(array, parentElement) {
	for (let i=0; i<array.length; i++) {
		const card = createElement('div', ['card', 'card-size', 'mobile-card'], false, parentElement);
		const cardHeader = createElement('div', ['card-header'], false, card);
		const headerRow = createElement('div', ['row'], false, cardHeader);
		const source = createElement('span', ['col-7', 'padding-fix'], false, headerRow);
		const time = createElement('span', ['col-5', 'padding-fix', 'text-right'], false, headerRow);
		const cardBody = createElement('div', ['card-body', 'mobile-card-body'], false, card);
		if (array[i].main_img === 'null' || array[i].main_img === 'undefined') {
			let defaultImg;
			switch (array[i].news) {
			case 'Aljazeera':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/aljazeera_default.png';
				break;
			case 'BBC':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/bbc_default.png';
				break;
			case 'CNN':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/cnn_default.jpg';
				break;
			case 'The Economist':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/economist_default.png';
				break;
			case 'The Guardian':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/guardain_default.jpg';
				break;
			case 'INDEPENDENT':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/independent_default.png';
				break;
			case 'New York Times':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/nytimes_default.jpg';
				break;
			case 'QUARTZ':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/quartz_default.jpg';
				break;
			case 'The Washington Post':
				defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/wpost_default.jpg';
				break;
			}
			const mainImgLink = createElement('a', ['mobile-img'], {href: defaultImg}, cardBody);
			const mainImg = createElement('div', ['main-img'], {}, mainImgLink);
			mainImg.setAttribute('style', `width: 100%; height: 180px; background-image: url(${defaultImg}); background-size:contain; background-repeat: no-repeat; background-position: center;`);
		} else {
			console.log(language);
			const mainImgLink = createElement('a', ['mobile-img'], {href: myDictionary[language].href+`view/article?id=${array[i].id}`}, cardBody);
			const mainImg = createElement('div', ['main-img'], {}, mainImgLink);
			mainImg.setAttribute('style', `width: 100%; height: 180px; background-image: url(${array[i].main_img}); background-size: contain; background-repeat: no-repeat; background-position: center;`);
		}
		const textBlock = createElement('div', ['text-block'], false, cardBody);
		const titleLink = createElement('a', ['card-title'], {href: myDictionary[language].href+`view/article?id=${array[i].id}`}, textBlock);
		const title = createElement('h4', ['card-title', 'padding-fix'], false, titleLink);

		const abstract = createElement('p', ['card-text', 'abstract'], false, textBlock);
		const tagContainer = createElement('div', ['card-tag'], false, textBlock);
		const readBlock = createElement('div', ['read-block'], false, textBlock);
		const readMore = createElement('a', ['card-link', 'read-more'], {href: myDictionary[language].href+`view/article?id=${array[i].id}`}, readBlock);
		const viewImage = createElement('img', ['viewed'], {src: 'https://s3.amazonaws.com/wheatxstone/news/iconfinder_view_126581.png'}, readBlock);
		const viewCount = createElement('p', ['view-count'], false, readBlock);
		getTag(array[i].id, tagContainer);
		source.innerHTML = array[i].news;
		time.innerHTML = dateFormat(array[i].unixtime);
		title.innerHTML = array[i].title;
		if (array[i].abstract.length>260) {
			array[i].abstract = array[i].abstract.substring(0, 260)+'...';
		}
		abstract.innerHTML = array[i].abstract;
		readMore.innerHTML = myDictionary[language].cardReadMore;
		viewCount.innerHTML = array[i].viewed_count + myDictionary[language].cardViewed;
	}
	// 一列三個卡片，如果不足列，補齊
	const itemPerRow = 3;
	const remainder = array.length%itemPerRow;
	if (remainder==2) {
		createElement('div', ['card', 'card-size', 'hidden-card'], false, parentElement);
	}
	if (remainder==1) {
		createElement('div', ['card', 'card-size', 'hidden-card'], false, parentElement);
		createElement('div', ['card', 'card-size', 'hidden-card'], false, parentElement);
	}
}

/**
 * Get tags by article ID
 * @param {int} id article id
 * @param {obj} tagContainer Where the tag elements append
 * @return {undefined}
 */
function getTag(id, tagContainer) {
	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			const tagArray = JSON.parse(this.responseText);
			const tagStarter = createElement('div', false, false, tagContainer);
			createElement('div', ['tag-space'], false, tagContainer);
			tagStarter.innerHTML = myDictionary[language].tagStarter;
			for (let i=0; i<tagArray.length; i++) {
				const tagNode = createElement('a', ['tag-link'], {href: myDictionary[language].href+`?tag=${tagArray[i]}`}, tagContainer);
				tagNode.innerHTML = '#'+tagArray[i];
				createElement('div', ['tag-space'], false, tagContainer);
			}
		}
	};
	xhr.open('GET', myDictionary[language].route+`/card/tags?id=${id}`, true);
	xhr.send();
}
