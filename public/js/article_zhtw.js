const container = document.querySelector('.article');
const recommenderBlock = document.querySelector('.recommender-block');
const comment = document.querySelector('.fb-comments');
const langSwitcher = document.getElementById('translation');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();

    let endPoint = '/view/article/'+ getEndPoint(window.location.href);
    setAttributes(langSwitcher,{href:endPoint});

    let xhr = new XMLHttpRequest();
    let qsID = getParameterByName('id');
    xhr.onreadystatechange = function(){
      if (this.readyState == 4 && this.status == 200) {
        let article = JSON.parse(this.responseText);
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
          let img = createElement("div",["img"],{},container);
          img.setAttribute("style",`width: 100%; background-image: url(${article[0].main_img}); background-size:contain; background-repeat: no-repeat; background-position: center;`);
        }        
        let content = createElement('div',['content'],false,container);
        let btnContainer = createElement('div',['btn-container'],false,container);
        let origin = createElement('a',['btn','btn-info','btn-width'],{href:article[0].url, role:'button'},btnContainer);
        
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
        recommendTitle.innerHTML = '閱讀相關文章';
        let recommendWrap  = createElement('div',['recommend-wrap'],false, recommenderBlock);
        createArticleCard(article[0].similar_article, recommendWrap);

        comment.dataset.href = window.location.href;
      }
    };
    xhr.open("GET", `/api/zh-tw/article?id=${qsID}`, true);
    xhr.send();
}) 
