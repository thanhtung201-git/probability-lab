// Lời giải từng bước cho mọi thí nghiệm trong phòng thí nghiệm: công thức, các bước và phép tính bằng phân số chính xác.
// Toàn bộ số liệu do mã tính, không do AI: AI (nếu dùng) chỉ được phép diễn đạt lại lời giải này, không được đổi con số.
import { PhanSo } from "./mo-phong/phan-so";
import { phanPhoiDem, toHop } from "./mo-phong/to-hop";
import { phanPhoiLyThuyet } from "./mo-phong/xuc-xac";
import { khongGianMau, moTaBienCoBaiToan, nhanVat, TEN_DAI_LUONG } from "./mo-phong/thi-nghiem/bai-toan";
import { laSuKienBi, moTaSuKienBi, tongBi } from "./mo-phong/thi-nghiem/bi";
import { cacSoThuanLoi, moTaBienCo } from "./mo-phong/thi-nghiem/the";
import { cacKhoaVat, type CauHinhVat } from "./mo-phong/thi-nghiem/vat";

export interface BuocGiai {
  tieu_de: string;
  loi: string;
  /** Các dòng phép tính, mỗi dòng một bước biến đổi. */
  phep_tinh?: string[];
}

export interface LoiGiai {
  /** Câu hỏi được giải, ví dụ "Tính xác suất tổng hai con xúc xắc bằng 7". */
  de: string;
  /** Giải thích bằng lời thường, dành cho học sinh: vì sao tính như vậy, chỗ nào dễ nhầm. */
  de_hieu: string[];
  cong_thuc: string;
  buoc: BuocGiai[];
  ket_qua: string;
  /** Xác suất cuối cùng đã rút gọn, trùng với xác suất lý thuyết của thí nghiệm. */
  xac_suat: string;
  /** Điều dễ nhầm hoặc cách làm khác. */
  luu_y?: string;
}

type Phan = Omit<LoiGiai, "ket_qua" | "xac_suat" | "de_hieu"> & { tu: bigint; mau: bigint };

const pt = (x: number) => `${(x * 100).toFixed(2).replace(".", ",")}%`;
const giaiThua = (n: number) => Array.from({ length: n }, (_, i) => BigInt(i + 1)).reduce((a, b) => a * b, 1n);
const mu = (a: number | bigint, n: number) => BigInt(a) ** BigInt(n);
const lap = (a: number | bigint | string, n: number, noi = " × ") => Array<string>(n).fill(String(a)).join(noi);
const rutGon = (tu: bigint, mau: bigint) => new PhanSo(tu, mau).toString();
/** "tu/mau" chưa rút gọn, để học sinh thấy bước rút gọn. */
const tm = (tu: bigint | number, mau: bigint | number) => `${tu}/${mau}`;

/** C(n, k) kèm cách tính bằng giai thừa, ví dụ "C(4,2) = 4! ÷ (2! × 2!) = 24 ÷ 4 = 6". */
function bieuThucToHop(n: number, k: number): string {
  if (k < 0 || k > n) return `C(${n},${k}) = 0 (không thể chọn ${k} từ ${n})`;
  const c = toHop(n, k);
  if (k === 0 || k === n) return `C(${n},${k}) = 1`;
  return `C(${n},${k}) = ${n}! ÷ (${k}! × ${n - k}!) = ${giaiThua(n)} ÷ (${giaiThua(k)} × ${giaiThua(n - k)}) = ${c}`;
}

const CONG_THUC_DONG_KHA_NANG = "P(A) = số kết quả thuận lợi cho A ÷ tổng số kết quả có thể (các kết quả đồng khả năng)";

// ---------------------------------------------------------------- xúc xắc

/** Các bộ n mặt (có thứ tự) có tổng s. */
function lietKeTong(n: number, s: number): number[][] {
  if (n === 0) return s === 0 ? [[]] : [];
  const kq: number[][] = [];
  for (let m = 1; m <= 6; m++) for (const duoi of lietKeTong(n - 1, s - m)) kq.push([m, ...duoi]);
  return kq;
}

function giaiXucXacPhanPhoi(ch: Extract<CauHinhVat, { loai: "xuc_xac"; che_do: "phan_phoi" }>, khoa: string): Phan {
  const n = ch.so_xuc_xac;
  if (n === 1) {
    return {
      de: `Gieo 1 con xúc xắc, tính xác suất ra mặt ${khoa}.`,
      cong_thuc: CONG_THUC_DONG_KHA_NANG,
      buoc: [
        { tieu_de: "Liệt kê mọi kết quả có thể", loi: "Xúc xắc cân đối có 6 mặt, mỗi mặt có khả năng như nhau.", phep_tinh: ["Các kết quả: 1, 2, 3, 4, 5, 6 → có 6 kết quả"] },
        { tieu_de: "Đếm kết quả thuận lợi", loi: `Chỉ có mặt ${khoa} là thuận lợi.`, phep_tinh: ["Số kết quả thuận lợi = 1"] },
        { tieu_de: "Áp dụng công thức", loi: "Lấy số kết quả thuận lợi chia cho tổng số kết quả.", phep_tinh: [`P = 1/6`] },
      ],
      tu: 1n,
      mau: 6n,
    };
  }
  const s = Number(khoa);
  const tong = mu(6, n);
  const cach = lietKeTong(n, s);
  const hienThi = cach.slice(0, 36).map((c) => `(${c.join(", ")})`);
  return {
    de: `Gieo ${n} con xúc xắc, tính xác suất tổng số chấm bằng ${s}.`,
    cong_thuc: CONG_THUC_DONG_KHA_NANG,
    buoc: [
      {
        tieu_de: "Đếm tất cả kết quả có thể",
        loi: `Mỗi con có 6 mặt, ${n} con gieo cùng lúc nên nhân các khả năng lại với nhau.`,
        phep_tinh: [`${lap(6, n)} = ${tong} kết quả (mỗi kết quả là một bộ ${n} mặt, có xét thứ tự)`],
      },
      {
        tieu_de: `Liệt kê các bộ có tổng bằng ${s}`,
        loi: "Tìm mọi bộ mặt cộng lại được tổng cần tính. Hai bộ khác thứ tự là hai kết quả khác nhau vì chúng là các con xúc xắc khác nhau.",
        phep_tinh: [hienThi.join("  ") + (cach.length > hienThi.length ? "  …" : ""), `Số kết quả thuận lợi = ${cach.length}`],
      },
      {
        tieu_de: "Áp dụng công thức và rút gọn",
        loi: "Lấy số kết quả thuận lợi chia cho tổng số kết quả.",
        phep_tinh: [`P = ${tm(cach.length, tong)} = ${rutGon(BigInt(cach.length), tong)}`],
      },
    ],
    luu_y: n === 2 ? "Dễ sai: coi (2, 5) và (5, 2) là một. Hai con xúc xắc là hai vật khác nhau nên đó là hai kết quả riêng." : undefined,
    tu: BigInt(cach.length),
    mau: tong,
  };
}

function giaiXucXacDieuKien(ch: Extract<CauHinhVat, { loai: "xuc_xac"; che_do: "dieu_kien" }>, khoa: string): Phan {
  const k = ch.so_lan_truoc;
  const tu = mu(5, k);
  const ra = khoa === "ra";
  const tuCuoi = ra ? tu : tu * 5n;
  return {
    de: `Đã ${k} lần liên tiếp không ra mặt ${ch.mat}. Tính xác suất lần gieo kế tiếp ${ra ? "ra" : "không ra"} mặt ${ch.mat}.`,
    cong_thuc: "P(B | A) = P(A và B) ÷ P(A)   (xác suất của B khi đã biết A xảy ra)",
    buoc: [
      {
        tieu_de: "Xét các dãy gieo k + 1 lần",
        loi: `Gọi A là “${k} lần đầu đều không ra mặt ${ch.mat}”, B là “lần thứ ${k + 1} ${ra ? "ra" : "không ra"} mặt ${ch.mat}”. Mỗi lần gieo có 6 mặt nên có ${lap(6, k + 1)} = ${mu(6, k + 1)} dãy.`,
      },
      {
        tieu_de: "Đếm số dãy thỏa A",
        loi: `Mỗi lần trong ${k} lần đầu có 5 mặt khác ${ch.mat}; lần cuối tùy ý (6 mặt).`,
        phep_tinh: [`${lap(5, k)} × 6 = ${tu * 6n} dãy`],
      },
      {
        tieu_de: "Đếm số dãy thỏa cả A và B",
        loi: `Lần cuối phải ${ra ? `ra mặt ${ch.mat} (1 cách)` : `khác ${ch.mat} (5 cách)`}.`,
        phep_tinh: [`${lap(5, k)} × ${ra ? 1 : 5} = ${tuCuoi} dãy`],
      },
      {
        tieu_de: "Chia và rút gọn",
        loi: "Xác suất có điều kiện bằng số dãy thỏa cả hai chia cho số dãy thỏa A.",
        phep_tinh: [`P = ${tm(tuCuoi, tu * 6n)} = ${rutGon(tuCuoi, tu * 6n)}`],
      },
    ],
    luu_y: "Kết quả bằng đúng xác suất của một lần gieo bình thường: xúc xắc không “nhớ” các lần trước, nên không có chuyện đến lượt phải ra.",
    tu: tuCuoi,
    mau: tu * 6n,
  };
}

function giaiXucXacDay(ch: Extract<CauHinhVat, { loai: "xuc_xac"; che_do: "day" }>, khoa: string): Phan {
  const day = khoa === "b" ? ch.day_b : ch.day_a;
  const L = day.length;
  return {
    de: `Gieo xúc xắc ${L} lần liên tiếp, tính xác suất ra đúng dãy ${day.join("-")}.`,
    cong_thuc: "P(cả dãy) = P(lần 1) × P(lần 2) × … (các lần gieo độc lập nên nhân xác suất)",
    buoc: [
      { tieu_de: "Xác suất từng lần", loi: "Mỗi lần gieo phải ra đúng một mặt định sẵn trong 6 mặt.", phep_tinh: day.map((m, i) => `Lần ${i + 1} ra ${m}: 1/6`) },
      { tieu_de: "Nhân các xác suất", loi: "Các lần gieo không ảnh hưởng nhau nên nhân lại.", phep_tinh: [`P = ${Array<string>(L).fill("1/6").join(" × ")} = ${tm(1, mu(6, L))}`] },
    ],
    luu_y: "Mọi dãy cụ thể cùng độ dài đều có xác suất như nhau, kể cả dãy trông “đặc biệt” như 6-6-6.",
    tu: 1n,
    mau: mu(6, L),
  };
}

// ---------------------------------------------------------------- đồng xu

/** Các dãy n lần tung có đúng k lần ngửa (N), liệt kê khi n nhỏ. */
function lietKeNgua(n: number, k: number): string[] {
  const kq: string[] = [];
  for (let m = 0; m < 2 ** n; m++) {
    const day = Array.from({ length: n }, (_, i) => ((m >> (n - 1 - i)) & 1 ? "N" : "S")).join("");
    if (day.split("N").length - 1 === k) kq.push(day);
  }
  return kq;
}

function giaiDongXuPhanPhoi(ch: Extract<CauHinhVat, { loai: "dong_xu"; che_do: "phan_phoi" }>, khoa: string): Phan {
  const n = ch.so_dong_xu;
  if (n === 1) {
    return {
      de: `Tung 1 đồng xu, tính xác suất ra mặt ${khoa === "N" ? "ngửa" : "sấp"}.`,
      cong_thuc: CONG_THUC_DONG_KHA_NANG,
      buoc: [
        { tieu_de: "Liệt kê mọi kết quả có thể", loi: "Đồng xu cân đối có 2 mặt, khả năng như nhau.", phep_tinh: ["Các kết quả: N (ngửa), S (sấp) → có 2 kết quả"] },
        { tieu_de: "Đếm kết quả thuận lợi", loi: `Chỉ có mặt ${khoa === "N" ? "ngửa" : "sấp"} là thuận lợi.`, phep_tinh: ["Số kết quả thuận lợi = 1"] },
        { tieu_de: "Áp dụng công thức", loi: "Lấy số kết quả thuận lợi chia cho tổng số kết quả.", phep_tinh: ["P = 1/2"] },
      ],
      tu: 1n,
      mau: 2n,
    };
  }
  const k = Number(khoa);
  const c = toHop(n, k);
  const tong = mu(2, n);
  const ds = n <= 5 ? lietKeNgua(n, k) : null;
  return {
    de: `Tung ${n} đồng xu cùng lúc, tính xác suất có đúng ${k} mặt ngửa.`,
    cong_thuc: `P = C(${n}, ${k}) ÷ 2^${n}   (C(n, k) là số cách chọn k đồng ngửa trong n đồng)`,
    buoc: [
      { tieu_de: "Đếm tất cả kết quả có thể", loi: `Mỗi đồng có 2 mặt, ${n} đồng nên nhân các khả năng lại.`, phep_tinh: [`${lap(2, n)} = ${tong} kết quả (mỗi kết quả là một dãy N/S dài ${n})`] },
      {
        tieu_de: `Đếm các kết quả có đúng ${k} mặt ngửa`,
        loi: `Chọn ${k} đồng trong ${n} đồng để cho ngửa, các đồng còn lại sấp.`,
        phep_tinh: [bieuThucToHop(n, k), ...(ds ? [`Liệt kê: ${ds.join("  ") || "(không có)"}`] : [])],
      },
      { tieu_de: "Áp dụng công thức và rút gọn", loi: "Lấy số kết quả thuận lợi chia cho tổng số kết quả.", phep_tinh: [`P = ${tm(c, tong)} = ${rutGon(c, tong)}`] },
    ],
    tu: c,
    mau: tong,
  };
}

function giaiDongXuDieuKien(ch: Extract<CauHinhVat, { loai: "dong_xu"; che_do: "dieu_kien" }>, khoa: string): Phan {
  const k = ch.so_lan_truoc;
  const mat = ch.mat === "N" ? "ngửa" : "sấp";
  return {
    de: `Đã ${k} lần liên tiếp ra ${mat}. Tính xác suất lần tung kế tiếp ra ${khoa === "N" ? "ngửa" : "sấp"}.`,
    cong_thuc: "P(B | A) = P(A và B) ÷ P(A)   (xác suất của B khi đã biết A xảy ra)",
    buoc: [
      { tieu_de: "Xét các dãy tung k + 1 lần", loi: `A là “${k} lần đầu đều ra ${mat}”, B là “lần thứ ${k + 1} ra ${khoa === "N" ? "ngửa" : "sấp"}”. Có ${lap(2, k + 1)} = ${mu(2, k + 1)} dãy.` },
      { tieu_de: "Đếm số dãy thỏa A", loi: `${k} lần đầu đã cố định (cùng ${mat}); lần cuối tùy ý.`, phep_tinh: ["1 × … × 1 × 2 = 2 dãy"] },
      { tieu_de: "Đếm số dãy thỏa cả A và B", loi: "Lần cuối phải đúng mặt cần tính.", phep_tinh: ["1 dãy"] },
      { tieu_de: "Chia và rút gọn", loi: "Số dãy thỏa cả hai chia số dãy thỏa A.", phep_tinh: ["P = 1/2"] },
    ],
    luu_y: "Kết quả bằng đúng 1/2: đồng xu không “nhớ” các lần trước, nên không có chuyện sau nhiều lần ngửa thì lần sau dễ ra sấp hơn.",
    tu: 1n,
    mau: 2n,
  };
}

function giaiDongXuDay(ch: Extract<CauHinhVat, { loai: "dong_xu"; che_do: "day" }>, khoa: string): Phan {
  const day = khoa === "b" ? ch.day_b : ch.day_a;
  const L = day.length;
  return {
    de: `Tung đồng xu ${L} lần liên tiếp, tính xác suất ra đúng dãy ${day}.`,
    cong_thuc: "P(cả dãy) = P(lần 1) × P(lần 2) × … (các lần tung độc lập nên nhân xác suất)",
    buoc: [
      { tieu_de: "Xác suất từng lần", loi: "Mỗi lần phải ra đúng một mặt định sẵn trong 2 mặt.", phep_tinh: [...day].map((m, i) => `Lần ${i + 1} ra ${m === "N" ? "ngửa" : "sấp"}: 1/2`) },
      { tieu_de: "Nhân các xác suất", loi: "Các lần tung không ảnh hưởng nhau nên nhân lại.", phep_tinh: [`P = ${Array<string>(L).fill("1/2").join(" × ")} = ${tm(1, mu(2, L))}`] },
    ],
    luu_y: "Mọi dãy cụ thể cùng độ dài đều có xác suất như nhau, kể cả dãy trông “đặc biệt” như NNNNNN.",
    tu: 1n,
    mau: mu(2, L),
  };
}

// ---------------------------------------------------------------- lấy a "thuận lợi" trong T, dùng cho bi và thẻ

interface DeDem {
  /** "bi" hoặc "thẻ". */
  vat: string;
  /** Tên nhóm cần đếm, ví dụ "bi đỏ" hay "thẻ bội của 3". */
  nhom: string;
  /** Mô tả cách đếm tổng, ví dụ "3 + 2 = 5 bi". */
  moTaTong: string;
  T: number;
  a: number;
  n: number;
  hoanLai: boolean;
  j: number;
}

function giaiDem(o: DeDem): Phan {
  const { T, a, n, j, hoanLai } = o;
  const b = T - a;
  const buoc: BuocGiai[] = [
    {
      tieu_de: `Đếm ${o.vat}`,
      loi: `Tổng cộng ${T} ${o.vat}, trong đó ${a} là ${o.nhom} (thuận lợi) và ${b} không phải.`,
      phep_tinh: [o.moTaTong, `Thuận lợi: ${a}   Không thuận lợi: ${T} − ${a} = ${b}`],
    },
  ];
  let tu: bigint;
  let mau: bigint;
  let congThuc: string;
  let luuY: string | undefined;

  if (hoanLai) {
    tu = toHop(n, j) * mu(a, j) * mu(b, n - j);
    mau = mu(T, n);
    congThuc = `P(đúng ${j} trong ${n} lần) = C(${n}, ${j}) × (${a}/${T})^${j} × (${b}/${T})^${n - j}`;
    buoc.push(
      {
        tieu_de: "Xác suất mỗi lần lấy",
        loi: `Lấy xong ${o.vat} được trả lại nên ${o.vat === "bi" ? "hộp" : "bộ thẻ"} luôn y như ban đầu: các lần lấy độc lập.`,
        phep_tinh: [`P(ra ${o.nhom}) = ${a}/${T} = ${rutGon(BigInt(a), BigInt(T))}`, `P(không ra) = ${b}/${T} = ${rutGon(BigInt(b), BigInt(T))}`],
      },
      {
        tieu_de: `Chọn xem lần nào ra ${o.nhom}`,
        loi: `Trong ${n} lần lấy, chọn ${j} lần để ra ${o.nhom} (✓), các lần còn lại không (✗).`,
        phep_tinh: [bieuThucToHop(n, j), ...(n <= 3 ? [`Các cách: ${hoanViTuy(n, j).join("  ")}   (✓ = ra ${o.nhom})`] : [])],
      },
      {
        tieu_de: "Nhân và rút gọn",
        loi: `Mỗi cách có xác suất (${a}/${T})^${j} × (${b}/${T})^${n - j}; nhân với số cách.`,
        phep_tinh: [
          `P = ${toHop(n, j)} × ${j === 0 ? "1" : lap(`${a}/${T}`, j)} × ${n - j === 0 ? "1" : lap(`${b}/${T}`, n - j)}`,
          `P = ${tm(tu, mau)} = ${rutGon(tu, mau)}`,
        ],
      },
    );
    if (j === n && n >= 2) luuY = `Cách khác: cả ${n} lần đều ra ${o.nhom} nên P = (${a}/${T})^${n} = ${rutGon(mu(a, n), mau)}.`;
  } else {
    tu = toHop(a, j) * toHop(b, n - j);
    mau = toHop(T, n);
    congThuc = `P(đúng ${j} ${o.nhom} trong ${n}) = C(${a}, ${j}) × C(${b}, ${n - j}) ÷ C(${T}, ${n})`;
    buoc.push(
      {
        tieu_de: `Số cách lấy ${n} ${o.vat}`,
        loi: `Lấy ${n} ${o.vat} cùng lúc từ ${T} ${o.vat}, không trả lại và không quan tâm thứ tự: dùng tổ hợp.`,
        phep_tinh: [bieuThucToHop(T, n)],
      },
      {
        tieu_de: `Số cách lấy đúng ${j} ${o.nhom}`,
        loi: `Chọn ${j} ${o.vat} trong ${a} ${o.nhom}, và ${n - j} ${o.vat} còn lại trong ${b} ${o.vat} không thuận lợi, rồi nhân hai số cách.`,
        phep_tinh: [bieuThucToHop(a, j), bieuThucToHop(b, n - j), `Số cách = ${toHop(a, j)} × ${toHop(b, n - j)} = ${tu}`],
      },
      { tieu_de: "Chia và rút gọn", loi: "Lấy số cách thuận lợi chia cho tổng số cách.", phep_tinh: [`P = ${tm(tu, mau)} = ${rutGon(tu, mau)}`] },
    );
    if (j === n && n >= 2) {
      const dan = Array.from({ length: n }, (_, i) => `${a - i}/${T - i}`);
      luuY = `Cách khác (nhân dần): lần sau chỉ còn ${T - 1} ${o.vat} nên P = ${dan.join(" × ")} = ${rutGon(tu, mau)}. Không được dùng ${a}/${T} cho mọi lần như khi có hoàn lại.`;
    }
  }
  return { de: `Lấy ${n} ${o.vat} ${hoanLai ? "có" : "không"} hoàn lại, tính xác suất được đúng ${j} ${o.nhom}.`, cong_thuc: congThuc, buoc, luu_y: luuY, tu, mau };
}

/** Các cách đánh dấu j trong n lần (✓ là lần ra), để minh họa với n nhỏ. */
function hoanViTuy(n: number, j: number): string[] {
  const kq: string[] = [];
  for (let m = 0; m < 2 ** n; m++) {
    const s = Array.from({ length: n }, (_, i) => ((m >> (n - 1 - i)) & 1 ? "✓" : "✗")).join("");
    if (s.split("✓").length - 1 === j) kq.push(s);
  }
  return kq;
}

// ---------------------------------------------------------------- hộp bi

/** Biến cố trên nhiều bi: ít nhất 1 bi màu X, hai bi cùng màu, hai bi khác màu; khóa "co" hoặc "khong". */
function giaiBiSuKien(ch: Extract<CauHinhVat, { loai: "bi"; che_do: "phan_phoi" }> & { su_kien: "it_nhat" | "cung_mau" | "khac_mau" }, khoa: string): Phan {
  const T = tongBi(ch.hop);
  const n = ch.so_lay;
  const hl = ch.hoan_lai;
  const mo = moTaSuKienBi(ch);
  const moTaTong = `${ch.hop.map((g) => g.so).join(" + ")} = ${T} bi (${ch.hop.map((g) => `${g.so} ${g.ten}`).join(", ")})`;
  const buoc: BuocGiai[] = [{ tieu_de: "Đếm bi", loi: `Hộp có ${T} bi, bi nào cũng có cơ hội được lấy như nhau.`, phep_tinh: [moTaTong] }];
  const cachLay = hl ? "có hoàn lại" : "không hoàn lại";
  let pCo: PhanSo;
  let congThuc: string;
  let luuY: string | undefined;

  if (ch.su_kien === "it_nhat") {
    const g = ch.hop.find((x) => x.ten === ch.mau_muc_tieu)!;
    const a = g.so;
    const b = T - a;
    const tuKhong = hl ? mu(b, n) : toHop(b, n);
    const mauKhong = hl ? mu(T, n) : toHop(T, n);
    const pKhong = new PhanSo(tuKhong, mauKhong);
    pCo = PhanSo.MOT.tru(pKhong);
    congThuc = `P(ít nhất 1 bi ${g.ten}) = 1 − P(không có bi ${g.ten} nào)`;
    buoc.push(
      {
        tieu_de: "Dùng phần bù",
        loi: `“Ít nhất 1 bi ${g.ten}” gồm nhiều trường hợp (đúng 1 bi, đúng 2 bi…). Đếm hết sẽ rối, nên làm ngược lại: chỉ có MỘT trường hợp không thuận lợi là “không có bi ${g.ten} nào”. Tính xác suất của nó rồi lấy 1 trừ đi.`,
        phep_tinh: [`Bi ${g.ten}: ${a}; bi khác màu ${g.ten}: ${T} − ${a} = ${b}`],
      },
      hl
        ? {
            tieu_de: `Tính P(không có bi ${g.ten} nào)`,
            loi: `Lấy ${cachLay}: mỗi lần phải ra bi khác màu ${g.ten} (xác suất ${b}/${T}), ${n} lần nên nhân lại.`,
            phep_tinh: [`P = ${lap(`${b}/${T}`, n)} = ${tm(tuKhong, mauKhong)} = ${rutGon(tuKhong, mauKhong)}`],
          }
        : {
            tieu_de: `Tính P(không có bi ${g.ten} nào)`,
            loi: `Lấy ${cachLay}: số cách lấy ${n} bi đều không phải bi ${g.ten}, chia cho số cách lấy ${n} bi bất kỳ.`,
            phep_tinh: [bieuThucToHop(b, n), bieuThucToHop(T, n), `P = ${tm(tuKhong, mauKhong)} = ${rutGon(tuKhong, mauKhong)}`],
          },
      { tieu_de: "Lấy 1 trừ đi", loi: "Xác suất cần tìm là phần còn lại.", phep_tinh: [`P = 1 − ${rutGon(tuKhong, mauKhong)} = ${pCo.toString()}`] },
    );
    const rieng = phanPhoiDem(T, a, n, hl);
    luuY = `Kiểm tra bằng cách cộng từng trường hợp: ${rieng.slice(1).map((p, i) => `P(đúng ${i + 1} bi ${g.ten}) = ${p.toString()}`).join(" + ")} = ${pCo.toString()}.`;
  } else {
    // cùng màu / khác màu, lấy 2 bi
    const hang = ch.hop.map((g) => {
      const tu = hl ? mu(g.so, 2) : toHop(g.so, 2);
      return { g, tu };
    });
    const mau = hl ? mu(T, 2) : toHop(T, 2);
    const tuCung = hang.reduce((s, h) => s + h.tu, 0n);
    const pCung = new PhanSo(tuCung, mau);
    pCo = ch.su_kien === "cung_mau" ? pCung : PhanSo.MOT.tru(pCung);
    congThuc = ch.su_kien === "cung_mau" ? "P(cùng màu) = P(cả hai màu 1) + P(cả hai màu 2) + …" : "P(khác màu) = 1 − P(cùng màu)";
    buoc.push(
      {
        tieu_de: "Chia thành các trường hợp cùng màu",
        loi: `Hai bi cùng màu nghĩa là cả hai cùng ${ch.hop.map((g) => g.ten).join(" HOẶC cả hai cùng ")}. Các trường hợp này không thể xảy ra cùng lúc nên cộng xác suất lại.`,
      },
      {
        tieu_de: "Tính từng trường hợp",
        loi: hl ? "Lấy có hoàn lại: mỗi lần lấy độc lập nên nhân." : "Lấy không hoàn lại: dùng tổ hợp, đếm số cách chọn 2 bi cùng màu rồi chia cho số cách chọn 2 bi bất kỳ.",
        phep_tinh: [
          ...(hl ? [] : [bieuThucToHop(T, 2)]),
          ...hang.map((h) => (hl ? `Cả hai bi ${h.g.ten}: (${h.g.so}/${T})² = ${tm(h.tu, mau)}` : `Cả hai bi ${h.g.ten}: C(${h.g.so}, 2)/C(${T}, 2) = ${tm(h.tu, mau)}`)),
        ],
      },
      { tieu_de: "Cộng lại", loi: "Cộng xác suất của các trường hợp cùng màu.", phep_tinh: [`P(cùng màu) = ${hang.map((h) => h.tu).join(" + ")} trên ${mau} = ${tm(tuCung, mau)} = ${pCung.toString()}`] },
    );
    if (ch.su_kien === "khac_mau") {
      buoc.push({ tieu_de: "Lấy 1 trừ đi", loi: "Khác màu là trường hợp ngược lại của cùng màu.", phep_tinh: [`P(khác màu) = 1 − ${pCung.toString()} = ${pCo.toString()}`] });
      luuY = "Cách khác: cộng xác suất từng cặp màu khác nhau (đỏ rồi xanh, xanh rồi đỏ, …). Cách dùng phần bù nhanh hơn nhiều.";
    }
  }

  const co = khoa === "co";
  const p = co ? pCo : PhanSo.MOT.tru(pCo);
  if (!co) {
    buoc.push({ tieu_de: "Biến cố ngược lại", loi: `Câu hỏi là xác suất KHÔNG xảy ra “${mo}”, nên lấy 1 trừ xác suất vừa tính.`, phep_tinh: [`P = 1 − ${pCo.toString()} = ${p.toString()}`] });
  }
  return {
    de: `Lấy ${n} bi ${cachLay}, tính xác suất ${co ? "" : "KHÔNG "}được ${mo}.`,
    cong_thuc: congThuc,
    buoc,
    luu_y: luuY,
    tu: p.tu,
    mau: p.mau,
  };
}

function giaiBi(ch: Extract<CauHinhVat, { loai: "bi" }>, khoa: string): Phan {
  const T = tongBi(ch.hop);
  const moTaTong = `${ch.hop.map((g) => g.so).join(" + ")} = ${T} bi (${ch.hop.map((g) => `${g.so} ${g.ten}`).join(", ")})`;
  const mauChon = (ten: string) => ch.hop.find((g) => g.ten === ten)!;

  if (ch.che_do === "dieu_kien" || ch.so_lay === 1) {
    const g = mauChon(khoa);
    const phan: Phan = {
      de: ch.che_do === "dieu_kien" ? `Đã ${ch.so_lan_truoc} lần liên tiếp lấy được bi ${ch.mau_lap} (có hoàn lại). Tính xác suất lần kế tiếp lấy được bi ${g.ten}.` : `Lấy 1 bi, tính xác suất được bi ${g.ten}.`,
      cong_thuc: CONG_THUC_DONG_KHA_NANG,
      buoc: [
        { tieu_de: "Đếm tất cả bi", loi: "Mỗi viên bi có khả năng được lấy như nhau.", phep_tinh: [moTaTong] },
        { tieu_de: "Đếm bi thuận lợi", loi: `Thuận lợi là các bi ${g.ten}.`, phep_tinh: [`Số bi ${g.ten} = ${g.so}`] },
        { tieu_de: "Áp dụng công thức", loi: "Lấy số bi thuận lợi chia cho tổng số bi.", phep_tinh: [`P = ${tm(g.so, T)} = ${rutGon(BigInt(g.so), BigInt(T))}`] },
      ],
      tu: BigInt(g.so),
      mau: BigInt(T),
    };
    if (ch.che_do === "dieu_kien") {
      const lapG = mauChon(ch.mau_lap);
      phan.buoc.splice(1, 0, {
        tieu_de: "Vì sao các lần trước không ảnh hưởng",
        loi: "Lấy xong bi được thả lại, nên trước mỗi lần lấy hộp luôn đầy đủ như lúc đầu. Các lần lấy độc lập.",
        phep_tinh: [`(Xác suất ${ch.so_lan_truoc} lần đầu đều ra bi ${ch.mau_lap}: (${lapG.so}/${T})^${ch.so_lan_truoc} = ${rutGon(mu(lapG.so, ch.so_lan_truoc), mu(T, ch.so_lan_truoc))}; chỉ những lượt như vậy mới được ghi nhận)`],
      });
      phan.luu_y = "Dễ sai: nghĩ rằng sau nhiều lần ra cùng một màu thì lần sau phải ra màu khác. Hộp không “nhớ” các lần trước.";
    }
    return phan;
  }

  if (laSuKienBi(ch)) return giaiBiSuKien(ch, khoa);
  const mau = mauChon(ch.mau_muc_tieu);
  return giaiDem({ vat: "bi", nhom: `bi ${mau.ten}`, moTaTong, T, a: mau.so, n: ch.so_lay, hoanLai: ch.hoan_lai, j: Number(khoa) });
}

// ---------------------------------------------------------------- thẻ số

/** Liệt kê các số trên thẻ; bộ thẻ lớn thì rút gọn để lời giải vẫn đọc được. */
const dsSo = (ds: number[], toiDa = 40) =>
  ds.length <= toiDa ? ds.join(", ") : `${ds.slice(0, toiDa).join(", ")}, … (tổng cộng ${ds.length} số)`;

function giaiThe(ch: Extract<CauHinhVat, { loai: "the" }>, khoa: string): Phan {
  const N = ch.so_the;
  const bo = `${N} thẻ ghi các số từ 1 đến ${N}`;
  if (ch.che_do === "tung_so") {
    return {
      de: `Rút 1 thẻ trong ${N} thẻ, tính xác suất rút được thẻ số ${khoa}.`,
      cong_thuc: CONG_THUC_DONG_KHA_NANG,
      buoc: [
        { tieu_de: "Đếm tất cả thẻ", loi: "Mỗi thẻ có khả năng được rút như nhau.", phep_tinh: [bo] },
        { tieu_de: "Đếm thẻ thuận lợi", loi: `Chỉ có thẻ số ${khoa} là thuận lợi.`, phep_tinh: ["Số thẻ thuận lợi = 1"] },
        { tieu_de: "Áp dụng công thức", loi: "Lấy số thẻ thuận lợi chia cho tổng số thẻ.", phep_tinh: [`P = 1/${N}`] },
      ],
      tu: 1n,
      mau: BigInt(N),
    };
  }
  const ten = moTaBienCo(ch.bien_co);
  const thuan = cacSoThuanLoi(N, ch.bien_co);
  const a = thuan.length;
  if (ch.che_do === "bien_co") {
    const co = khoa === "co";
    const laThuan = new Set(thuan);
    const dsKhong = Array.from({ length: N }, (_, i) => i + 1).filter((x) => !laThuan.has(x));
    const tu = BigInt(co ? a : N - a);
    return {
      de: `Rút 1 thẻ, tính xác suất ${co ? "" : "KHÔNG "}được thẻ ${ten}.`,
      cong_thuc: CONG_THUC_DONG_KHA_NANG,
      buoc: [
        { tieu_de: "Đếm tất cả thẻ", loi: "Mỗi thẻ có khả năng được rút như nhau.", phep_tinh: [`${bo} → ${N} kết quả`] },
        {
          tieu_de: `Liệt kê thẻ ${co ? "thuận lợi" : "không thuận lợi"}`,
          loi: `Chọn ra các số ${co ? "thuận lợi" : "không thuận lợi"} “${ten}”.`,
          phep_tinh: [`${dsSo(co ? thuan : dsKhong) || "(không có số nào)"}`, `Số thẻ thuận lợi = ${tu}`],
        },
        { tieu_de: "Áp dụng công thức", loi: "Lấy số thẻ thuận lợi chia cho tổng số thẻ.", phep_tinh: [`P = ${tm(tu, N)} = ${rutGon(tu, BigInt(N))}`] },
      ],
      tu,
      mau: BigInt(N),
    };
  }
  const phan = giaiDem({ vat: "thẻ", nhom: `thẻ “${ten}”`, moTaTong: `${bo}; số thẻ thuận lợi “${ten}”: ${dsSo(thuan) || "không có"} → ${a} thẻ`, T: N, a, n: 2, hoanLai: ch.hoan_lai, j: Number(khoa) });
  return phan;
}

// ---------------------------------------------------------------- giải thích dễ hiểu

/** Vài câu nói bằng lời thường về ý tưởng của cách tính, đi kèm lời giải chi tiết. */
function deHieu(ch: CauHinhVat, khoa: string): string[] {
  const cuoi = (a: number, T: number, vat: string, nhom: string) =>
    `Cách nghĩ đơn giản: trong ${T} ${vat} có ${a} ${vat} ${nhom}. Nhắm mắt chọn thì ${vat} nào cũng có cơ hội như nhau, nên cơ hội chọn trúng ${nhom} là ${a} phần ${T}.`;
  switch (ch.loai) {
    case "xuc_xac": {
      if (ch.che_do === "phan_phoi" && ch.so_xuc_xac === 1) {
        return [
          `Xúc xắc có 6 mặt giống hệt nhau, tung lên mặt nào cũng có cơ hội như nhau.`,
          `Muốn ra mặt ${khoa} thì chỉ có 1 mặt “trúng” trong 6 mặt, nên xác suất là 1 phần 6.`,
          `Không có mặt nào “khó ra” hơn hay “đến lượt” ra.`,
        ];
      }
      if (ch.che_do === "phan_phoi") {
        const n = ch.so_xuc_xac;
        const pp = phanPhoiLyThuyet(n);
        const cuaS = pp.find((x) => x.gia_tri === Number(khoa))!;
        const nhieuNhat = Math.max(...pp.map((x) => x.so_cach));
        const gom = cuaS.so_cach === nhieuNhat ? "Đây là tổng có nhiều cách nhất nên dễ ra nhất." : cuaS.so_cach === 1 ? "Tổng này chỉ có đúng 1 cách (các con cùng ra mặt nhỏ nhất hoặc lớn nhất) nên rất khó ra." : "";
        return [
          `Hãy tô màu cho từng con xúc xắc để phân biệt (con 1, con 2…). Mỗi bộ ${n} mặt là một kết quả riêng, và có ${mu(6, n)} bộ, bộ nào cũng có cơ hội như nhau.`,
          `“Tổng ${khoa}” chỉ là tên gọi chung cho các bộ cộng lại bằng ${khoa}. Việc cần làm là đếm xem có bao nhiêu bộ như vậy (${cuaS.so_cach} bộ), rồi so với tất cả các bộ.`,
          `Tổng nằm ở giữa có nhiều cách tạo ra hơn tổng ở hai đầu, nên dễ ra hơn.${gom ? " " + gom : ""}`,
        ];
      }
      if (ch.che_do === "dieu_kien") {
        return [
          `Xúc xắc không có trí nhớ: nó không biết ${ch.so_lan_truoc} lần trước ra gì.`,
          `Mỗi lần gieo là một lần mới, vẫn là 1 mặt trúng trong 6 mặt. Vì vậy sau ${ch.so_lan_truoc} lần không ra mặt ${ch.mat}, lần tiếp theo vẫn y như lần đầu.`,
          `Cảm giác “đến lượt phải ra” là sai: các lần gieo không bù trừ cho nhau.`,
        ];
      }
      return [
        `Mỗi lần gieo, mặt cần ra có 1 cơ hội trong 6. Muốn trúng cả dãy thì phải trúng liên tiếp ${ch.day_a.length} lần, nên nhân các cơ hội lại.`,
        `Dãy nhìn “đặc biệt” như 6-6-6 vẫn chỉ là 1 dãy trong ${mu(6, ch.day_a.length)} dãy, cũng như dãy trông bình thường 2-5-3. Hai dãy đó có cơ hội bằng nhau.`,
      ];
    }
    case "dong_xu": {
      if (ch.che_do === "phan_phoi" && ch.so_dong_xu === 1) {
        return [`Đồng xu cân đối có 2 mặt, mỗi mặt có cơ hội như nhau.`, `Muốn ra mặt ${khoa === "N" ? "ngửa" : "sấp"} thì có 1 mặt trúng trong 2 mặt: 1 phần 2.`];
      }
      if (ch.che_do === "phan_phoi") {
        const n = ch.so_dong_xu;
        return [
          `Hãy tưởng tượng ${n} đồng xu có màu khác nhau để phân biệt. Mỗi đồng ngửa hoặc sấp, ghép lại thành ${mu(2, n)} dãy N/S, dãy nào cũng có cơ hội như nhau.`,
          `“Có đúng ${khoa} mặt ngửa” chỉ là tên gọi chung cho các dãy có đúng ${khoa} chữ N. Cần đếm xem có bao nhiêu dãy như vậy rồi so với tất cả các dãy.`,
          `Số ngửa nằm gần giữa có nhiều dãy hơn, nên dễ ra hơn các kết quả ở hai đầu (toàn ngửa hoặc toàn sấp).`,
        ];
      }
      if (ch.che_do === "dieu_kien") {
        return [
          `Đồng xu không có trí nhớ: dù ${ch.so_lan_truoc} lần trước ra thế nào, lần này vẫn chỉ có 2 mặt với cơ hội bằng nhau.`,
          `Không có chuyện “ngửa nhiều rồi thì lần sau phải sấp”. Các lần tung không bù trừ cho nhau.`,
        ];
      }
      return [
        `Mỗi lần tung, mặt cần ra có 1 cơ hội trong 2. Muốn trúng cả dãy thì phải trúng liên tiếp ${ch.day_a.length} lần, nên nhân các cơ hội lại.`,
        `Dãy nhìn “đặc biệt” như NNNNNN vẫn chỉ là 1 dãy trong ${mu(2, ch.day_a.length)} dãy; mọi dãy cùng độ dài đều có cơ hội bằng nhau.`,
      ];
    }
    case "bi": {
      const T = tongBi(ch.hop);
      if (ch.che_do === "dieu_kien") {
        const g = ch.hop.find((x) => x.ten === khoa)!;
        return [
          `Mỗi lần lấy xong, bi được thả lại và lắc đều, nên hộp luôn y như ban đầu. Hộp không nhớ các lần trước.`,
          `Vì vậy lần lấy này chỉ phụ thuộc vào số bi trong hộp: ${g.so} bi ${g.ten} trong ${T} bi, tức ${g.so} phần ${T}.`,
        ];
      }
      if (ch.so_lay === 1) {
        const g = ch.hop.find((x) => x.ten === khoa)!;
        return [
          cuoi(g.so, T, "bi", `màu ${g.ten}`),
          `Đừng chia theo số màu: hộp có ${ch.hop.length} màu không có nghĩa mỗi màu có cơ hội như nhau. Màu nào nhiều bi hơn thì dễ lấy hơn.`,
        ];
      }
      if (laSuKienBi(ch)) {
        const cach = ch.hoan_lai ? "Lấy xong bi được thả lại nên các lần lấy giống hệt nhau." : "Bi đã lấy ra thì không thả lại, nên lần sau hộp ít bi hơn.";
        if (ch.su_kien === "it_nhat") {
          return [
            `“Ít nhất 1 bi ${ch.mau_muc_tieu}” nghĩa là có 1 bi, hoặc cả ${ch.so_lay} bi đều là bi ${ch.mau_muc_tieu}. Đếm từng trường hợp rất dễ sót.`,
            `Mẹo: làm ngược lại. Chỉ có một trường hợp KHÔNG thuận lợi là “không có bi ${ch.mau_muc_tieu} nào”. Tính xác suất của trường hợp đó rồi lấy 1 trừ đi.`,
            cach,
          ];
        }
        if (ch.su_kien === "cung_mau") {
          return [
            `“Cùng màu” có nhiều cách xảy ra: cả hai cùng ${ch.hop.map((g) => g.ten).join(", hoặc cả hai cùng ")}. Hãy tính từng trường hợp rồi cộng lại, vì các trường hợp này không xảy ra cùng lúc.`,
            cach,
          ];
        }
        return [
          `“Khác màu” là trường hợp ngược lại của “cùng màu”. Vì vậy chỉ cần tính xác suất cùng màu rồi lấy 1 trừ đi.`,
          cach,
        ];
      }
      const a = ch.hop.find((x) => x.ten === ch.mau_muc_tieu)!.so;
      return ch.hoan_lai
        ? [
            `Mỗi lần lấy xong bi được thả lại, nên các lần lấy giống hệt nhau: lần nào cũng có ${a} bi ${ch.mau_muc_tieu} trong ${T} bi.`,
            `Việc còn lại là đếm xem trong ${ch.so_lay} lần có bao nhiêu cách để được đúng ${khoa} lần ra bi ${ch.mau_muc_tieu}, rồi nhân xác suất từng lần.`,
          ]
        : [
            `Bi đã lấy ra thì không thả lại, nên hộp ít dần: lần đầu có ${T} bi, lần sau chỉ còn ${T - 1} bi. Xác suất lần sau vì thế khác lần đầu.`,
            `Cách dễ nhất là coi như bốc cùng lúc ${ch.so_lay} viên: đếm số cách bốc được đúng ${khoa} bi ${ch.mau_muc_tieu}, rồi so với số cách bốc ${ch.so_lay} viên bất kỳ.`,
          ];
    }
    case "bai_toan":
      return [
        "Cách chắc chắn nhất: viết ra HẾT các kết quả có thể, đánh dấu những kết quả thuận lợi cho yêu cầu của đề, rồi lấy số kết quả thuận lợi chia cho tổng số kết quả.",
        ch.so_lan >= 2 ? "Nhớ xét thứ tự: lấy lần lượt thì (1, 3) và (3, 1) là hai kết quả khác nhau." : "Mỗi vật có cơ hội được lấy như nhau.",
        ch.hoan_lai ? "Lấy xong được trả lại nên các lần lấy giống hệt nhau." : "Vật đã lấy ra không trả lại nên lần sau còn ít vật hơn.",
      ];
    case "the": {
      const N = ch.so_the;
      if (ch.che_do === "tung_so") {
        return [`${N} thẻ giống hệt nhau, úp xuống và xáo trộn nên rút thẻ nào cũng có cơ hội như nhau.`, `Muốn rút đúng thẻ số ${khoa} thì có 1 thẻ trúng trong ${N} thẻ: 1 phần ${N}.`];
      }
      const a = cacSoThuanLoi(N, ch.bien_co).length;
      if (ch.che_do === "bien_co") {
        return [
          `Bước quan trọng nhất là đếm xem có bao nhiêu thẻ “đạt yêu cầu” (${moTaBienCo(ch.bien_co)}). Hãy viết ra từng số, đừng đoán.`,
          cuoi(khoa === "co" ? a : N - a, N, "thẻ", khoa === "co" ? "thuận lợi" : "không thuận lợi"),
        ];
      }
      return ch.hoan_lai
        ? [
            `Rút xong thẻ được trả lại và xáo trộn, nên mỗi lần rút giống hệt nhau: có ${a} thẻ đạt yêu cầu trong ${N} thẻ.`,
            `Việc còn lại là đếm xem trong 2 lần rút có mấy cách để được đúng ${khoa} thẻ đạt yêu cầu, rồi nhân xác suất từng lần.`,
          ]
        : [
            `Thẻ đã rút thì không trả lại, nên lần rút sau chỉ còn ${N - 1} thẻ. Xác suất lần sau vì thế khác lần đầu.`,
            `Cách dễ nhất là coi như rút cùng lúc 2 thẻ: đếm số cách được đúng ${khoa} thẻ đạt yêu cầu, rồi so với số cách rút 2 thẻ bất kỳ.`,
          ];
    }
  }
}

// ---------------------------------------------------------------- bài toán tổng quát

/** Liệt kê không gian mẫu rồi đếm kết quả thỏa biến cố: cách làm chung cho mọi đề lấy vật. */
function giaiBaiToan(ch: Extract<CauHinhVat, { loai: "bai_toan" }>, khoa: string): Phan {
  const tv = ch.ten_vat ?? "vật";
  const N = ch.vat.length;
  const k = ch.so_lan;
  const gs = khongGianMau(ch, 60);
  const co = khoa === "co";
  const mo = moTaBienCoBaiToan(ch);
  const can = co ? gs.thoa : gs.tong - gs.thoa;
  const cachLay = ch.hoan_lai ? "có hoàn lại" : "không hoàn lại";
  const thuaSo = Array.from({ length: k }, (_, i) => (ch.hoan_lai ? N : N - i));
  const bc = ch.bien_co;
  const tenDL = bc.kieu === "so" ? TEN_DAI_LUONG[bc.dai_luong] : "";

  const buoc: BuocGiai[] = [
    {
      tieu_de: "Hiểu phép thử",
      loi: `Có ${N} ${tv}: ${ch.vat.map(nhanVat).join(", ")}. Lấy lần lượt ${k} ${tv}, ${cachLay}. Mỗi kết quả là một bộ ${k} ${tv} có xét thứ tự.`,
    },
    {
      tieu_de: "Đếm tất cả kết quả có thể",
      loi: ch.hoan_lai ? `Mỗi lần lấy đều có ${N} cách chọn nên nhân lại.` : `Lần đầu có ${N} cách, lần sau còn ít hơn 1 ${tv} (vì không hoàn lại) nên nhân lại.`,
      phep_tinh: [`${thuaSo.join(" × ")} = ${gs.tong} kết quả`],
    },
  ];

  if (gs.ds) {
    const chon = gs.ds.filter((x) => x.thoa === co);
    buoc.push({
      tieu_de: `Liệt kê các kết quả ${co ? "thuận lợi" : "không thuận lợi"} “${mo}”`,
      loi: bc.kieu === "so" ? `Với mỗi kết quả, tính ${tenDL} rồi kiểm tra điều kiện của đề.` : "Với mỗi kết quả, kiểm tra điều kiện của đề.",
      phep_tinh: [
        chon.map((x) => (x.gia_tri !== undefined ? `${x.nhan} → ${x.gia_tri}` : x.nhan)).join("   ") || "(không có kết quả nào)",
        `Số kết quả ${co ? "thuận lợi" : "không thuận lợi"} = ${can}`,
      ],
    });
  } else if (gs.theo_gia_tri) {
    const nhom = gs.theo_gia_tri.filter((g) => g.thoa === co);
    buoc.push({
      tieu_de: `Đếm các kết quả ${co ? "thuận lợi" : "không thuận lợi"} “${mo}”`,
      loi: `Có quá nhiều kết quả để liệt kê hết, nên gom theo giá trị của ${tenDL} rồi cộng số cách.`,
      phep_tinh: [
        ...nhom.slice(0, 24).map((g) => `${tenDL} = ${g.gia_tri}: ${g.so_cach} cách`),
        ...(nhom.length > 24 ? [`… và ${nhom.length - 24} giá trị khác`] : []),
        `Tổng số kết quả ${co ? "thuận lợi" : "không thuận lợi"} = ${can}`,
      ],
    });
  } else {
    buoc.push({
      tieu_de: `Đếm các kết quả ${co ? "thuận lợi" : "không thuận lợi"} “${mo}”`,
      loi: "Xét từng kiểu kết quả theo điều kiện của đề rồi cộng số cách (máy đã đếm từng cách lấy).",
      phep_tinh: [`Số kết quả ${co ? "thuận lợi" : "không thuận lợi"} = ${can}`],
    });
  }
  buoc.push({ tieu_de: "Áp dụng công thức và rút gọn", loi: "Lấy số kết quả thuận lợi chia cho tổng số kết quả.", phep_tinh: [`P = ${tm(can, gs.tong)} = ${rutGon(BigInt(can), BigInt(gs.tong))}`] });

  return {
    de: `Lấy lần lượt ${k} ${tv} ${cachLay} từ ${N} ${tv}, tính xác suất ${co ? "" : "KHÔNG "}xảy ra: ${mo}.`,
    cong_thuc: CONG_THUC_DONG_KHA_NANG,
    buoc,
    luu_y:
      k >= 2 && !ch.hoan_lai
        ? `Lấy lần lượt thì (a, b) và (b, a) là hai kết quả khác nhau, nên tổng số kết quả là ${thuaSo.join(" × ")} = ${gs.tong}. Nếu đề nói “lấy cùng lúc”, có thể bỏ thứ tự ở cả tử và mẫu, kết quả không đổi; điều quan trọng là tử và mẫu cùng một cách đếm.`
        : undefined,
    tu: BigInt(can),
    mau: BigInt(gs.tong),
  };
}

// ---------------------------------------------------------------- điểm vào

/** Lời giải cho một kết quả `khoa` của thí nghiệm (khóa lấy từ cacKhoaVat); khóa không có thì dùng kết quả đầu. */
export function loiGiai(ch: CauHinhVat, khoa?: string): LoiGiai {
  const cacKhoa = cacKhoaVat(ch);
  const k = cacKhoa.find((x) => x.khoa === khoa) ?? cacKhoa[0]!;
  let p: Phan;
  switch (ch.loai) {
    case "xuc_xac":
      p = ch.che_do === "phan_phoi" ? giaiXucXacPhanPhoi(ch, k.khoa) : ch.che_do === "dieu_kien" ? giaiXucXacDieuKien(ch, k.khoa) : giaiXucXacDay(ch, k.khoa);
      break;
    case "dong_xu":
      p = ch.che_do === "phan_phoi" ? giaiDongXuPhanPhoi(ch, k.khoa) : ch.che_do === "dieu_kien" ? giaiDongXuDieuKien(ch, k.khoa) : giaiDongXuDay(ch, k.khoa);
      break;
    case "bi":
      p = giaiBi(ch, k.khoa);
      break;
    case "the":
      p = giaiThe(ch, k.khoa);
      break;
    case "bai_toan":
      p = giaiBaiToan(ch, k.khoa);
      break;
  }
  const xs = new PhanSo(p.tu, p.mau);
  const { tu: _tu, mau: _mau, ...con } = p;
  return { ...con, de_hieu: deHieu(ch, k.khoa), xac_suat: xs.toString(), ket_qua: `Vậy xác suất là ${xs.toString()} ≈ ${pt(xs.soThuc())}.` };
}
