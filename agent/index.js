import { spawn } from "node:child_process";

const steps = ["find", "score", "enrich", "draft", "send", "track", "report"];

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`agent/${step}.js`], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${step} failed with exit code ${code}`));
    });
  });
}

async function main() {
  for (const step of steps) {
    console.log(`\n=== ${step.toUpperCase()} ===`);
    await runStep(step);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
