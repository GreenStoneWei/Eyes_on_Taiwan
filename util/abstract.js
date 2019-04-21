const natural = require('natural');
const TfIdf = natural.TfIdf;

module.exports = {
    abstractGen: function(content){
        if (content !== '' && content !== null){

            let sentencer = new natural.SentenceTokenizer();
            let sentence = sentencer.tokenize(content);

            let importanceOfContent = {};
            let tfidf = new TfIdf();
            tfidf.addDocument(content);
            tfidf.listTerms(0).forEach(function(item){
                importanceOfContent[item.term] = item.tfidf;
            })
            let importanceTermArr = Object.keys(importanceOfContent); // 含有文章中重要單字的 array

            let indexPos = [];
            for(let i=0; i < sentence.length; i++){
                let tdiftSent = new TfIdf();
                tdiftSent.addDocument(sentence[i]); // 找每一個句子的字頻
                let score = 0;
                tdiftSent.listTerms(0).forEach(function(item){ // 句子中每一個字的分數 word = item.term
                    let termIndex = importanceTermArr.indexOf(item.term);
                    if (termIndex !== -1){
                        score += importanceOfContent[item.term];
                    }
                });
                indexPos.push(score); // 按照句子的順序把分數排進分數
            }
            let indexOfMaxValue = indexPos.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0); // 找分數最高的位置
            return sentence[indexOfMaxValue];
        }
        else{
            return '';
        }
            
    }
}