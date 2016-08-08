var https = require('https');
var querystring = require('querystring');

function debug() {
	console.log.apply(this,arguments);
}

function DNSimple(auth) {

	debug('DNSimple() called');

	// Set default options
	this.options = {
		protocol: 'https:',
		hostname: 'api.dnsimple.com',
		headers: {
			'Accept': 'application/json'
		},
		path: ''
	};

	// If we're using domain specific tokens 
	if( auth.domainToken ) {
		this.options.headers['X-DNSimple-Domain-Token'] = auth.domainToken;
	} else if( auth.email && auth.password ) {
		console.log("Error: unsupported auth structure (email+password)");
	} else if( auth.email && auth.token ) {
		this.options.headers['X-DNSimple-Token'] = auth.email + ':' + auth.token;
	} else {
		throw Error('Missing/invalid auth argument!');
	}
}

function httpRequest(options,dataReadyHandler,reqBody) {

	if( reqBody ) {
		// Add record id to the attribute list, otherwise will fail.
		var reqData = JSON.stringify(reqBody);
		options.headers['Content-Type'] = "application/json";
		options.headers['Content-Length'] = reqData.length;
	}

	var callback = function(resp) {

		var data = '';
		resp.on('data', function(chunk) {
			data += chunk;
		});

		resp.on('end', function() {
			jsonData = JSON.parse(data);

			dataReadyHandler(jsonData,null);
		});
	};

	var req = https.request(options,callback);

	req.on('error', function(err) {
		dataReadyHandler(null,err);
	});

	if( reqBody ) {
		req.write(reqData);
	}
	req.end();
}

DNSimple.prototype.getAllDomains = function(cb) {

	debug('DNSimple.getAllDomains() called');

	var options = Object.assign({},this.options);
	options.path = '/v1/domains';
	options.method = 'GET';

	var dnsimple = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var domainList = jsonData.map(function(entry) {
			return new Domain(dnsimple,entry.domain);
		});
		
		// Call the callback
		cb(domainList,null);
	});

};

DNSimple.prototype.createDomain = function(attrList) {

	debug('DNSimple.createDomain() called');

	var options = Object.assign({},this.options);
	options.path = '/v1/domains';
	options.method = 'POST';

	var dnsimple = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var domainList = jsonData.map(function(entry) {
			return new Domain(dnsimple,entry.domain);
		});
		
		// Call the callback
		cb(domainList,null);
	}, {domain: attrList});

};

DNSimple.prototype.deleteDomain = function(domain) {

	debug('DNSimple.deleteDomain() called');

	if( !(domain instanceof Domain) ) {
		throw Error("Argument is not a domain object!");
	}

	var options = Object.assign({},this.options);
	options.path = '/v1/domains/' + domain.domainData.id;
	options.method = 'DELETE';

	var dnsimple = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		cb(true,null);
	});

};

DNSimple.prototype.resetDomainToken = function(domain) {

	debug('DNSimple.resetDomainToken() called');

	if( !(domain instanceof Domain) ) {
		throw Error("Argument is not a domain object!");
	}

	var options = Object.assign({},this.options);
	options.path = '/v1/domains/' + domain.domainData.id + '/token';
	options.method = 'POST';

	var dnsimple = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var newDomain = new Domain(dnsimple,jsonData.domain);
		cb(newDomain,null);
	});

};

function Domain(dnsimple,data) {

	if( !data ) {
		throw Error('Missing data argument!');
	}
	this.domainData = data;

	if( !dnsimple ) {
		throw Error('Missing dnsimple argument!');
	}
	this.dnsimple = dnsimple;
	
	return;
};

Domain.prototype.dump = function() {
	// Dump domain information
	console.log("Domain listing:");
	for(prop in this.domainData) {
		console.log("  "+prop+": "+this.domainData[prop]);
	}
};

Domain.prototype.getAllRecords = function(cb) {

	debug('Domain.getAllRecords() called');

	var options = Object.assign({},this.dnsimple.options);
	options.path = '/v1/domains/' + this.domainData.id + '/records';
	options.method = 'GET';

	var domain = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var recordList = jsonData.map(function(entry) {
			return new DomainRecord(domain,entry.record);
		});
		cb(recordList, null);
	});

};

Domain.prototype.getRecord = function(id,cb) {
	debug('Domain.getRecord(id="+id+") called');

	var options = Object.assign({},this.dnsimple.options);
	options.path = '/v1/domains/' + this.domainData.id + '/record/' + id;
	options.method = 'GET';

	var domain = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var record = new DomainRecord(domain,jsonData.record);
		cb(record, null);
	});
};

// If more than one record matches, it will only return the first one.
Domain.prototype.findRecord = function(matchFunc,cb) {
	debug('Domain.findRecord() called');

	var options = Object.assign({},this.dnsimple.options);
	options.path = '/v1/domains/' + this.domainData.id + '/records';
	options.method = 'GET';

	var domain = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		var recordList = jsonData.filter(function(entry) {
			return matchFunc(entry.record);
		});
		if( recordList.length ) {
			var record = new DomainRecord(domain,recordList[0].record)
			cb(record,null);
		} else {
			cb(null,null);
		}
	});

};

function DomainRecord(domain,data) {

	if( !data ) {
		throw Error('Missing data argument!');
	}
	this.recordData = data;

	if( !domain ) {
		throw Error('Missing dnsimple argument!');
	}
	this.domain = domain;
}

DomainRecord.prototype.refresh = function() {
	debug('DomainRecord.refresh() called');

	var options = Object.assign({},this.domain.dnsimple.options);
	options.path = '/v1/domains/' + this.domain.domainData.id + '/records/' + this.recordData.id;
	options.method = 'GET';

	var domain = this;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		this.recordData = jsonData.record;
		cb(true, null);
	});

};

DomainRecord.prototype.update = function(attrList,cb) {
	//
	debug('DomainRecord.update() called');

	var options = Object.assign({},this.domain.dnsimple.options);
	options.path = '/v1/domains/' + this.domain.domainData.id + '/records/' + this.recordData.id;
	options.method = 'PUT';

	var domain = this.domain;

	httpRequest(options, function(jsonData,err) {

		if( err ) {
			return cb(null,err);
		}

		if( jsonData.message ) {
			return cb(null,jsonData.message);
		}
			
		var record = new DomainRecord(domain,jsonData.record);
		cb(record,null);
	}, {record: attrList});

};

DomainRecord.prototype.dump = function() {
	// Dump domain information
	console.log("Domain record listing:");
	for(prop in this.recordData) {
		console.log("  "+prop+": "+this.recordData[prop]);
	}
};

DomainRecord.prototype.getAttr = function(attr) {
	return this.recordData[attr];
};

module.exports.DNSimple = DNSimple;
module.exports.DomainRecord = DomainRecord;
module.exports.Domain = Domain;

