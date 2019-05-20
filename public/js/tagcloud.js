const cloudContainer = document.querySelector('.cloud-container');
const cloud = document.getElementById('wordcloud');
const navTag = document.getElementById('nav-tag');

const options = {
	list: [],
	gridSize: 6,
	weightFactor: 3.8,
	fontFamily: 'Arial', // Hiragino Mincho Pro, serif
	color: 'black',
	backgroundColor: '#f0f0f0',
	rotateRatio: 0.5,
	rotationSteps: 2,
	ellipticity: 1,
	click: function(tag) {
		let page = parseInt(getParameterByName('page'));
		if (!Number.isInteger(page)) {
			page = 1;
		}
		let sort = getParameterByName('sort');
		if (sort == 'null') {
			sort = 'date';
		}
		window.location.replace(myDictionary[language].href+`?sort=${sort}&tag=${tag[0]}`);
	},
	shape: function(theta) {
		const max = 1026;
		const leng = [290, 296, 299, 301, 305, 309, 311, 313, 315, 316, 318, 321, 325, 326, 327, 328, 330, 330, 331, 334, 335, 338, 340, 343, 343, 343, 346, 349, 353, 356, 360, 365, 378, 380, 381, 381, 381, 391, 394, 394, 395, 396, 400, 400, 408, 405, 400, 400, 400, 401, 401, 403, 404, 405, 408, 410, 413, 414, 414, 415, 416, 418, 420, 423, 425, 430, 435, 440, 446, 456, 471, 486, 544, 541, 533, 532, 533, 537, 540, 537, 535, 535, 533, 546, 543, 539, 531, 529, 530, 533, 529, 528, 529, 522, 521, 520, 509, 520, 520, 533, 522, 523, 526, 528, 527, 532, 537, 539, 539, 540, 539, 538, 533, 532, 524, 523, 513, 503, 482, 467, 443, 438, 435, 431, 429, 427, 426, 422, 422, 426, 426, 423, 419, 414, 410, 407, 404, 401, 396, 393, 393, 395, 392, 389, 388, 383, 379, 378, 376, 375, 372, 369, 368, 359, 343, 335, 332, 327, 323, 314, 308, 300, 294, 290, 288, 289, 290, 282, 275, 269, 263, 257, 242, 244, 237, 235, 235, 232, 231, 225, 224, 221, 219, 218, 218, 217, 217, 215, 215, 214, 214, 214, 214, 214, 215, 215, 216, 213, 213, 212, 211, 209, 207, 205, 204, 206, 205, 205, 205, 205, 204, 203, 203, 201, 200, 199, 197, 195, 193, 192, 192, 190, 189, 187, 186, 186, 183, 183, 182, 182, 181, 179, 180, 179, 178, 178, 177, 177, 176, 176, 176, 176, 175, 175, 175, 175, 175, 175, 174, 174, 175, 175, 175, 175, 176, 177, 176, 177, 177, 177, 180, 179, 179, 180, 179, 179, 179, 178, 178, 178, 178, 177, 178, 177, 179, 179, 179, 180, 180, 181, 181, 181, 183, 183, 184, 184, 186, 187, 189, 189, 192, 195, 193, 194, 193, 194, 194, 191, 189, 196, 195, 196, 199, 200, 201, 200, 200, 200, 200, 202, 203, 204, 205, 210, 210, 210, 211, 210, 214, 218, 219, 226, 231, 233, 235, 235, 235, 235, 236, 238, 240, 241, 243, 245, 246, 249, 249, 249, 255, 257, 264, 271, 272, 274, 275, 276, 276, 278, 285, 292, 294, 296, 301, 304, 313, 320, 330, 333, 337, 342, 345, 348, 352, 358, 363, 376, 386, 379, 386, 387, 387, 399, 402, 402, 410, 415, 420, 425, 430, 429, 436, 435, 438, 442, 447, 451, 454, 455, 474, 477, 481, 484, 492, 486, 488, 501, 509, 544, 553, 552, 553, 564, 579, 593, 600, 627, 637, 644, 644, 643, 641, 640, 641, 641, 643, 643, 648, 651, 653, 659, 671, 678, 685, 690, 698, 705, 711, 715, 722, 729, 738, 760, 770, 777, 780, 788, 792, 796, 800, 803, 806, 808, 810, 809, 815, 819, 821, 823, 826, 828, 830, 834, 838, 849, 854, 861, 884, 891, 909, 932, 996, 1026, 1016, 1011, 1015, 1018, 999, 987, 827, 806, 779, 754, 734, 727, 700, 690, 686, 682, 677, 675, 672, 668, 665, 664, 658, 641, 614, 610, 609, 609, 608, 596, 591, 583, 577, 576, 570, 561, 553, 547, 539, 531, 526, 525, 524, 519, 513, 502, 484, 480, 478, 470, 464, 458, 453, 450, 448, 448, 445, 441, 435, 431, 423, 420, 411, 408, 405, 398, 388, 385, 385, 385, 383, 379, 372, 370, 369, 368, 366, 367, 371, 370, 367, 365, 345, 343, 342, 340, 336, 334, 331, 329, 326, 323, 323, 322, 321, 321, 319, 318, 315, 313, 312, 309, 308, 307, 306, 305, 304, 303, 303, 302, 302, 300, 299, 299, 297, 296, 294, 292, 291, 290, 289, 290, 291, 291, 289, 289, 285, 285, 286, 287, 287, 288, 288, 288, 288, 288, 289, 288, 287, 279, 275, 273, 272, 272, 272, 274, 274, 274, 275, 275, 277, 281, 284, 285, 286, 286, 286, 283, 280, 279, 279, 280, 281, 283, 284, 288, 291];
		return leng[(theta / (2 * Math.PI)) * leng.length | 0] / max;
	},
};

document.addEventListener('DOMContentLoaded', () => {
	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			const tagList = JSON.parse(this.responseText);
			options.list = tagList;
			WordCloud(cloud, options);
		};
	};
	xhr.open('GET', myDictionary[language].route+`/word/cloud`, true);
	xhr.send();
});

navTag.addEventListener('click', ()=>{
	cloudContainer.classList.toggle('cloud-container-move');
});


