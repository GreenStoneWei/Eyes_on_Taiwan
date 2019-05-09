
const container = document.querySelector('.article');
const recommenderBlock = document.querySelector('.recommender-block');
const comment = document.querySelector('.fb-comments');
const langSwitcher = document.getElementById('translation');

document.addEventListener('DOMContentLoaded', (event) => {
	event.preventDefault();

	const endPoint = '/view/article/'+ getEndPoint(window.location.href);
	setAttributes(langSwitcher, {href: endPoint});

	const xhr = new XMLHttpRequest();
	const qsID = getParameterByName('id');
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			const article = JSON.parse(this.responseText);
			const source = createElement('div', ['source'], false, container);
			const h1 = createElement('h1', ['title'], false, container);
			const meta = createElement('div', ['meta'], false, container);
			const datetime = createElement('div', ['datetime'], false, meta);
			// if there is no subtitle, don't create an element
			if (article[0].subtitle !== 'null' && article[0].subtitle !== '') {
				const subtitle = createElement('h3', ['subtitle'], false, container);
				subtitle.innerHTML = article[0].subtitle;
			}
			if (article[0].main_img !== 'undefined') {
				const img = createElement('div', ['img'], {}, container);
				img.setAttribute('style', `width: 100%; background-image: url(${article[0].main_img}); background-size:contain; background-repeat: no-repeat; background-position: center;`);
			}
			const content = createElement('div', ['content'], false, container);
			const btnContainer = createElement('div', ['btn-container'], false, container);
			const origin = createElement('a', ['btn', 'btn-info', 'btn-width'], {href: article[0].url, role: 'button'}, btnContainer);

			source.innerHTML = article[0].news;
			h1.innerHTML = article[0].title;
			if (article[0].author !== null && article[0].author !== ''&& article[0].author !== 'null') {
				const author = createElement('div', ['author'], false, meta);
				author.innerHTML = article[0].author;
			}
			datetime.innerHTML = dateFormat(article[0].unixtime);
			content.innerHTML = article[0].context;
			origin.innerHTML = '站外原文';

			const recommendTitle = createElement('h3', ['recommend-title'], false, recommenderBlock);
			recommendTitle.innerHTML = '閱讀相關文章';
			const recommendWrap = createElement('div', ['recommend-wrap'], false, recommenderBlock);
			createArticleCard(article[0].similar_article, recommendWrap);

			comment.dataset.href = window.location.href;
		}
	};
	xhr.open('GET', `/api/zh-tw/article?id=${qsID}`, true);
	xhr.send();
});
