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
