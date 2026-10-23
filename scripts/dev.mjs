// Chạy máy chủ và giao diện cùng lúc trong một terminal: `npm run dev`. Nhấn Ctrl+C để dừng cả hai.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (p) => path.join(goc, "node_modules", p);

const tienTrinh = [
  { ten: "server", mau: "\x1b[36m", args: [bin("tsx/dist/cli.mjs"), "watch", "apps/server/src/index.ts"] },
  { ten: "web   ", mau: "\x1b[35m", args: [bin("vite/bin/vite.js"), "apps/web"] },
].map(({ ten, mau, args }) => {
  const p = spawn(process.execPath, args, { cwd: goc, env: process.env });
  const ghi = (luong) => (du) => {
    for (const dong of du.toString().split(/\r?\n/)) if (dong.trim()) luong.write(`${mau}[${ten}]\x1b[0m ${dong}\n`);
  };
  p.stdout.on("data", ghi(process.stdout));
  p.stderr.on("data", ghi(process.stderr));
  p.on("exit", (code) => {
    console.log(`${mau}[${ten}]\x1b[0m đã dừng (mã ${code ?? 0})`);
    dungTatCa();
  });
  return p;
});

let dangDung = false;
function dungTatCa() {
  if (dangDung) return;
  dangDung = true;
  for (const p of tienTrinh) if (p.exitCode === null) p.kill();
  setTimeout(() => process.exit(0), 300);
}

process.on("SIGINT", dungTatCa);
process.on("SIGTERM", dungTatCa);

console.log("Đang khởi động… Mở http://localhost:5173 khi thấy dòng của vite. Nhấn Ctrl+C để dừng.");
