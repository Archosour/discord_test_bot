const https = require('https');
const fs = require('fs');
const fsPromise = fs.promises;
const general = require('../modules/general.js');

//https://www.osrsbox.com/tools/item-search/
const itemIDs = {
	general_IDs : [1935, 1033, 314 , 1511, 1513, 1515, 1517, 1519, 1521, 1381, 1387, 1925],
	wood_IDs : [1511, 1513, 1515, 1517, 1519, 1521 ],
	ores_IDs : [436 , 438 , 440 , 442 , 444 , 447 , 449 , 451],
	bars_IDs : [2349, 2351, 2353, 2355, 2357, 2359, 2361, 2363],
	magicrunes_IDs : [554 , 555 , 556 , 559 , 560 , 561 , 563 , 564 , 1436, 7936],
	zamorak_IDs : [1033, 1035, 245 , 2653, 2655, 2657, 2659, 3478],
	guthix_IDs : [2669, 2671, 2673, 2675, 3480],
	saradomin_IDs : [2661, 2663, 2665, 2667, 3479],
	robes_IDs : [542 , 544 , 1033, 1035, 577 , 581 , 7390, 7394 , 7392, 7396 , 12449 , 12451]
}

const minutes_between_info_refesh = 30;
const interval_between_info_refresh = minutes_between_info_refesh * 60 * 1000;

var OSRS_ge_current_prices = {};

function write_to_item_file(item_id, info, dir) {
	let input;
	if (typeof info === 'object') {
		input = JSON.stringify(info);
	} else {
		input = info;
	}
	fs.writeFile(dir + item_id + '.json', input, (error) => {
		if (error) {
			if (error.code !== 'EEXIST') {
				general.logger(error, true, true, console_channel);
				//console.log();
			}
		}
	});
}

async function read_from_item_file(item_id, dir) {
	return new Promise((resolve, reject) => {
		fs.readFile(dir + item_id + '.json', (error, data) => {
			if (error) {
				general.logger(error, true, true, console_channel);
				//console.log();
				reject('error');
			} else {
				resolve(JSON.parse(data));
			}
		});
	})
}

function fetchData(array_of_IDs, message_type_input, version_osrs = true) {
	let j = 0;
	let newData = '\n'; 
	let IDs = array_of_IDs.length;
	let message_type = message_type_input;
	let rs_dir;
	let rs_url;

	if (version_osrs) {
		rs_dir = './runescape/osrs/items/';
		rs_url = '/m=itemdb_oldschool/api/catalogue/detail.json?item=';
	} else {
		rs_dir = './runescape/rs3/items/';
		rs_url = '/m=itemdb_rs/api/catalogue/detail.json?item=';
	}

	function proces_data(data, j, IDs) {
		newData = newData + `${data.item.name}: ${data.item.current.price}: ${data.item.today.price} \n`;		
		if (j == IDs) {
			if (typeof newData !== 'undefined') {
				OSRS_ge_current_prices[message_type] = (OSRS_ge_current_prices[message_type] = newData) || newData;
			}
		}
	}

	array_of_IDs.forEach(function(Obj) {
		if (Obj == undefined) return;

		j++
		if (Obj == 0) {
			general.logger('invalid itemID', true, true, console_channel);
			//console.log();
			return;
		}
		
		let options = {
			hostname: 'services.runescape.com',
			path: rs_url + Obj,
			method: 'GET'
		}

		const req = https.request(options, res => {
			if (res.statusCode == '404' || res.statusCode == '503') {
				read_from_item_file(Obj, rs_dir)
				.then((data) => {
					proces_data(data, j, IDs);
				});
				return;
			
			} else if (res.statusCode != '200') {
				if (res.body == undefined) {
					general.logger('runescape - ' + Obj + ' - no body in response', true, true, console_channel);
					//console.log();
				} else {
					general.logger(res.body, true, true, console_channel);
					//console.log();
				}
				return;
			}
			res.on('data', d => {
				var data = JSON.parse(d);
				write_to_item_file(Obj, data, rs_dir);
				proces_data(data, j, IDs);
			});
		});
		
		req.on('error', error => {
			general.logger(`Error message 1\n ${error}`, true, true, console_channel);
			//console.error();
		});

		req.end();
	});
}

function get_single_item(item_id, version_osrs = true) {
	let rs_dir;
	let rs_url;	
	
	return new Promise((resolve, reject) => {
		if (item_id == undefined) return;
		if (item_id == 0) {
			general.logger('invalid item ID', true, true, console_channel);
			//console.log();
			return;
		}
		
		if (version_osrs) {
			rs_dir = './runescape/osrs/items/';
			rs_url = '/m=itemdb_oldschool/api/catalogue/detail.json?item=';
		} else {
			rs_dir = './runescape/rs3/items/';
			rs_url = '/m=itemdb_rs/api/catalogue/detail.json?item=';
		}
		
		let options = {
			hostname: 'services.runescape.com',
			path: rs_url + item_id,
			method: 'GET'
		}

		const req = https.request(options, res => {
			res.on('data', d => {
				general.logger(res.statusCode, true, true, console_channel);
				//console.log();
				
				if (res.statusCode === 404 || res.statusCode === 503) {
					read_from_item_file(item_id, rs_dir)
					.then((data) => {
						resolve(`${data.item.name}: ${data.item.current.price}: ${data.item.today.price} \n`);
					})
					.catch((error) => {
						reject(error)
					});
				} else if (res.statusCode !== 200) {
					if (res.body == undefined) {
						general.logger('runescape - ' + item_id + ' - no body in response', true, true, console_channel);
						//console.log();
					} else {
						general.logger(res.body, true, true, console_channel);
						//console.log();
					}
					reject();
				} else {
					var data = JSON.parse(d);
					write_to_item_file(item_id, data, rs_dir);
					resolve(`${data.item.name}: ${data.item.current.price}: ${data.item.today.price} \n`);
				};
			});
		});
		
		req.on('error', error => {
			general.logger(`Error message 1\n ${error}`, true, true, console_channel);
			//console.error();
		});
		req.end();
		setTimeout(() => {
			reject('request timed out');
		}, 5000);
	});
}

function update_ge_prices() {
    let extra_delay = 0;
    for (let [key, value] of Object.entries(itemIDs)) {
        extra_delay = extra_delay + 3000;
        setTimeout(function() {
            fetchData(value, key.slice(0, -4), );
        }, extra_delay);
    }

    module.exports.OSRS_ge_current_prices = OSRS_ge_current_prices;
    return true;
}

function keep_ge_uptodate() {
	setInterval(function() {
		update_ge_prices();
	}, interval_between_info_refresh);
}

function init() {
	fsPromise.mkdir('./runescape')
	.then(fsPromise.mkdir('./runescape/osrs'))
	.then(fsPromise.mkdir('./runescape/osrs/items'))
	.then(fsPromise.mkdir('./runescape/rs3'))
	.then(fsPromise.mkdir('./runescape/rs3/items'))
	.then(console.log('runescape init finished'))
	.catch((error) => {
		if (error.code !== 'EEXIST') {
			general.logger(error, true, true, console_channel);
			//console.log();
		}
	});
}

module.exports.get_single_item = get_single_item;
module.exports.init = init;
module.exports.keep_ge_uptodate = keep_ge_uptodate;
module.exports.update_ge_prices = update_ge_prices;