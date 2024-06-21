

process.exit(await main(...process.argv.slice(2)));

async function main(...argv)
{
	const path = require('path');
	const fs = require('fs');
	const proc = require('child_process');
	const [
		//normalize,
		basename,
		log,
		error,
		exists,
		read,
		spawn,
		spawnSync,
		stdout,
		pt,
	]	=	[
		//(p) => Array.isArray(p) ? p.map(normalize) : p.replace(/\\/g,'/'),
		path.basename,
		console.log,
		console.error,
		fs.existsSync,
		fs.readFileSync,
		Bun.spawn,
		proc.spawnSync,
		process.stdout,
		performance.now,
	];
	var cmd = __dirname + "\\tools\\orbis-pub-cmd.exe";
	if (!exists(cmd))
	{
		error("Missing orbis-pub-cmd.exe");
		return 1;
	}
	if (argv.length !== 1)
	{
		log("Usage: "+
			process.argv.slice(0,2).map((e) => basename(e)).join(' ')+
			" <package>\n"+
			" <package> - The package file to brute force.\n");//+
			//" <output>  - Output directory.");
		return 1;
	}
	const [input] = argv;
	if (!exists(input))
	{
		error("File "+basename(input)+" cannot be found");
		return 1;
	}
	log("Testing "+basename(input));
	{
		var info_cmd = proc.spawnSync(cmd, ["img_info", input]);
		if (info_cmd.status !== 0)
		{
			error(info_cmd.stdout.toString());
			return info_cmd.status;
		}
	}
	String.prototype.replaceAt = function(index, rep) {
		return this.substring(0, index) + rep + this.substring(index + rep.length);
	} // screw javascript https://stackoverflow.com/questions/1431094/
	const rand = x => Math.floor(Math.random()*x);
	const pass_alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
	const pass_length = 32;
	function gen_pass()
	{
		var test = "";
		if (false)
			return test;
		for (var i = 0; i < pass_length; i++)
		{
			test += pass_alphabet[rand(pass_alphabet.length)];
		}
		return test;
	}
	async function test_pass(pass, i = -1)
	{
		var test = spawn([cmd, "img_file_list", "--passcode", pass, input]);
		await test.exited;
		if (test.exitCode === 0)
			log(await new Response(test.stdout).text());
		return [test.exitCode === 0, pass, i];
	}
	var known_passes = [];
	{
		var test = __dirname+"\\known_passwords.txt";
		if (exists(test))
			known_passes = [...known_passes, ...read(test).split('\n')];
	}
	if (known_passes.length > 0)
	{
		log("Got previously cracked passwords. Testing...");
		for (var i = 0; i < known_passes.length; i++)
		{
			var pass = known_passes[i];
			process.stdout.write('* ' + pass.padEnd(32) + '\r');
			var test = await test_pass(pass);
			if (test[0])
			{
				log("\nPreviously cracked password successful!");
				return 0;
			}
		}
	}
	const pad2 = (t,d='0') => t.toString().padStart(2,d);
	const timefmt = ms => (
		pad2(Math.floor(ms / 3600000)) + ':' +
		pad2(Math.floor((ms / 60000) % 60)) + ':' +
		pad2((ms/1000 % 60).toFixed(0))
	)
	
	const start_time = performance.now();
	//var found_passcode = false;
	var attempts = 0;
	const max_instances = 8;
	const test_procs = Array(max_instances).fill(null);
	while (true)
	{
		var first_empty = test_procs.indexOf(null);
		if (first_empty > -1)
		{
			var test = gen_pass();
			test_procs[first_empty] = test_pass(test, first_empty);
		}
		else
		{
			attempts++;
			var first_res = await Promise.any(test_procs.filter(n => n !== null));
			stdout.write("* ["+timefmt(pt() - start_time)+"] <"+attempts.toString().padStart(8,'0')+"> "+first_res[1]+"\r");
			if (first_res[0])
			{
				log('\ngot!');
				break;
			}
			delete test_procs[first_res[2]];
			test_procs[first_res[2]] = null;
		}
	}
}

