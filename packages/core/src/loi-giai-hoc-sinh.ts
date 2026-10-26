// Lời giải từng bước cho học sinh lớp 9 của bài toán tổng quát ("lấy vật rồi xét biến cố").
// Mọi con số do mã đếm; câu chữ đơn giản, giải thích cả khái niệm (số chính phương, số nguyên tố …) khi đề dùng đến.
import type { BienCoBaiToan, CauHinhBaiToan, DieuKienBaiToan } from "./types";
import { khongGianMau, moTaBienCoBaiToan, nhanVat, soCachLay, TEN_DAI_LUONG } from "./mo-phong/thi-nghiem/bai-toan";

export interface BuocHocSinh {
  tieu_de: string;
  dong: string[];
}

export interface LoiGiaiHocSinh {
  buoc: BuocHocSinh[];
  /** Những điều dễ nhầm liên quan đến đề này. */
  luu_y: string[];
  ket_luan: string;
  /** Xác suất đã rút gọn, dạng "1/15". */
  xac_suat: string;
}

const ucln = (a: number, b: number): number => (b === 0 ? a : ucln(b, a % b));
const phanTram = (x: number) => `${(x * 100).toFixed(2).replace(".", ",")}%`;

/** Nói ngắn gọn một điều kiện trên số nghĩa là gì, để học sinh nhớ lại khái niệm. */
export function giaiThichDieuKien(dk: DieuKienBaiToan): string | null {
  switch (dk.loai) {
    case "chan":
      return "Số chẵn là số chia hết cho 2 (tận cùng bằng 0, 2, 4, 6 hoặc 8).";
    case "le":
      return "Số lẻ là số không chia hết cho 2 (tận cùng bằng 1, 3, 5, 7 hoặc 9).";
    case "nguyen_to":
      return "Số nguyên tố là số lớn hơn 1 và chỉ có đúng hai ước là 1 và chính nó (ví dụ 2, 3, 5, 7, 11).";
    case "chinh_phuong":
      return "Số chính phương là số bằng bình phương của một số tự nhiên (ví dụ 25 = 5², 49 = 7²).";
    case "doi_xung":
      return "Số đối xứng là số đọc từ trái sang phải hay từ phải sang trái đều như nhau (ví dụ 121, 44).";
    case "chu_so_khac_nhau":
      return "“Các chữ số khác nhau” nghĩa là không có hai chữ số nào giống nhau (12 thỏa, 11 không thỏa).";
    case "co_chu_so":
      return `“Có chữ số ${dk.d}” nghĩa là khi viết số ra thì xuất hiện chữ số ${dk.d}.`;
    case "chia_het":
      return `Chia hết cho ${dk.k} nghĩa là chia cho ${dk.k} được dư 0.`;
    case "du":
      return `“Chia ${dk.m} dư ${dk.r}” nghĩa là số đó viết được dạng ${dk.m} × (một số tự nhiên) + ${dk.r}.`;
    default:
      return null;
  }
}

/** Các biến cố lá của một biến cố ghép nhiều tầng. */
function laCuaBienCo(bc: BienCoBaiToan): Exclude<BienCoBaiToan, { kieu: "gop" }>[] {
  return bc.kieu === "gop" ? bc.cac.flatMap(laCuaBienCo) : [bc];
}

function tomTatDay(so: number[], toiDa = 10): string {
  return so.length <= toiDa ? so.join(", ") : `${so.slice(0, toiDa - 3).join(", ")}, …, ${so.slice(-2).join(", ")}`;
}

/** Nếu các số lập thành dãy đều (cách nhau cùng một khoảng) thì trả về khoảng cách. */
function khoangCach(so: number[]): number | null {
  if (so.length < 3) return null;
  const d = so[1]! - so[0]!;
  return d > 0 && so.every((x, i) => i === 0 || x - so[i - 1]! === d) ? d : null;
}

export function loiGiaiHocSinh(ch: CauHinhBaiToan): LoiGiaiHocSinh {
  const tv = ch.ten_vat ?? "vật";
  const N = ch.vat.length;
  const k = ch.so_lan;
  const gs = khongGianMau(ch, 400);
  const mo = moTaBienCoBaiToan(ch);
  const g = ucln(gs.thoa, gs.tong) || 1;
  const rut = gs.thoa === 0 ? "0" : gs.thoa === gs.tong ? "1" : `${gs.thoa / g}/${gs.tong / g}`;
  const xs = gs.tong ? gs.thoa / gs.tong : 0;
  const cacSo = ch.vat.every((v) => v.so !== undefined) ? ch.vat.map((v) => v.so!) : null;
  const buoc: BuocHocSinh[] = [];
  const luu_y: string[] = [];

  // 1. Hiểu đề
  buoc.push({
    tieu_de: "Bước 1. Hiểu đề",
    dong: [
      k === 1
        ? `Ta chọn ngẫu nhiên 1 ${tv} trong ${N} ${tv}. Mỗi ${tv} có cơ hội được chọn như nhau.`
        : `Ta lấy lần lượt ${k} ${tv} từ ${N} ${tv}, ${ch.hoan_lai ? "lấy xong thì bỏ lại" : "lấy ra rồi không bỏ lại"}. Mỗi lần lấy, các ${tv} còn lại có cơ hội như nhau.`,
      `Gọi A là biến cố: “${mo}”. Ta cần tính P(A).`,
      "Vì các kết quả có cơ hội như nhau, ta dùng công thức: P(A) = (số kết quả thuận lợi cho A) : (số kết quả có thể xảy ra).",
    ],
  });

  // 2. Đếm tất cả kết quả có thể
  const dem: string[] = [];
  if (k === 1) {
    if (cacSo) {
      dem.push(`Các ${tv} có thể chọn là: ${tomTatDay(cacSo)}.`);
      const d = khoangCach(cacSo);
      if (d !== null) {
        const dau = cacSo[0]!;
        const cuoi = cacSo[cacSo.length - 1]!;
        dem.push(`Đây là dãy số cách đều ${d}, nên số phần tử = (số cuối − số đầu) : ${d} + 1 = (${cuoi} − ${dau}) : ${d} + 1 = ${N}.`);
      }
    } else {
      dem.push(`Các ${tv} có thể chọn: ${ch.vat.slice(0, 10).map(nhanVat).join(", ")}${N > 10 ? ", …" : ""}.`);
    }
    dem.push(`Mỗi ${tv} là một kết quả, nên có ${N} kết quả có thể.`);
  } else {
    const thua = Array.from({ length: k }, (_, i) => (ch.hoan_lai ? N : N - i));
    dem.push(
      ch.hoan_lai
        ? `Mỗi lần lấy đều có ${N} cách chọn (vì lấy xong được bỏ lại).`
        : `Lần 1 có ${N} cách chọn. Vì không bỏ lại nên lần 2 chỉ còn ${N - 1} ${tv}${k >= 3 ? `, lần 3 còn ${N - 2}` : ""}${k >= 4 ? `, lần 4 còn ${N - 3}` : ""}.`,
    );
    dem.push(`Theo quy tắc nhân: số kết quả có thể = ${thua.join(" × ")} = ${soCachLay(N, k, ch.hoan_lai)}.`);
    dem.push("Kết quả được xét có thứ tự: lấy được (a, b) khác với lấy được (b, a).");
  }
  buoc.push({ tieu_de: "Bước 2. Đếm tất cả các kết quả có thể", dong: dem });

  // 3. Các kết quả thuận lợi
  const thuan: string[] = [];
  const leCoDK = laCuaBienCo(ch.bien_co).flatMap((b) => (b.kieu === "so" ? [b.dieu_kien] : []));
  const daNoi = new Set<string>();
  for (const dk of leCoDK) {
    const t = giaiThichDieuKien(dk);
    if (t && !daNoi.has(t)) {
      daNoi.add(t);
      thuan.push(t);
    }
  }
  const dsThuan = gs.ds?.filter((x) => x.thoa);
  const bcSo = ch.bien_co.kieu === "so" ? ch.bien_co : null;
  const trungNhan = new Set(ch.vat.map(nhanVat)).size < N;
  if (dsThuan && trungNhan) {
    // Các vật giống nhau (cùng màu): gom theo "kiểu kết quả" rồi đếm bằng quy tắc nhân thay vì liệt kê từng cái.
    const soVatTheoNhan = new Map<string, number>();
    for (const v of ch.vat) soVatTheoNhan.set(nhanVat(v), (soVatTheoNhan.get(nhanVat(v)) ?? 0) + 1);
    const nhom = new Map<string, number>();
    for (const x of dsThuan) nhom.set(x.nhan, (nhom.get(x.nhan) ?? 0) + 1);
    thuan.push("Các vật cùng màu là giống nhau về màu, nên ta gom các kết quả theo màu rồi đếm bằng quy tắc nhân:");
    for (const [nhan, soCach] of [...nhom.entries()].slice(0, 12)) {
      const nhanLan = nhan.replace(/^\((.*)\)$/, "$1").split(", ");
      const daDung = new Map<string, number>();
      const thua = nhanLan.map((n) => {
        const da = ch.hoan_lai ? 0 : (daDung.get(n) ?? 0);
        daDung.set(n, (daDung.get(n) ?? 0) + 1);
        return (soVatTheoNhan.get(n) ?? 0) - da;
      });
      thuan.push(thua.reduce((a, b) => a * b, 1) === soCach ? `• ${nhan}: ${thua.join(" × ")} = ${soCach} cách` : `• ${nhan}: ${soCach} cách`);
    }
    if (nhom.size > 12) thuan.push(`• … và ${nhom.size - 12} kiểu khác`);
  } else if (dsThuan) {
    const nhan =(n: string) => (k === 1 ? n.replace(/^\((.*)\)$/, "$1") : n);
    const hienHet = dsThuan.length <= 30 ? dsThuan : dsThuan.slice(0, 30);
    thuan.push(
      dsThuan.length === 0
        ? "Ta kiểm tra từng kết quả: không có kết quả nào thỏa."
        : `Kiểm tra từng kết quả, các kết quả thuận lợi là: ${hienHet.map((x) => (k >= 2 && bcSo && x.gia_tri !== undefined ? `${nhan(x.nhan)} (${TEN_DAI_LUONG[bcSo.dai_luong]} = ${x.gia_tri})` : nhan(x.nhan))).join("; ")}${dsThuan.length > hienHet.length ? "; …" : ""}.`,
    );
    const chinhPhuong = leCoDK.some((d) => d.loai === "chinh_phuong") && k === 1 && !ch.phu_dinh && dsThuan.length <= 12;
    if (chinhPhuong) {
      thuan.push(`Kiểm tra: ${dsThuan.map((x) => { const v = Number(nhan(x.nhan)); return `${v} = ${Math.round(Math.sqrt(v))}²`; }).join(", ")}.`);
    }
  } else if (gs.theo_gia_tri) {
    const nhom = gs.theo_gia_tri.filter((x) => x.thoa);
    thuan.push("Có nhiều kết quả nên ta gom theo giá trị rồi cộng số cách:");
    for (const x of nhom.slice(0, 12)) thuan.push(`• giá trị ${x.gia_tri}: ${x.so_cach} cách`);
    if (nhom.length > 12) thuan.push(`• … và ${nhom.length - 12} giá trị khác`);
  }
  thuan.push(`Vậy có ${gs.thoa} kết quả thuận lợi cho A.`);
  buoc.push({ tieu_de: "Bước 3. Tìm các kết quả thuận lợi cho biến cố A", dong: thuan });

  // 4. Tính xác suất
  const tinh = [`P(A) = ${gs.thoa} : ${gs.tong} = ${gs.thoa}/${gs.tong}`];
  if (g > 1 && gs.thoa > 0) tinh.push(`Rút gọn: chia cả tử và mẫu cho ${g} được ${gs.thoa / g}/${gs.tong / g}.`);
  tinh.push(`Đổi ra phần trăm: ${rut} ≈ ${phanTram(xs)}.`);
  buoc.push({ tieu_de: "Bước 4. Tính xác suất", dong: tinh });

  // Lưu ý theo từng loại đề
  if (k >= 2 && !ch.hoan_lai) luu_y.push("“Lấy lần lượt, không trả lại” và “lấy cùng lúc” cho cùng một xác suất; chỉ cần đếm tử và mẫu theo cùng một cách (cùng có thứ tự hoặc cùng không thứ tự).");
  if (k >= 2 && ch.hoan_lai) luu_y.push("Lấy xong được bỏ lại nên các lần lấy độc lập với nhau: kết quả lần trước không làm thay đổi lần sau.");
  if (ch.bien_co.kieu === "gop") {
    luu_y.push(
      ch.bien_co.phep === "va"
        ? "“VÀ” nghĩa là phải thỏa cả hai điều kiện cùng lúc, nên ta chỉ đếm những kết quả thỏa tất cả điều kiện."
        : "“HOẶC” nghĩa là thỏa ít nhất một điều kiện. Kết quả thỏa cả hai điều kiện chỉ được đếm một lần (ví dụ số 15 vừa chia hết cho 3 vừa chia hết cho 5 nhưng vẫn chỉ tính 1).",
    );
  }
  if (ch.phu_dinh) luu_y.push(`Đề hỏi biến cố “không xảy ra”. Cách khác: tính xác suất biến cố đối rồi lấy 1 trừ đi: P = 1 − ${gs.tong - gs.thoa}/${gs.tong} = ${rut}.`);

  return {
    buoc,
    luu_y,
    ket_luan: `Vậy xác suất của biến cố A là ${rut}${rut.includes("/") ? ` (khoảng ${phanTram(xs)})` : ""}.`,
    xac_suat: rut,
  };
}
