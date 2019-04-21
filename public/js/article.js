const container = document.querySelector('.container');

const setAttr = function(obj,attributes){
	for(let name in attributes){
		obj[name]=attributes[name];
	}
	return obj;
};

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let xhr = new XMLHttpRequest();
    let qsID = getParameterByName('id');
    // let qsSRC = getParameterByName('source');
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let article = JSON.parse(this.responseText);
        console.log(article);
        let source = createElement('div',['source'],false,container);
        let h1 = createElement('h1',['title'],false,container);
        let meta = createElement('div',['meta'],false,container);
        let datetime = createElement('div',['datetime'],false,meta);
        // if there is no subtitle, don't create an element
        if (article[0].subtitle !== "null" && article[0].subtitle !== ''){
          let subtitle = createElement('h3',['subtitle'],false,container);
          subtitle.innerHTML = article[0].subtitle;
        }
        if (article[0].main_img !== "undefined"){
          let img = createElement('img',['img'],false,container);
          setAttr(img,{src:article[0].main_img});
        }        
        let content = createElement('div',['content'],false,container);
        let origin = createElement('a',['btn','btn-info','btn-width'],{href:article[0].url, role:'button'},container); 
        source.innerHTML = article[0].news;
        h1.innerHTML = article[0].title;
        if (article[0].author !== null && article[0].author !== ''){
            let author = createElement('div',['author'],false,meta);
            author.innerHTML = article[0].author;
        }
        datetime.innerHTML = dateFormat(article[0].unixtime);
        content.innerHTML = article[0].context;
        origin.innerHTML = '站外原文';




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


function getSimilarArticle(array){
  let similarArticle = JSON.parse(array);
  for(let i=0;i<similarArticle.length;i++){
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let card = JSON.parse(this.responseText);
        
      }
    };
    xhr.open("GET", `/api/article?id=${similarArticle[i]}`, true);
    xhr.send();
  }
}
    
   
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let article = JSON.parse(this.responseText);
        console.log(article);
        let source = createElement('div',['source'],false,container);
        let h1 = createElement('h1',['title'],false,container);
        let meta = createElement('div',['meta'],false,container);
        let datetime = createElement('div',['datetime'],false,meta);
        // if there is no subtitle, don't create an element
        if (article[0].subtitle !== "null" && article[0].subtitle !== ''){
          let subtitle = createElement('h3',['subtitle'],false,container);
          subtitle.innerHTML = article[0].subtitle;
        }
        if (article[0].main_img !== "undefined"){
          let img = createElement('img',['img'],false,container);
          setAttr(img,{src:article[0].main_img});
        }        
        let content = createElement('div',['content'],false,container);
        let origin = createElement('a',['btn','btn-info','btn-width'],{href:article[0].url, role:'button'},container); 
        source.innerHTML = article[0].news;
        h1.innerHTML = article[0].title;
        if (article[0].author !== null && article[0].author !== ''){
            let author = createElement('div',['author'],false,meta);
            author.innerHTML = article[0].author;
        }
        datetime.innerHTML = dateFormat(article[0].unixtime);
        content.innerHTML = article[0].context;
        origin.innerHTML = '站外原文';
      }
    };
    xhr.open("GET", `/api/article?id=${qsID}`, true);
    xhr.send();