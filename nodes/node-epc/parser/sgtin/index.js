var S = require('string');

'use strict';

var TAG = 'parser.sgtin';
var header = '00110000';
var partition = {
	bits: {
		company: [40, 37, 34, 30, 27, 24, 20],
		reference: [4, 7, 10, 14, 17, 20, 24]
	},
	digits: {
		company: [12, 11, 10, 9, 8, 7, 6],
		reference: [1, 2, 3, 4, 5, 6, 7]
	}
};

var Abstract = require('../abstract'),
	log = require('npmlog-ts'),
	Q = require('q');

var self = Object.create(Abstract, {
	parse: {
		value: function(val) {
			return Q.Promise(function(resolve, reject) {
				try {
					if(Array.isArray(val)){						

						self.parts  = [];
						for (let i = 0; i < val.length; i++) {
							const epc = val[i];
							log.verbose(TAG, 'parse');
							log.info(TAG, 'parsing %j', epc);
							self.base.parse(epc);
							var bh = new self.base.bitsHelper(epc, 96);
							if (bh.bits.slice(0, 8) !== header)
								throw new Error(epc + ' is not a valid SGTIN.');
							
							const parts = {
								Header: null, 
								Filter: null, 
								Partition: null,
								CompanyPrefix: null,
								ItemReference: null,
								SerialNumber: null};

							parts.Header = bh.bits.slice(0, 8);
							parts.Filter = parseInt(bh.bits.slice(8, 11), 2);
							parts.Partition = parseInt(bh.bits.slice(11, 14), 2);
							
							var companyPrefixEnd = 14 + partition.bits.company[parts.Partition];

							// get the company value from the bits, convert to a string
							var company = parseInt(bh.bits.slice(14, companyPrefixEnd), 2).toString();

							// pad the string with leading zeros to make-up the length according to the calculate length
							company = Array(partition.digits.company[parts.Partition] - company.length + 1).join('0') + company;

							parts.CompanyPrefix = company;

							var item = parseInt(bh.bits.slice(companyPrefixEnd, companyPrefixEnd + partition.bits.reference[parts.Partition]), 2).toString();
							item = Array(partition.digits.reference[parts.Partition] - item.length + 1).join('0') + item;

							parts.ItemReference = item;
							parts.SerialNumber = parseInt(bh.bits.slice(58), 2);
							var ref = S(parts.ItemReference).right(5).s;
							parts.sku = parts.CompanyPrefix + ref;
							parts.ean = obtainEAN13Code(parts.sku);							
							self.parts.push(parts);							
						}
						resolve(self);
					}else {
						log.verbose(TAG, 'parse');
						log.info(TAG, 'parsing %j', val);						

						// initialize base
						self.base.parse(val);

						// initalize the bit helper
						var bh = new self.base.bitsHelper(val, 96);

						// make sure the incoming value is really SGTIN by checking the header
						if (bh.bits.slice(0, 8) !== header)
							throw new Error(val + ' is not a valid SGTIN.');

						// ok, looks good.  parse the stuff we'll need to figure out the rest
						self.parts.Header = bh.bits.slice(0, 8);
						self.parts.Filter = parseInt(bh.bits.slice(8, 11), 2);
						self.parts.Partition = parseInt(bh.bits.slice(11, 14), 2);

						// find the end of the company portion by calculating the number of bits 
						// and adding it to the starting offset
						var companyPrefixEnd = 14 + partition.bits.company[self.parts.Partition];

						// get the company value from the bits, convert to a string
						var company = parseInt(bh.bits.slice(14, companyPrefixEnd), 2).toString();

						// pad the string with leading zeros to make-up the length according to the calculate length
						company = Array(partition.digits.company[self.parts.Partition] - company.length + 1).join('0') + company;

						self.parts.CompanyPrefix = company;

						var item = parseInt(bh.bits.slice(companyPrefixEnd, companyPrefixEnd + partition.bits.reference[self.parts.Partition]), 2).toString();
						item = Array(partition.digits.reference[self.parts.Partition] - item.length + 1).join('0') + item;

						self.parts.ItemReference = item;
						self.parts.SerialNumber = parseInt(bh.bits.slice(58), 2);

						resolve(self);
					}
					
				} catch (e) {
					log.error(TAG, e);

					reject(e);
				}
			});
		}
	},

	canParse: {
		value: function(val) {
			return Q.Promise(function(resolve, reject) {
				try {
					log.verbose(TAG, 'canParse');

					var bh = new self.base.bitsHelper(val, 96);

					resolve(bh.bits.slice(0, 8) === header);
				} catch (e) {
					log.error(TAG, e);

					reject(e);
				}
			});
		}
	},

	getUri: {
		value: function(val) {
			return Q.Promise(function(resolve, reject) {
				try {
					log.verbose(TAG, 'getUri');

					self.base.getUri(val);

					self.parse(val)
						.then(function(parsed) {
							resolve('urn:epc:tag:sgtin:' + parsed.parts.CompanyPrefix + '.' + parsed.parts.ItemReference + '.' + parsed.parts.SerialNumber);
						});
				} catch (e) {
					log.error(TAG, e);

					reject(e);
				}
			});
		}
	},

	getName: {
		value: function() {
			log.verbose(TAG, 'getName');

			return 'SGTIN';
		}
	}
});

module.exports = self;

function obtainEAN13Code (sku) {
	let evenSum = 0;
	let cheksumDigit;	
    let oddSum = 0;
    let sumCheckDigit;
	let nextMultiple;	
	var sk = S(sku);
	
	for (let i = 0; i < 12; i += 2) {		
		evenSum += parseInt(sk.s.charAt(i));		
	}

	for (let i = 1; i < 12; i += 2) {
		oddSum += parseInt(sk.s.charAt(i));		
	}

	sumCheckDigit = (oddSum * 3) + evenSum;

	if(sumCheckDigit % 10 == 0){
		nextMultiple = sumCheckDigit;
	}else {
		nextMultiple = sumCheckDigit + (10 - (sumCheckDigit % 10));
	}

	cheksumDigit = nextMultiple - sumCheckDigit;
	sku  = sk.s + cheksumDigit;
	if(sku.length != 13){
		console.log("Error al calcular EAN 13 en: " + sku);
	}
	return sku;
}