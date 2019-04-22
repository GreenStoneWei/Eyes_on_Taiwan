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
        let card       = createElement("div",["card","card-size"],false,parentElement);
        let cardHeader = createElement("div",["card-header"],false,card);
        let headerRow  = createElement("div",["row"],false,cardHeader);
        let source     = createElement("span",["col-7"],false,headerRow);
        let time       = createElement("span",["col-5","text-right"],false,headerRow);
        let cardBody   = createElement("div",["card-body"],false,card);
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
            let mainImg = createElement("img",["card-img-top","main-img"],{src:defaultImg},cardBody);
        }
        else{
            let mainImg = createElement("img",["card-img-top","main-img"],{src:array[i].main_img},cardBody);
        }
        let title      = createElement("h4",["card-title"],false,cardBody);
        let abstract   = createElement("p",["card-text","abstract"],false,cardBody);
        let readBlock  = createElement("div",["read-block"],false,cardBody);
        let readMore   = createElement("a",["card-link"],{href:`/article.html?id=${array[i].id}`},readBlock); // # to be replaced
        let viewImage  = createElement("img",["viewed"],{src:'https://s3.amazonaws.com/wheatxstone/news/iconfinder_view_126581.png'},readBlock);
        let viewCount  = createElement("p",["view-count"],false,readBlock);
        source.innerHTML   = array[i].news;
        time.innerHTML     = dateFormat(array[i].unixtime);
        title.innerHTML    = array[i].title;
        abstract.innerHTML = array[i].abstract;
        readMore.innerHTML = "閱讀更多";
        viewCount.innerHTML = 'Viewed '+ array[i].viewed_count + ' Times';
        // console.log(array[i]);
    }
}