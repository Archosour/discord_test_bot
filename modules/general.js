const http = require('http');
const os = require('os');
const fs = require('fs');

const gameIP = 'http://192.168.1.100:3000';
const nasIP = 'http://192.168.1.101:3000';
const console_channel_ID = '711994899544670230';
const console_server_ID = '710989900605816963';

function unix_timestamp_to_date_string(unix_time = 0) {
	let date = new Date(unix_time);
	let return_string = '';
	
	return_string += `${date.getFullYear()}-`;
	if (date.getMonth() !== 0) {
		return_string += `${date.getMonth()}-`;
	} 
	if (unix_time >= 86400000) {
		return_string += `${date.getDate()}-`;
	} 
	if (unix_time >= 3600000) {
		return_string += `${date.getHours()}:`;
	} 
	return_string += `${date.getMinutes()}:`;
	return_string += `${date.getSeconds()}`;
	return return_string;
}

function unix_uptime_to_date_string(unix_time = 0) {
	let date = new Date(unix_time);
	let return_string = '';
	
	if (unix_time >= 86400000) {
		return_string += `${Math.floor(unix_time/86400000)} days, `;
	} 
	if (unix_time >= 3600000) {
		return_string += `${date.getHours()} hours, `;
	} 
	if (unix_time >= 60000) {
		return_string += `${date.getMinutes()} minutes, `;
	}
	return_string += `${date.getSeconds()} seconds`;
	return return_string;
}

function bytes_to_size(bytes) {
	if (bytes == 0) return '0 Byte';
	if (typeof bytes != 'number') return;

	return Math.round(bytes / Math.pow(1024, 2)) + ' MB';
}

function logger(input, discord = false, console_log = false, bot_console_channel, file = true ) {
	if (input == undefined) return;
	if (discord && typeof bot_console_channel !== 'object') return;

	
	//let time = os.uptime() * 1000;
	let date = new Date();
	let timestamp_small = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
	let timestamp_full = `${timestamp_small}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}: `;
	console.log(timestamp_small);

	if (console_log) {
		console.log(input);
	}

	if (discord) {
		switch(typeof input) {
			case 'string':
				bot_console_channel.send(input);
			break;
			case 'number':
				bot_console_channel.send(input.toString(10));
			break;
			case 'array':
				bot_console_channel.send(input.join());
			break;
			case 'object':
				let object_string = JSON.stringify(input)
				let length = object_string.length;
				if (length <= 149) {
					bot_console_channel.send(object_string);
				} else {
					bot_console_channel.send(`object was to large: ${length} characters long!`);
				}
			break;
			default:
				bot_console_channel.send(`unknown type: ${typeof input}`);
		}
	}

	if (file) {
		switch(typeof input) {
			case 'string':
				fs.appendFile('./logs/' + timestamp_small + '.txt', timestamp_full + input + '\n', (error) => {
					if (error) {
						console.log(error);
					}
				});
			break;
			case 'number':
				fs.appendFile('./logs/' + timestamp_small + '.txt', timestamp_full + input.toString(10) + '\n', (error) => {
					if (error) {
						console.log(error);
					}
				});
			break;
			case 'array':
				fs.appendFile('./logs/' + timestamp_small + '.txt', timestamp_full + input.join() + '\n', (error) => {
					if (error) {
						console.log(error);
					}
				});
			break;
			case 'object':
				let object_string = JSON.stringify(input)
				fs.appendFile('./logs/' + timestamp_small + '.txt', timestamp_full + object_string + '\n', (error) => {
					if (error) {
						console.log(error);
					}
				});
			break;
			default:
				console.log(`unknown type: ${typeof input}`);
		}
	}


}

function bytes_to_size_proper(bytes) {
	let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
	if (bytes == 0) return '0 Byte';
	if (typeof bytes != 'number') return;

	let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function get_hardware_info() {
	let info = {};

	info.arch = os.arch();
	info.cpus = os.cpus();
	info.freemem = os.freemem();
	info.platform = os.platform();
	info.totalmem = os.totalmem();
	info.usedmem = os.totalmem() - os.freemem();
	info.type = os.type();
	info.uptime = os.uptime();
	info.gpu = 'none placed';

	return JSON.stringify(info);
}

function get_nas_info() {
	return new Promise((resolve, reject) => {
		const req = http.get(nasIP, (res) => {
			if (res.statusCode != '200') {
				console.log(res.body);
				reject(res.body);
			}
			res.on('data', data => {
				resolve(data);
			});
		});
		req.on('error', error => {
			console.error(`Error message 1\n ${error}`);
			reject('device offline');
		});
		req.end();

		setTimeout(() => {
			reject('device offline');
		}, 1000);
	});
}

function get_game_pc_info() {
	return new Promise((resolve, reject) => {
		const req = http.get(gameIP, (res) => {
			if (res.statusCode != '200') {
				console.log(res.body);
				reject(res.body);
			}
			res.on('data', data => {
				resolve(data);
			});
		});
		req.on('error', error => {
			console.error(`Error message 1\n ${error}`);
			reject('device offline');
		});
		req.end();

		setTimeout(() => {
			reject('device offline');
		}, 1000);
	});
}

module.exports.logger = logger;
module.exports.get_game_pc_info = get_game_pc_info;
module.exports.get_nas_info = get_nas_info;
module.exports.get_hardware_info = get_hardware_info;
module.exports.timestamp_to_string = unix_timestamp_to_date_string;
module.exports.uptime_to_string = unix_uptime_to_date_string;
module.exports.bytes_to_size = bytes_to_size;
module.exports.console_channel_ID = console_channel_ID;
module.exports.console_server_ID = console_server_ID;