var express = require('express');
var _ = require('underscore');
var bitcore = require('bitcore-lib');
var explorers = require('bitcore-explorers');
var Mnemonic = require('bitcore-mnemonic');

var Insight = explorers.Insight;

var Unit = bitcore.Unit;

var router = express.Router();

/* GET users listing. */
router.post('/recover', function(req, res, next) {

    try {

        if (req.body.network == 'live')
            bitcore.Networks.defaultNetwork = bitcore.Networks.livenet;
        else
            bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;


        var phrase = req.body.phrase;
        var cf_public_key = req.body.cf_public_key;
        var addressToSend = req.body.addressToSend;

        var words = phrase.split(" ");
        var n = 12;
        var wordLists = _.groupBy(words, function(element, index) {
            return Math.floor(index / n);
        });

        var privateKeyList = [];
        var publicKeyList = [cf_public_key];

        _.each(wordLists, function(words) {
            var code = new Mnemonic(words.join(" "));
            code.toString();
            var hdPrivateKey = code.toHDPrivateKey();

            var derivedHdPrivateKey = hdPrivateKey.derive("m/44'/0'/0'/0/0");
            var derivedPrivateKey = hdPrivateKey.privateKey;

            var derivedHdPublicKey = derivedHdPrivateKey.hdPublicKey;
            var derivedPublicKey = derivedHdPublicKey.publicKey;

            var publicKey = new bitcore.PublicKey(derivedPrivateKey);

            privateKeyList.push(derivedPrivateKey.toString());
            publicKeyList.push(publicKey.toString());

        });

        var addressx = new bitcore.Address(publicKeyList, 2);

        console.log(addressx);

        //res.json({address:addressx.toString()});

        var insight = new Insight();
        insight.getUnspentUtxos(addressx.toString(), function(err, utxos) {
            if (err) {
                return next(new Error(err))
            } else {
                utxos = JSON.parse(JSON.stringify(utxos));
                if (utxos.length > 0) {
                    var redeemScript = bitcore.Script.buildMultisigOut(publicKeyList, 2);
                    var s = redeemScript.toScriptHashOut();

                    var amount = 0;
                    utxos = utxos.map(function(u) {
                        return {
                            "txId": u.txid,
                            "sequenceNumber": 4294967295,
                            "outputIndex": u.vout,
                            "address": u.address,
                            "script": s,
                            "satoshis": Unit.fromBTC(u.amount).toSatoshis()
                        };
                    });

                    var transaction = new bitcore.Transaction();
                    _.each(utxos, function(u) {
                        amount += u.satoshis;
                    });
                    transaction.from(utxos, publicKeyList, 2);
                    transaction.change(addressx.toString())
                    transaction.fee(5430)
                    transaction.to(addressToSend, amount - 5430)

                    _.each(privateKeyList, function(pk) {
                        transaction.sign(pk);
                    });

                    var insight = new Insight("https://test-insight.bitpay.com", "testnet");
                    insight.broadcast(transaction, function(err, returnedTxId) {
                        if (err) {
                            res.json({
                                success: false,
                                txId: null,
                                message: 'Unable to broadcast transaction. Please try again.'
                            })
                        } else {
                            res.json({
                                success: true,
                                message: 'Recovery successful',
                                txId: returnedTxId
                            })
                        }
                    })
                } else {
                    res.json({
                        success: false,
                        txId: null,
                        message: 'This address is empty.'
                    })
                }
            }
        });
    } catch (e) {
        res.json({
            success: false,
            txId: null,
            message: 'Error on recovery. Please check the data you entered and try again.'
        })
    }

});

module.exports = router;
