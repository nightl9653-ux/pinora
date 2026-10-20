import { execSync } from "node:child_process";

const ports = [5173, 8787];

function pidsOn(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const ids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/\sLISTEN\s/.test(line) && !/LISTENING/.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts.at(-1));
      if (pid > 0) ids.add(pid);
    }
    return [...ids];
  } catch {
    return [];
  }
}

for (const port of ports) {
  for (const pid of pidsOn(port)) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
      console.log(`freed :${port} (pid ${pid})`);
    } catch {
      console.log(`could not kill pid ${pid} on :${port}`);
    }
  }
}
