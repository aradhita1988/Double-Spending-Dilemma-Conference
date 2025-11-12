import Web3 from "web3";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();

async function deploy(chainUrl, name) {
  const web3 = new Web3(chainUrl);
  const accounts = await web3.eth.getAccounts();

  const contractJSON = JSON.parse(
    fs.readFileSync("./build/contracts/DelaySim.json", "utf8")
  );

  const contract = new web3.eth.Contract(contractJSON.abi);

  console.log(`\n🚀 Deploying DelaySim to ${name}...`);

  const deployed = await contract
    .deploy({ data: contractJSON.bytecode })
    .send({ from: accounts[0], gas: 3000000 });

  console.log(`✅ ${name} deployed at: ${deployed.options.address}`);
  return deployed.options.address;
}

(async () => {
  const addrA = await deploy("http://127.0.0.1:7545", "ChainA");
  const addrB = await deploy("http://127.0.0.1:8545", "ChainB");

  fs.writeFileSync(
    "contractAddresses.json",
    JSON.stringify({ ChainA: addrA, ChainB: addrB }, null, 2)
  );
  console.log("\n📄 Saved contract addresses to contractAddresses.json");
})();
