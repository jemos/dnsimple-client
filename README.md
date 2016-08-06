# dnsimple-client
DNSimple nodejs client module

This is a nodejs module to manage DNSimple account through the API v1 available.

# Instalation

	npm install dnsimple-client

# User Guide

In order to use this module you need to have an account in DNSimple. From the control
panel you can create API access tokens that can be used to manage account resources
from external tools like this module.

The DNSimple provides three ways of authentication.

1. Username and password based.
2. Email and token based.
3. Domain token.

For demonstration we'll be using email and token based authentication. In the following practical example we update the home domain record IP address from one obtained from ipify.

	var http = require('http');
	var DNSimple = require('./dnsimple-client').DNSimple;

	var client = new DNSimple({token: '<your_token>', email:'<your_email>'});

	client.getAllDomains(function(domainList) {

		var findFunc = function(record) {
			return record.name == 'home';
		};

		domainList[0].findRecord(findFunc,function(record) {

			if(!record) {
				console.log("Unable to find home record! Aborting...");
				exit(1);
			}

			var homeIP = record.getAttr('content');
			console.log("Current home record IP is "+homeIP);

			http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
				resp.on('data', function(ip) {

					var publicIP = ip.toString();
					console.log("My public IP address is: " + publicIP);

					if( publicIP === homeIP ) {
						console.log("No need to update.");
						console.log("update.js finished.");
						process.exit(0);
					}

					// Update record
					record.update({content: publicIP}, function(record,err) {
						if(err) {
							console.log("Failed to update record: "+err);
							process.exit(1);
						}

						console.log("Update was done successfully.");
						console.log("update.js finished.");
					});
				});
			});

		});

	});