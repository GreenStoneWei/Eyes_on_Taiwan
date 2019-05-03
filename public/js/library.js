function getEndPoint (href){
    if(href.indexOf('?')!== -1){
        return '?'+href.split('?')[1];
    }
    else{
        return '';
    }
}

function setStyles(obj, styles){
	for(let name in styles){
		obj.style[name]=styles[name];
	}
	return obj;
};
function setAttributes(obj,attrs){
	for(let name in attrs){
		obj[name]=attrs[name];
	}
	return obj;
};

function createElement(tagName,addClass,attrs,parentElement){
    let obj = document.createElement(tagName);
    if(addClass){
        for (let i=0;i<addClass.length;i++){
            obj.classList.add(addClass[i]);
        }
    }
    if(attrs){
        setAttributes(obj,attrs);
    }
    if(parentElement instanceof Element){
        parentElement.appendChild(obj);
    }
	return obj;
};

function dateFormat(unixtime){
    let dateString = new Date(unixtime).toString();
    let dateArray = dateString.split(' ');
    return dateArray[3]+'-'+dateArray[1]+'-'+dateArray[2]+' '+dateArray[4].slice(0,5)
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function createArticleCard(array,parentElement){
    for (let i=0 ; i<array.length ; i++){
        let card       = createElement("div",["card","card-size","mobile-card"],false,parentElement);
        let cardHeader = createElement("div",["card-header"],false,card);
        let headerRow  = createElement("div",["row"],false,cardHeader);
        let source     = createElement("span",["col-7","padding-fix"],false,headerRow);
        let time       = createElement("span",["col-5","padding-fix","text-right"],false,headerRow);
        let cardBody   = createElement("div",["card-body","mobile-card-body"],false,card);
        if (array[i].main_img === "null" || array[i].main_img === "undefined"){
            let defaultImg;
            switch (array[i].news){
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
            // let mainImg = createElement("img",["card-img-top","main-img"],{src:defaultImg},cardBody);
            let mainImgLink = createElement("a",["mobile-img"],{href: defaultImg},cardBody);
            let mainImg = createElement("div",["main-img"],{},mainImgLink);
            mainImg.setAttribute("style",`width: 100%; height: 180px; background-image: url(${defaultImg}); background-size:contain; background-repeat: no-repeat; background-position: center;`);
        }
        else{
            // let mainImg = createElement("img",["card-img-top","main-img"],{src:array[i].main_img},cardBody);
            let mainImgLink = createElement("a",["mobile-img"],{href:`/view/article?id=${array[i].id}`},cardBody);
            let mainImg = createElement("div",["main-img"],{},mainImgLink);
            mainImg.setAttribute("style",`width: 100%; height: 180px; background-image: url(${array[i].main_img}); background-size:contain; background-repeat: no-repeat; background-position: center;`);
        }
        let textBlock  = createElement("div",["text-block"],false,cardBody);
        let titleLink  = createElement("a",["card-title"],{href:`/view/article?id=${array[i].id}`},textBlock);
        let title      = createElement("h4",["card-title","padding-fix"],false,titleLink);
        
        let abstract   = createElement("p",["card-text","abstract"],false,textBlock);
        let tagContainer = createElement("div",["card-tag"],false,textBlock);
        let readBlock  = createElement("div",["read-block"],false,textBlock);
        let readMore   = createElement("a",["card-link","read-more"],{href:`/view/article?id=${array[i].id}`},readBlock);
        let viewImage  = createElement("img",["viewed"],{src:'https://s3.amazonaws.com/wheatxstone/news/iconfinder_view_126581.png'},readBlock);
        let viewCount  = createElement("p",["view-count"],false,readBlock);
        getTag(array[i].id,tagContainer);
        source.innerHTML   = array[i].news;
        time.innerHTML     = dateFormat(array[i].unixtime);
        title.innerHTML    = array[i].title;
        if(array[i].abstract.length>260){
            array[i].abstract = array[i].abstract.substring(0, 260)+'...';
        }
        abstract.innerHTML = array[i].abstract;
        readMore.innerHTML = "Read More";
        viewCount.innerHTML = 'Viewed '+ array[i].viewed_count + ' Times';
    }
    // 一列三個卡片，如果不足列，補齊
    let itemPerRow = 3;
    let remainder = array.length%itemPerRow;
    if (remainder==2){
        createElement("div",["card","card-size","hidden-card"],false,parentElement);
    }
    if (remainder==1){
        createElement("div",["card","card-size","hidden-card"],false,parentElement);
        createElement("div",["card","card-size","hidden-card"],false,parentElement);
    }
}

function getTag(id, tagContainer){
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let tagArray = JSON.parse(this.responseText);
        let tagStarter = createElement("div",false,false,tagContainer);
        let colonSpace = createElement("div",["tag-space"],false,tagContainer);
        tagStarter.innerHTML = 'Tags: ';
        for(let i=0; i<tagArray.length;i++){
            let tagNode = createElement("a",["tag-link"],{href:`/?tag=${tagArray[i]}`},tagContainer);
            tagNode.innerHTML = '#'+tagArray[i];
            let tagSpace = createElement("div",["tag-space"],false,tagContainer);
        }
      }
    };
    xhr.open("GET", `/api/card/tags?id=${id}`, true); 
    xhr.send();
}