// Phân số chính xác dùng BigInt, để xác suất lý thuyết như 1/1024 không bị làm tròn.
import type { XacSuat } from "../types";

function ucln(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export class PhanSo {
  readonly tu: bigint;
  readonly mau: bigint;

  constructor(tu: bigint | number, mau: bigint | number = 1n) {
    let t = BigInt(tu);
    let m = BigInt(mau);
    if (m === 0n) throw new Error("Mẫu số phải khác 0");
    if (m < 0n) {
      t = -t;
      m = -m;
    }
    const g = ucln(t, m) || 1n;
    this.tu = t / g;
    this.mau = m / g;
  }

  static tu(p: XacSuat): PhanSo {
    return new PhanSo(p.tu, p.mau);
  }

  static readonly KHONG = new PhanSo(0);
  static readonly MOT = new PhanSo(1);

  cong(b: PhanSo): PhanSo {
    return new PhanSo(this.tu * b.mau + b.tu * this.mau, this.mau * b.mau);
  }

  tru(b: PhanSo): PhanSo {
    return new PhanSo(this.tu * b.mau - b.tu * this.mau, this.mau * b.mau);
  }

  nhan(b: PhanSo): PhanSo {
    return new PhanSo(this.tu * b.tu, this.mau * b.mau);
  }

  chia(b: PhanSo): PhanSo {
    if (b.tu === 0n) throw new Error("Không thể chia cho 0");
    return new PhanSo(this.tu * b.mau, this.mau * b.tu);
  }

  bang(b: PhanSo): boolean {
    return this.tu === b.tu && this.mau === b.mau;
  }

  laKhong(): boolean {
    return this.tu === 0n;
  }

  soThuc(): number {
    return Number(this.tu) / Number(this.mau);
  }

  toString(): string {
    return this.mau === 1n ? `${this.tu}` : `${this.tu}/${this.mau}`;
  }
}
