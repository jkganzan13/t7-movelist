const R = require('ramda');
const fse = require('fs-extra');
const map_chars = require('../assets/map_chars');

const hasLength = c => !!c.length;
const charsWithLength = R.filter(hasLength, map_chars);

charsWithLength.forEach((char) => {
	const output = require(`../t7/${char.c}.json`);
	let notFound = [];
	for(let i = 1; i < char['length']; i++) {
		const move = R.find(R.propEq('number', i))(output.moves);
		if(!move) notFound.push(i);
	}
	if(!!notFound.length) {
		console.log(`${char.c} failed! Number ${notFound} missing!`)
	} else {
		console.log(`${char.c} passed!`)
    fse.copySync(`t7/${char.c}.json`, `done/${char.c}.json`)
	}
})