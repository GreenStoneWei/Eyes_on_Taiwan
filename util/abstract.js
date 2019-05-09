const natural = require('natural');
const TfIdf = natural.TfIdf;

module.exports = {
	abstractGen: function(content) {
		if (content !== '' && content !== null) {
			const sentencer = new natural.SentenceTokenizer();
			const sentence = sentencer.tokenize(content);

			const importanceOfContent = {};
			const tfidf = new TfIdf();
			tfidf.addDocument(content);
			tfidf.listTerms(0).forEach(function(item) {
				importanceOfContent[item.term] = item.tfidf;
			});
			const importanceTermArr = Object.keys(importanceOfContent); // 含有文章中重要單字的 array

			const indexPos = [];
			for (let i=0; i < sentence.length; i++) {
				const tdiftSent = new TfIdf();
				tdiftSent.addDocument(sentence[i]); // 找每一個句子的字頻
				let score = 0;
				tdiftSent.listTerms(0).forEach(function(item) { // 句子中每一個字的分數 word = item.term
					const termIndex = importanceTermArr.indexOf(item.term);
					if (termIndex !== -1) {
						score += importanceOfContent[item.term];
					}
				});
				indexPos.push(score); // 按照句子的順序把分數排進去
			}
			const indexOfMaxValue = indexPos.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0); // 找分數最高的位置
			return sentence[indexOfMaxValue];
		} else {
			return '';
		}
	},
	tagGen: function(id, content) {
		const tfidf = new TfIdf();
		const tagFreq = {};
		tfidf.addDocument(content);
		tfidf.listTerms(0).forEach(function(item) {
			tagFreq[item.term] = item.tfidf;
		});
		const sortedFreq = Object.keys(tagFreq).sort(function(a, b) {
			return tagFreq[b]-tagFreq[a];
		});
		const tag = [];
		for (let i=0; i< 10; i++) {
			if (sortedFreq[i].toLowerCase()!=='taiwan') {
				const oneRow = [id, sortedFreq[i]];
				tag.push(oneRow);
			}
		}
		return tag;
	},
};
