const paths = require('../configs/paths.json');
const discord_xp_table = require('../configs/discord_xp_table.json');
const general = require('../modules/general.js');

function add_new_discord_user(user_id, guild_id, username) {
	if (user_id === undefined) return;
	if (typeof user_id !== 'string') return;

	let guild_path = `${paths.discord_users}/${guild_id}`;
	let user_path = `${guild_path}/${user_id}.json`;

	let new_info = {
		user_id : user_id,
		username : username,
		discord_xp : "1",
		discord_level : "0",
		notify_level : true
	}

	function write_to_file() {
		fs.writeFile(user_path, JSON.stringify(new_info),(error) => {
			if (error) {
				general.logger(error, true, true, console_channel);
				general.logger('to write file error', true, true, console_channel);
				//console.log();
				//console.log(error);
			}
		});
	}

	fsPromise.mkdir(guild_path)
	.then(write_to_file())
	.catch((error) => {
		if (error.code === 'EEXIST') {
			general.logger(`new user ${user_id} : ${username}`, true, true, console_channel);
			//console.log();
			write_to_file();
		} else {
			general.logger(error, true, true, console_channel);
			//console.log(error);
		}
	});
}

function calculate_discord_level(exp) {
	let level = 0;
	let array_of_xp = discord_xp_table.normal;

	array_of_xp.forEach( function(number) {

		if (typeof number !== 'number') {
			console.log('discord xp loop no number');
			return;
		}
		if (exp < number) {
			return level - 1;
		}
		level++;
	});

	return level - 1;
}

module.exports.add_new_user = add_new_discord_user;
module.exports.calculate_level = calculate_discord_level;