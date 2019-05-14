const assert = require('assert');
const textMining = require('../util/abstract.js');

describe('Text Mining Based on TF-IDF <abstract> generator', function() {
	it('should return a string standing for abstract', function() {
		assert.equal(typeof textMining.abstractGen('This is a make up sentence. This is another fake sentence. Hey, fake.'), 'string');
	});
	it('should return an empty string when giving empty string', function() {
		assert.equal(textMining.abstractGen(''), '');
	});
	it('should return an empty string when giving null', function() {
		assert.equal(textMining.abstractGen(null), '');
	});
});

describe('Text Mining Based on TF-IDF <tag> generator', function() {
	const contentMark = 'A self-made tycoon and political outsider with a penchant for caps is running for president in 2020, and it’s not Donald Trump. One of Taiwan’s richest people and Foxconn chairman, Terry Gou, who made his fortune supplying components to tech companies such as Apple and Sony, announced today (April 17) that he will throw his hat in the ring (paywall) for the island’s presidential race next year. Gou, who said earlier this week that he plans to step down as chairman within months, visited a temple in New Taipei City today and said that the sea goddess Mazu had visited him in his dreams and told him to “‘do good things for our suffering people, give hope to the youth, contribute to cross-strait peace.\'” Mazu is a widely revered deity in Taiwan, China’s southern coastal areas, and parts of Southeast Asia, and is also known by other names such as Tin Hau in Hong Kong. Gou, 68, said he’ll run as a candidate for the opposition Kuomintang (KMT) party, which supports having friendlier ties with China. At an event yesterday (April 16) where he flagged that he was considering a run for president, Gou described 2020 as being a “turning point” for Taiwan politically, economically, and militarily. Taiwan’s current president Tsai Ing-wen, who came to power in 2016, belongs to the independence-leaning Democratic Progressive Party (DPP). Since she came to power, Beijing has pursued increasingly hardline policies against the self-ruled territory, including limiting its nationals from visiting Taiwan and pressuring Taiwan’s few remaining diplomatic allies to switch their allegiance to Beijing. After the end of the Chinese Civil War in 1949, the defeated Nationalist, or KMT, forces fled to Taiwan and established a competing Chinese government there, while the Communist Party ruled from Beijing. Since then, Taiwan has governed itself and holds democratic elections, while Beijing has never relinquished its claims over the island. Gou was born in Taiwan, after his parents came over from China after the civil war. Gou was among the first wave of Taiwanese companies that shifted production to China in the late 1980s as it embarked on economic reforms, and built up a massive electronics-manufacturing empire there. Foxconn, or Hon Hai as it’s officially known, has also drawn scrutiny in recent years after the company’s poor treatment of workers was cited as a cause of a spate of suicides at its factories in China. Gou’s decision to run for president in January’s elections, along with the meteoric rise of the KMT’s Han Kuo-yu, the populist, pro-China mayor of Taiwan’s second city Kaohsiung, should have the ruling party deeply worried. The DPP recently suffered heavy losses across the country in local elections in November that gave China reason to celebrate as Beijing would rather have the KMT, which stresses close economic ties with China and eschews independence talk, in power. As a businessman with deep economic ties to China, Gou also undoubtedly has cultivated important political relationships (paywall) there. Kaohsiung mayor Han has not announced his presidential bid yet, although a growing number of his supporters are calling for him to run. Another populist figure, Taipei’s independent mayor Ko Wen-je—recently known for releasing an earnest rap video—is also widely expected to add his name to the race. The race to Taiwan’s presidency in 2020 is shaping up to be every bit as interesting as the one to the White House.';
	it('should return an array standing for abstract', function() {
		assert.equal(typeof textMining.tagGen(1, contentMark), 'object');
	});
	it('should return an array with length 9 or 10', function() {
		const expectedLength = textMining.tagGen(1, contentMark).length;
		assert.ok(expectedLength >= 9 || expectedLength <= 10);
	});
});

