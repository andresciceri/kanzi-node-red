'use strict';

var epc = require('../');
//var epc = require('node-epc');

// Parse by discovering the encoding
var data = ['3035D613D410430000000000', 
			'3035D613D410430000000001', 
			'3035D613D40003800000010A',
			'3035D613D41042C000000003',
			'3035D613D4021E00000000ED',
			'3035D613D4021E00000000EE'];
epc.parse(data)
	.then(function(parsed) {				
		console.log('Encoding = ' + parsed.getName());
		for (let i = 0; i < parsed.parts.length; i++) {
			const parts = parsed.parts[i];
			console.log('EPC = ' + parts.epc);
			console.log('Company Prefix = ' + parts.CompanyPrefix);
			console.log('Item Reference = ' + parts.ItemReference);
			console.log('Serial Number = ' + parts.SerialNumber);
		}		
	})
	.fail(function(err) {
		console.error(err);
	});

// Parse using a specific encoding
