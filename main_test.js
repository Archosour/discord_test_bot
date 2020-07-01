const Discord = require('discord.js');
const https = require('https');
const pingMonitor = require('ping-monitor');
const fs = require('fs');
const fsPromise = fs.promises;

const general = require('./modules/general.js');
const runescape = require('./modules/runescape.js');
const messages = require('./configs/messages.json');
const urls = require('./configs/urls.json');
const paths = require('./configs/paths.json');
const discord_xp_table = require('./configs/discord_xp_table.json');
const discord_bot = require('./modules/discord_bot.js');

const bot_config = require('./bot_config.json');

const client = new Discord.Client();

const discord_server_admins = [
	'367767515771830309',	// Archosaur
]

var ping_monitor_interval = 1; // minutes
var lotro_server_status = true;

const lotro_server_ips = 	[
	'198.252.160.98', 	// Arkenstone
	'198.252.160.99',	// Branywine
	'198.252.160.100',	// Crickhollow
	'198.252.160.101',	// Gladden
	'198.252.160.102',	// Landroval
	'198.252.160.103',	// Belegear
	'198.252.160.104',	// Evernight
	'198.252.160.105',	// Gwaihir
	'198.252.160.106',	// Laurelin
	'198.252.160.107'	// Sirannon
];

const myPingMonitor = new pingMonitor({
	address: 	lotro_server_ips[2],
	port:		9000,
    interval: 	ping_monitor_interval
});

const allows_GE_channels =  [
	'710989901075578913', 	// test server - general
	'717117965673300028',	// test server - test general
	'713130722097102908'	// Brave Company - runescape
];	

var console_channel;

var people_on_timeout = {};
const max_before_message_timeout = 5;
const time_to_reset_message_timeout = 5; // minutes
const interval_to_reset_message_timneout = time_to_reset_message_timeout * 60 * 1000;

const prefix = '!';
const version = '1.3.1';

/*
function log_to_discord_console(to_log_thingy) {
	if (typeof console_channel === 'undefined') {
		console.log(console_channel);
		return;
	}
	if (typeof to_log_thingy == 'string') {
		console_channel.send(to_log_thingy);
	}
}
*/

function check_people_for_timeout(userID) {
	if (discord_server_admins.includes(userID)) return false;

	if (people_on_timeout[userID] == max_before_message_timeout) {
		return true;
	} else {
		people_on_timeout[userID] = (people_on_timeout[userID] + 1) || 1;
		general.logger(people_on_timeout[userID], true, true, console_channel);
		//console.log();
		return false;
	}
}

function alert_people_on_timeout(messageObject) {
	messageObject.author.send(messages.discord_reply_on_timeout);
}

function reply_back_to_user(messageObject, message) {
	if (check_people_for_timeout(messageObject.author.id)) {
		alert_people_on_timeout(messageObject);
		return;
	}
	messageObject.reply(message);
}

async function GetLatestArticleURL() {
	const baseURL = 'https://www.lotro.com/en/game/articles';
	return new Promise((resolve,reject) => {

		https.get(baseURL, (resp) => {
			let data = '';

			resp.on('data', (chunk) => {
				data += chunk;
			});
			resp.on('end', () => {
				var re = /lotro-beacon-issue-\d\d\d/gm;
				let result = data.match(re); // match data against our regular expression
				// take the result from regular expression and sort it by last
				resolve(baseURL + '/' + result.sort(function (a, b) {
					return a.attr - b.attr
				})[0]
				);
			});
		}).on("error", (err) => {
			general.logger("Error: " + err.message, true, true, console_channel);
			//console.log();
			reject(err.message);
		});
	});
// Thanks to Grumpyoldcoder and Samwai.
}

function check_JSON_files() {
	let ready_to_go = true;

	function get_length(Obj, length) {
		if (Object.keys(Obj).length != length) {
			general.logger(`ERROR - JSON - on ${Obj.constructor.name}`, true, true, console_channel);
			//console.log();
			ready_to_go = false;
		}
	}

	get_length(messages, 6);
	get_length(urls, 2);
	get_length(bot_config, 5);
	get_length(paths, 1);
	get_length(discord_xp_table, 1);

	if (bot_config.bot_key == undefined) {
		general.logger('botkey missing', false, true, console_channel);
		//console.log();
		ready_to_go = false;
	}

	return ready_to_go;
}

function hardwareinfo_to_string(Object) {
	if (typeof Object != 'object') return 'device offline';

	let cpu_model = Object.cpus[0].model.slice(0, -9) + ' @ ' + Object.cpus[0].speed + 'MHz';
	let mem_tot = general.bytes_to_size(Object.totalmem);
	let mem_use = general.bytes_to_size(Object.usedmem);
	let mem_use_percent = Math.floor((Object.usedmem / Object.totalmem) * 100) + '%';
	let system_uptime = general.uptime_to_string(Object.uptime * 1000);

	let return_string = 'CPU: ' + cpu_model + '\n' +
						'GPU: ' + Object.gpu + '\n' +
						'Memory: ' + mem_use + ' in use (' + mem_use_percent + ') of: ' + mem_tot + ' \n' +
						'System uptime: ' + system_uptime;

	return return_string;
}

client.on('ready', () => {
	general.logger(`Logged in as ${client.user.tag}!`, false, true, console_channel);
	//console.log();
	console_channel = client.guilds.cache.find(guilds => guilds.id === bot_config.bot_console_server).channels.cache.find(channels => channels.id === bot_config.bot_console_channel);
	general.logger('Bot startup!', true, true, console_channel);
	general.logger('Bot version: ' + version, true, true, console_channel);
	general.logger('Bot name   : ' + bot_config.bot_name, true, true, console_channel);
	general.logger('Bot connected!', true, true, console_channel);
	//log_to_discord_console();
	//general.logger({test: 1970, teste: 1971, tester: 1972}, true, true, console_channel);
});

// ping pong
client.on('message', msg => {
	if (msg.author.bot) return;
	
	if (msg.content === 'ping') {
		reply_back_to_user(msg, 'pong');
	}
});

// Command 'handler'
client.on('message', incomming_discord_message => {
	// command example: !lotro servers
	if (incomming_discord_message.author.bot) return;
	if (!incomming_discord_message.content.startsWith(prefix)) return;
	if (bot_config.ignore_channels.includes(incomming_discord_message.channel.id)) return; 		// mainly test channels

	let arguments = incomming_discord_message.content.toLocaleLowerCase().slice(1).split(' ');
	general.logger(arguments, true, true, console_channel);
	//console.log();
	let command = arguments.shift();

	switch(command){
		case 'help':
			reply_back_to_user(incomming_discord_message, 'List of commands: ' + urls.brave_bot_command_list);
			break;
		case 'commands':
			reply_back_to_user(incomming_discord_message, 'List of commands: ' + urls.brave_bot_command_list);
			break;
		case 'ge':
			if (!allows_GE_channels.includes(incomming_discord_message.channel.id)) return;
			
			let ge_command = arguments.shift();
			let new_message = client.guilds.cache.find(guilds => guilds.id === incomming_discord_message.channel.guild.id).channels.cache.find(channels => channels.id === incomming_discord_message.channel.id);
			switch(ge_command) {
				case 'all':
					if (incomming_discord_message.author.username === 'Archosaur' && incomming_discord_message.author.id === '367767515771830309') {
						for (let [key, value] of Object.entries(runescape.OSRS_ge_current_prices)) {
							new_message.send(value);
						}
					} else {
						reply_back_to_user(messages.no_permission_to_use_command);
					}
					break;
				case 'item':
					let item = arguments.shift();
					item_number = Number(item);
					if (item_number !== 'number') {
						runescape.get_single_item(item_number)
						.then((string) => {
							reply_back_to_user(incomming_discord_message, string)
						})
						.catch((error) => {
							general.logger(error, true, true, console_channel);
							//console.log(error);
							if (error === 'request timed out') {
								reply_back_to_user(incomming_discord_message, 'Sorry, invalid item id.');
							}
						});
					}
					break;
				default:
					if (typeof ge_command === 'undefined') return;

					let information =  runescape.OSRS_ge_current_prices[ge_command];
									
					if (typeof information !== 'undefined') {
						reply_back_to_user(incomming_discord_message, information);
					} else if (typeof information === 'undefined') {
						reply_back_to_user(incomming_discord_message, runescape.OSRS_error_message);
					}
			}
			break;
		case 'get':
			let get_command = arguments.shift();
			switch(get_command) {
				case 'info':
					if (incomming_discord_message.author.username === 'Archosaur') {
						general.logger(incomming_discord_message, true, true, console_channel);
						//console.log();
					console_channel.send('\n' +
						incomming_discord_message.channel.guild.name + '\n' +
						incomming_discord_message.channel.guild.id + '\n' +
						incomming_discord_message.channel.name + '\n' +
						incomming_discord_message.channel.id + '\n' +
						incomming_discord_message.author.username + '\n' +
						incomming_discord_message.author.id
					);
					} else {
						incomming_discord_message.reply(messages.no_permission_to_use_command);
					}
					break;
				case 'userinfo':
					reply_back_to_user(incomming_discord_message, '\n' +
						'username:            ' + incomming_discord_message.author.username + '\n' +
						'user ID:                 ' + incomming_discord_message.author.id + '\n' +
						'bot:                        ' + incomming_discord_message.author.bot + '\n' +
						'avatar:                   ' + incomming_discord_message.author.avatar + '\n' +
						'last message ID:  ' + incomming_discord_message.author.lastMessageID + '\n' +
						'joined at (Unix):   ' + incomming_discord_message.channel.guild.joinedTimestamp
					);
					break;
				case 'botinfo':
					reply_back_to_user(incomming_discord_message, '\n' +
						'bot name:             ' + bot_config.bot_name + '\n' +
						'bot version:          ' + version + '\n' +
						'bot startup time: ' + general.timestamp_to_string(client.readyTimestamp) + '\n' +
						'bot uptime:           ' + general.uptime_to_string(client.uptime) + '\n'
					);
					break;
				case 'hardwareinfo':
					Promise.allSettled([general.get_game_pc_info(), general.get_nas_info(), ])
					.then((values) => {
						let to_send_string = '\n__Bot system__: \n' + hardwareinfo_to_string(JSON.parse(general.get_hardware_info())) + '\n';
						
						if (values[0].status === 'fulfilled') {
							to_send_string += '__Game pc__: \n' + hardwareinfo_to_string(JSON.parse(values[0].value)) + '\n';
						}

						if (values[1].status === 'fulfilled') {
							to_send_string += '__NAS / VM-host / Recording__: \n' + hardwareinfo_to_string(JSON.parse(values[1].value)) + '\n';
						}

						reply_back_to_user(incomming_discord_message, to_send_string);
					});
					break;
				default:
					reply_back_to_user(incomming_discord_message, messages.no_command_available);
			}
			break;
		case 'coffee':
			reply_back_to_user(incomming_discord_message, 'error: 418');
			break;
		case 'lotro':
			let lotro_command = arguments.shift()
			if (lotro_command === 'servers') {
				if (lotro_server_status) {
					incomming_discord_message.reply(messages.lotro_server_online);
				} else {
					incomming_discord_message.reply(messages.lotro_server_offline);
				}
			} else if (lotro_command === 'beacon') {
				GetLatestArticleURL().then((latestArticleURL) => {
					general.logger(latestArticleURL, true, true, console_channel);
					//console.log();
					reply_back_to_user(incomming_discord_message, latestArticleURL);
				});
			} 
			break;
		case 'github':
			reply_back_to_user(incomming_discord_message, 'Active: ' + urls.github_brave_bot + '\nTesting: ' + urls.github_brave_testbot);
			break;
		case 'disable':
			let disable_command = arguments.shift();
			if (disable_command === 'notification') {

				fsPromise.readFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`)
				.then((data) => {
					let info = JSON.parse(data);
					info.notify_level = false;
					incomming_discord_message.author.send('You have disabled all notifications from BraveBot. If you would like to get notifications again please type !enable notifications in any of its channels. \nThe disable does only work in this channel. If have to disable it in every channel if thats what you want.');
					
					fs.writeFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`, JSON.stringify(info), (error) => {
						if (error) {
							general.logger(error, true, true, console_channel);
							//console.log();
							return;
						}
					});
				})
				.catch((error) => {
					general.logger(error, true, true, console_channel);
					//console.log();
				});
			}
		break;
		case 'enable':
			let enable_command = arguments.shift();
			if (enable_command === 'notification') {

				fsPromise.readFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`)
				.then((data) => {
					let info = JSON.parse(data);
					info.notify_level = true;
					incomming_discord_message.author.send('You have anabled all notifications from BraveBot. If you would like to disable notifications again please type !disable notifications in any of its channels. \nThe disable does only work in this channel. If have to enable it in every channel if thats what you want.');

					fs.writeFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`, JSON.stringify(info), (error) => {
						if (error) {
							general.logger(error, true, true, console_channel);
							//console.log();
							return;
						}
					});
				})
				.catch((error) => {
					general.logger(error, true, true, console_channel);
					//console.log();
				});
			}
		break;
		default:
			reply_back_to_user(incomming_discord_message, messages.no_command_available);
	}
});

// Leveling system
client.on('message', incomming_discord_message => {
	if (incomming_discord_message.author.bot) return;
	if (incomming_discord_message.content.startsWith(prefix)) return;
	if (bot_config.ignore_channels.includes(incomming_discord_message.channel.id)) return;

	fsPromise.readFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`)
	.then((data) => {
		let info = JSON.parse(data);
		info.discord_xp ++;
		let level = discord_bot.calculate_level(info.discord_xp);

		if (info.notify_level == undefined) {
			info.notify_level = true;
			general.logger('user updated', true, true, console_channel);
			//console.log();
		}

		if (level > info.discord_level) {
			info.discord_level = level;
			if (info.notify_level) {
				incomming_discord_message.author.send(`You have leveled! You have now level: ${level} Bravery.`);
			}
		}
		
		fs.writeFile(`${paths.discord_users}/${incomming_discord_message.guild.id}/${incomming_discord_message.author.id}.json`, JSON.stringify(info), (error) => {
			if (error) {
				general.logger(error, true, true, console_channel);
				//console.log();
				return;
			}
		});
	})
	.catch((error) => {
		if (error.code === 'ENOENT') {
			discord_bot.add_new_user(incomming_discord_message.author.id, incomming_discord_message.guild.id, incomming_discord_message.author.username);
		} else {
			general.logger(error, true, true, console_channel);
			//console.log();
		}
	});
});

client.on('guildMemberAdd', new_user => {
	new_user.guild.ownerID.send(new_user.displayName + ' joined your server');
})

// Lotro ping test //
myPingMonitor.on('up', function (res, state) {
	//if (ping_monitor_interval != 5) {
	if (!lotro_server_status) {
		general.logger('Yay!! ' + res.address + ':' + res.port + ' is up.', true, true, console_channel);
		//console.log();
		setTimeout(function() {
			general.logger(messages.lotro_server_online, true, true, console_channel);
			//log_to_discord_console();
		}, 1000);
	}
	//ping_monitor_interval = 5;
	lotro_server_status = true;
});

myPingMonitor.on('down', function (res, state) {
	//if (ping_monitor_interval != 1) {
	if (lotro_server_status) {
		general.logger('Oh Snap!! ' + res.address + ':' + res.port + ' is down! ', true, true, console_channel);
		//console.log();
		setTimeout(function() {
			general.logger(messages.lotro_server_offline, true, true, console_channel);
			//log_to_discord_console();
		}, 1000);
	}
	//ping_monitor_interval = 1;
	lotro_server_status = false;
});

myPingMonitor.on('timeout', function (error, res) {
	general.logger(error, true, true, console_channel);
	//console.log();
	if (lotro_server_status) {
	//if (ping_monitor_interval != 1) {
		general.logger('Oh Snap!! ' + res.address + ':' + res.port + ' is down! ', true, true, console_channel);
		//console.log();
		setTimeout(function() {
			general.logger(messages.lotro_server_offline, true, true, console_channel);
			//log_to_discord_console();
		}, 1000);
	}
	//ping_monitor_interval = 1;
	lotro_server_status = false;
	
});

myPingMonitor.on('error', function (error, res) {
	if (res.code === 'ECONNREFUSED') {
		if (lotro_server_status) {
		//if (ping_monitor_interval != 1) {
			general.logger('Oh Snap!! ' + res.address + ':' + res.port + ' is down! ', true, true, console_channel);
			//console.log();
			setTimeout(function() {
				general.logger(messages.lotro_server_offline, true, true, console_channel);
				//log_to_discord_console();
			}, 1000);
		}
		//ping_monitor_interval = 1;
		lotro_server_status = false;
	} else {
		general.logger(error, true, true, console_channel);
		//console.log();
	}
});

setInterval(function() {
	if (Object.keys(people_on_timeout).length > 0) {
		general.logger('timeout counter reset on set interval', true, true, console_channel);
		//log_to_discord_console();
	}
	people_on_timeout = {};
}, interval_to_reset_message_timneout);


// true startup //
if (check_JSON_files()) {
	general.logger('JSON loaded correctly', false, true, console_channel);
	//console.log();
}

//runescape.init(); // only run on first startup

runescape.update_ge_prices();
runescape.keep_ge_uptodate();

client.login(bot_config.bot_key);
