const assert = require('assert');

import Connector from '../src/connector';

describe('Connector', function() {
  describe('parseTransactionRequest', function() {
    const target_address = '0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359';
    const value = 2014000000000000000;
    const gas = 21000000;
    const chainId = 2;
    const connector = new Connector('', { chainId: chainId });

    it(`chainId of connector should be ${chainId}`, function() {
      assert.equal(connector.chainId, chainId);
    });

    it('should throw because chain_id defaults to 1 but connector is on 2', function() {
      assert.throws(function() {
        connector.parseTransactionRequest('ethereum:0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359?value=2.014e18');
      });
    });

    it('pay to address', function() {
      const data =
        { target_address: '0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359',
          chain_id: 2,
          parameters: { value: 2014000000000000000 }
        };
      const res = connector.parseTransactionRequest('ethereum:pay-0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359@2?value=2.014e18');
      assert.deepEqual(res, data);
    });

    it('pay to contract', function() {
      const data =
        {
          target_address: '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
          chain_id: 2,
          parameters:
          {
            address: '0x8e23ee67d1332ad560396262c48ffbb01f93d052',
            uint256: '1'
          },
          function_name: 'transfer'
        };

      const res = connector.parseTransactionRequest('ethereum:pay-0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7@2/transfer?address=0x8e23ee67d1332ad560396262c48ffbb01f93d052&uint256=1');
      assert.deepEqual(res, data);
    });

    it('pay to address with UNIT, which is not supported at the moment, should throw', function() {
      assert.throws(function() {
        connector.parseTransactionRequest('ethereum:0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359@2?value=2.22+ETH');
      });
    });
  });

  describe('stringifyTransactionRequest', function() {
    const chainId = 2;
    const connector = new Connector('', { chainId: chainId });

    it('pay to address', function() {
      const data =
        { target_address: '0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359',
          parameters: { value: 2014000000000000000 }
        };
      const res = connector.stringifyTransactionRequest(data);
      assert.equal(res, 'ethereum%3A0xfb6916095ca1df60bb79Ce92ce3ea74c37c5d359%402%3Fvalue%3D2014000000000000000');
    });

    it('pay to contract', function() {
      const data =
        {
          target_address: '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
          parameters:
          {
            address: '0x8e23ee67d1332ad560396262c48ffbb01f93d052',
            uint256: '1'
          },
          function_name: 'transfer'
        };

      const res = connector.stringifyTransactionRequest(data);
      assert.equal(res, 'ethereum%3A0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7%402%2Ftransfer%3Fuint256%3D1%26address%3D0x8e23ee67d1332ad560396262c48ffbb01f93d052');
    });
  });
});
