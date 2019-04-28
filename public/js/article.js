const container = document.querySelector('.container');
const recommenderBlock = document.querySelector('.recommender-block');
const comment = document.querySelector('.fb-comments');
// const head = document.getElementsByTagName('head')[0];
function shareOverrideOGMeta(overrideLink, overrideTitle, overrideDescription, overrideImage)
{
	FB.ui({
		method: 'share_open_graph',
		action_type: 'og.likes',
		action_properties: JSON.stringify({
			object: {
				'og:url': overrideLink,
				'og:title': overrideTitle,
				'og:description': overrideDescription,
				'og:image': overrideImage
			}
		})
	},
	function (response) {
	// Action after response
	});
}
 

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let xhr = new XMLHttpRequest();
    let qsID = getParameterByName('id');
    xhr.onreadystatechange = function(){
      if (this.readyState == 4 && this.status == 200) {
        let article = JSON.parse(this.responseText);

        let metaObj = {
          url: window.location.href,
          title: article[0].title,
          image: article[0].main_img
        }

        $('meta[property="og:title"]').attr('content', metaObj.title);
        $('meta[property="og:url"]').attr('content', metaObj.url);
        $('meta[property="og:image"]').attr('content', metaObj.image);

        // FB.ui({
        //     method: 'share',
        //     href: metaObj.url,
        //     type: metaObj.type,
        //     picture: metaObj.image,
        //     title: metaObj.title
        //   },function(response){
        //     console.log(response);
        //   });


        // setFBmeta(metaObj,head);
        let source   = createElement('div',['source'],false,container);
        let h1       = createElement('h1',['title'],false,container);
        let meta     = createElement('div',['meta'],false,container);
        let datetime = createElement('div',['datetime'],false,meta);
        // if there is no subtitle, don't create an element
        if (article[0].subtitle !== "null" && article[0].subtitle !== ''){
          let subtitle = createElement('h3',['subtitle'],false,container);
          subtitle.innerHTML = article[0].subtitle;
        }
        if (article[0].main_img !== "undefined"){
          let img = createElement('img',['img'],{src:article[0].main_img},container);
          // setAttr(img,{src:article[0].main_img});
        }        
        let content = createElement('div',['content'],false,container);
        let btnContainer = createElement('div',['btn-container'],false,container);
        let origin = createElement('a',['btn','btn-info','btn-width'],{href:article[0].url, role:'button'},btnContainer);
        // add FB share button
        let shareFB = createElement('div',['fb-share-button','btn'],false,btnContainer);
        // shareFB.dataset.href = 'https://4e290507.ngrok.io/article.html?id='+qsID;
        shareFB.dataset.href = window.location.href;
        shareFB.dataset.layout = 'button_count';
        shareFB.dataset.size = 'large';
        // shareFB.addEventListener('click',()=>{
        //   shareOverrideOGMeta(metaObj.url, metaObj.title, '',metaObj.title);
        // })
        //
        // add LINE share button
        let lineBtn = createElement('div',['line-it-button','btn'],false,btnContainer);
        lineBtn.dataset.lang  = 'zh_Hant';
        lineBtn.dataset.type  = 'share-a';
        lineBtn.dataset.ver   = '3';
        lineBtn.dataset.url   = window.location.href;
        lineBtn.dataset.color = 'default';
        lineBtn.dataset.size  = 'large';
        lineBtn.dataset.count = 'true';
        lineBtn.style.display = 'none';
        
        source.innerHTML = article[0].news;
        h1.innerHTML = article[0].title;
        if (article[0].author !== null && article[0].author !== ''&& article[0].author !== 'null'){
            let author = createElement('div',['author'],false,meta);
            author.innerHTML = article[0].author;
        }
        datetime.innerHTML = dateFormat(article[0].unixtime);
        content.innerHTML  = article[0].context;
        origin.innerHTML   = '站外原文';
        
        let recommendTitle = createElement('h3',['recommend-title'],false, recommenderBlock);
        recommendTitle.innerHTML = 'Similar Articles Recommended';
        let recommendWrap  = createElement('div',['recommend-wrap'],false, recommenderBlock);
        createArticleCard(article[0].similar_article, recommendWrap);

        comment.dataset.href = window.location.href;
      }
    };
    xhr.open("GET", `/api/article?id=${qsID}`, true);
    xhr.send();
}) 

/* <div class="source">source</div>
<img>
<h1>Fears over Hong Kong-China extradition plans</h1>
<div class="meta">
    <div class="author">author</div>
    <div class="datetime">2019</div>
</div>
<h2 class="subtitle">This is subtitle</h2>
<div class="content">
    喔喔喔
</div>
<a href="#" class="btn btn-info btn-width" role="button">站外原文</a> */

// 好像不用 在後端做就可以
// function getSimilarArticle(array){
//   let similarArticle = JSON.parse(array);
//   for(let i=0;i<similarArticle.length;i++){
//     let xhr = new XMLHttpRequest();
//     xhr.onreadystatechange = function() {
//       if (this.readyState == 4 && this.status == 200) {
//         let card = JSON.parse(this.responseText);
//         createArticleCard(card, recommender);
//       }
//     };
//     xhr.open("GET", `/api/article?id=${similarArticle[i]}`, true);
//     xhr.send();
//   }
// }