const fs = require('fs');
const R = require('ramda');

//start point
const map_chars = require('../assets/map_chars');

//helpers
const map_ctrls = require('../assets/map_ctrls.json');
const map_hits = require('../assets/map_hits.json');

/**
 * CONSTANTS
 */
const LANG = 1;
const PROPERTIES = {
	KND: 'KND',
	TAIL_SPIN: 'TAIL SPIN',
	THROW: 'THROW',
	ARMOR: 'ARMOR',
	TRACK: 'TRACK',
};

// Schema = {
// 	"notation": "in rage 1+2", [] from movelist
// 	"number": "", from movelist
// 	"name": "", if notation ? moveist
// 	"hit_level": "m", if name ? movelist : rbnorway
// 	"damage": "55(10,45)", from movelist
// 	"speed": "20 pc8~17", from movelist
// 	"on_block": "-22", from movelist
// 	"on_hit": "KND", if string ? rbnorway : movelist
// 	"on_ch": "KND", rbnorway
// 	"notes": "Rage art",  rbnorway
//	"properties": []
// }

/**
 * Loop through chars here
 */
const getMoveDataCurried = R.curry(getMoveData);

module.exports = () => map_chars.map((char) => {
	const number = char.i;
	const name = char.c;
	const fullName = char.n;
	const moves = char.rbn.moves.map(getMoveDataCurried(char));

	const json = { number, name, fullName, moves }
	fs.writeFile(`t7/${char.c}.json`, JSON.stringify(json, null, 4), (err) => console.log(err));
});
/**
 * End
 */

/**
 * Get Prop Functions
 */

//Main function
function getMoveData(char, rbnMove) {
	const refMove = char.moveList.moves.find((move) => {
		const refMoveNotation = getCommands(move.command[LANG]);
		const rbnMoveNotation = convertRbnMoves(rbnMove.notation);
		return compareArray(refMoveNotation, rbnMoveNotation)
	})
	return !!refMove ? getCommandListMove(refMove, rbnMove) : getRbnMove(rbnMove);
}
//End main

function getCommandListMove(move, rbnMove) {
	const notation = getCommands(move.command[LANG])
	const number = move.number;
	const name = move.name[LANG];
	const damage = move.d;
	const hitLevel = move.at.map(getHitLevel)
	const speed = move.s;
	const onBlk = getFrameNumber(move.blk);
	//TODO: get launchers
	const onHit = getFrameNumber(move.adv, rbnMove.on_hit);
	const onCh = rbnMove.on_ch
	const properties = getMoveProperties(move)

	return {
		number,
		name,
		notation,
		hitLevel,
		damage,
		speed,
		onBlk,
		onHit,
		onCh,
		notes: rbnMove.notes,
		properties,
	};
}

function getRbnHitLevel(str) {
	if(R.isNil(str)) return str
	return str.replace(/h/g, 'High')
		.replace(/m/g, 'Mid')
		.replace(/l/g, 'Low')
		//TODO: put this to properties
		.replace(/\s*\([^)]*\)/g, '')
		.trim()
		.split(', ')
}

function getRbnMove(move) {
	const notation = convertRbnMoves(move.notation)
	const number = null;
	const name = null;
	const damage = move.damage;
	const hitLevel = getRbnHitLevel(move.hit_level);
	const speed = move.s;
	const onBlk = removeBrackets(move.on_block);
	const onHit = removeBrackets(move.on_hit);
	const onCh = removeBrackets(move.on_ch)
	const properties = []

	return {
		number,
		name,
		notation,
		hitLevel,
		damage,
		speed,
		onBlk,
		onHit,
		onCh,
		notes: move.notes,
		properties,
	};
}

function convertRbnMoves(notation) {
	const convertMoves = R.pipe(
		convertQCMoves,
		replaceRnbWords,
		splitArrowAndBtn,
		replaceSlash,
		replaceJumpMoves,
		replaceWS,
		replaceFC,
		replaceSS,
		replaceStances,
		replaceBT,
		replaceCH,
		replaceOpponentDown,
		replaceHold,
		replaceGrounded,
		replaceFaceUp,
		replaceTilde,
		removeOr,
		trimSpaces,
	);
	const moveStr = convertMoves(notation);
	return R.reject(R.isEmpty, moveStr.split(','));
}

const isLetter = val => val.toLowerCase() !== val.toUpperCase();

function charToStr(commands) {
	return commands.map((command, i) => {
		if(/[a-zA-Z]/.test(command)) {
			return command
		}
		return command.split('').map((c, j) => {
			const char = map_ctrls[command.charAt(j)];
			if(!char) {
				return command.charAt(j)
			}
			return char
		})
	})
}

function getCommands(str) {
	const commands = str.split(' ');
	return R.flatten(charToStr(commands))
}

function getMoveProperties(move) {
	const isThrow = !!move.at.find(attack => attack.t > 0)
	const isArmor = !!move.b8;
	const isTailSpin = !!move.b9;
	const isTracking = !!move.bB;

	const properties = [
		isThrow ? PROPERTIES.THROW : undefined,
		isArmor ? PROPERTIES.ARMOR : undefined,
		isTailSpin ? PROPERTIES.TAIL_SPIN : undefined,
		isTracking ? PROPERTIES.TRACK : undefined,
	];

	return R.reject(R.isNil, properties);
}

function getHitLevel(atk) {
	return R.find(R.propEq('i', atk.l))(map_hits).h
}

function compareArray(arr1, arr2) {
	return JSON.stringify(arr1) == JSON.stringify(arr2);
}
function getFrameNumber(refVal, rbnVal) {
	if(rbnVal && isNaN(Math.sign(rbnVal.replace(/(~)|(\+)/g, '')))) {
		return removeBrackets(rbnVal)
	}
	if(Math.sign(refVal) === 1) return `+${refVal}`;
	return refVal;
}

// function getCh(str) {
// 	const withoutSign = str.replace(/[+\-()]/)
// 	console.log(str)
// 	return str
// }
//

/**
 * String functions
 * */
function convertQCMoves(str) {
	return str.replace('qcb', 'd, d/b, b').replace('qcf', 'd, d/f, f')
}

function convertJFMoves(str) {
	return str.replace(':', ', ')
}

//replace rnb words
//in rage, when hit
function replaceRnbWords(str) {
	return str.replace('in rage', 'During, Rage,')
		.replace(' When hit ', ', during, hit, ')
}

function splitArrowAndBtn(str) {
	return str.replace(/[a-zA-Z]\+(?=[0-9])/g, v => v.replace('+', ', '))
}

function replaceSlash(str) {
	return str.replace('/', '')
}

function replaceJumpMoves(str) {
	if(str.includes('u or u/f+3+4')) {
		console.log(str.replace('ub or ', '').replace('u or u/f', 'uf'))
	}
	return str.replace('ub or ', '').replace('u or u/f', 'uf')
}

//db, 1~1 => db, (, 1, 1, ),
function replaceTilde(str) {
	const concatBrackets = (s) => {
		const splitted = s.split('~');
		const withBrackets = R.pipe(R.insert(0, '【'), R.insert(splitted.length + 1, '】'))(splitted);
		return withBrackets.join(', ')
	};
	return str.replace(/[1-4]~[1-4]/, concatBrackets)
}

function removeOr(str) {
	return str.replace(/or\s(.*)/g, s => {
		return s.replace('or', '(or')
	})
}

function replaceWS(str) {
	return str.replace(/WS/g, 'While, rising')
}

function replaceFC(str) {
	return str.replace(/FC\+|FC/g, s => {
		return s.includes('+') ? 'While, crouching, ' : 'While, crouching'
	})
}

function replaceSS(str) {
	return str.replace(/SS/g, 'During, sidestep')
}

function replaceBT(str) {
	return str.replace(/\bBT\b/g, 'Back, towards, enemy,')
}

function removeBrackets(str) {
	if(R.isNil(str)) return str;
	return str.replace(/\s*\([^)]*\)/g, '')
		.replace(/~(.*)/, '');
}

function replaceOpponentDown(str) {
	return str.replace('Opponent Down', '(While, enemy, is, down),')
}

function replaceGrounded(str) {
	return str.replace('Grounded', 'While, down,')
}

function replaceFaceUp(str) {
	return str.replace('face up', '(facing, up),')
}

function replaceCH(str) {
  return str.replace('CH', 'During, Counter, Hit,');
}

function replaceHold(str) {
  return str.replace('*', 'Hold,')
}

function trimSpaces(str) {
	return str.replace(/\s/g, '')
}
/**
 * End string functions
 */

/**
 * Replace stances
 */

function replaceStances(str) {
	return R.pipe(
		replaceAlisaStance,
    replaceAsukaStance,
	)(str)
}

function replaceAlisaStance(str) {
	return str.replace(/BT DES\s/, 'Back, towards, enemy, during, Destructive, Form,')
		.replace(/DES\s/, 'During, Destructive, Form,')
		.replace(/SBT\s/, 'During, Boot,')
		.replace(/DBT\s/, 'During, Dual, Boot,')
}

function replaceAsukaStance(str) {
  return str.replace(/LCT/, 'During, Leg, Cutter,')
}

console.log(convertRbnMoves('f+3, *'))
console.log(getCommands(' Hold'))