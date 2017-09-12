const R = require('ramda');
const map_chars = require('../assets/map_chars');

const hasLength = c => !!c.length;
const charsWithLength = R.filter(hasLength, map_chars);

charsWithLength.forEach((char) => {
	const output = require(`../t7/${char.c}.json`);
	let notFound = [];
	for(let i = 1; i < char['length']; i++) {
		const move = R.find(R.propEq('number', i))(output.moves);
		if(!move) notFound.push(true);
	}
	if(!!notFound.length) {
		console.log(`${char.c} failed!`)
	} else {
		console.log(`${char.c} passed!`)
	}
})