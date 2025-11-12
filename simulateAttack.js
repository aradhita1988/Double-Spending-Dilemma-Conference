import Web3 from "web3";
import fs from "fs";
import path from "path";

// ---------------- CONFIG ----------------
const config = {
  chainA: "http://127.0.0.1:7545",
  chainB: "http://127.0.0.1:8545",
  delays: [5, 10, 15, 20, 25],
  repeatCount: 3
};

// ---------------- INITIAL SETUP ----------------
const __dirname = path.resolve();
const web3A = new Web3(config.chainA);
const web3B = new Web3(config.chainB);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const contractData = JSON.parse(
  fs.readFileSync("./build/contracts/DelaySim.json", "utf8")
);
const deployedAddresses = JSON.parse(
  fs.readFileSync("./contractAddresses.json", "utf8")
);

const contractA = new web3A.eth.Contract(
  contractData.abi,
  deployedAddresses.ChainA
);
const contractB = new web3B.eth.Contract(
  contractData.abi,
  deployedAddresses.ChainB
);

// ---------------- CONFLICT DETECTION ----------------
async function detectConflict(tx1, tx2, web3) {
  const start = Date.now();
  for (let i = 0; i < 30; i++) {
    const r1 = await web3.eth.getTransactionReceipt(tx1);
    const r2 = await web3.eth.getTransactionReceipt(tx2);
    if (r1 && r2 && r1.blockNumber !== r2.blockNumber) {
      return (Date.now() - start) / 1000;
    }
    await sleep(1000);
  }
  return 0;
}

// ---------------- SIMULATION ----------------
async function simulate(delaySec) {
  const accountsA = await web3A.eth.getAccounts();
  const accountsB = await web3B.eth.getAccounts();

  let detectedCount = 0;
  let times = [];

  for (let i = 0; i < config.repeatCount; i++) {
    // Honest TX on ChainA
    const honestTx = await contractA.methods
      .recordAction("HonestTx")
      .send({ from: accountsA[0], gas: 200000 });

    // Mirror on ChainB
    await contractB.methods
      .recordAction("MirrorTx")
      .send({ from: accountsB[0], gas: 200000 });

    // Simulate delay before attack
    await sleep(delaySec * 1000);

    // Attack TX (double-spend simulation)
    const attackerTx = await contractA.methods
      .recordAction("AttackTx")
      .send({ from: accountsA[0], gas: 200000 });

    const time = await detectConflict(
      honestTx.transactionHash,
      attackerTx.transactionHash,
      web3A
    );

    if (time > 0) {
      detectedCount++;
      times.push(time);
    }
  }

  const prob = (detectedCount / config.repeatCount) * 100;
  const avgDetect = times.length ? times.reduce((a, b) => a + b) / times.length : 0;

  return { delaySec, prob, avgDetect: avgDetect.toFixed(2) };
}

// ---------------- MAIN ----------------
(async function main() {
  console.log("\n running Multichain Double-Spend Simulation (with Smart Contract)...");
  console.log("Delay(s)\tDetectProb(%)\tAvgTime(s)");
  const results = [];

  for (const d of config.delays) {
    const res = await simulate(d);
    console.log(`${d}\t\t${res.prob.toFixed(2)}\t\t${res.avgDetect}`);
    results.push(res);
  }

  const filename = `results_${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${filename}`);
})();
