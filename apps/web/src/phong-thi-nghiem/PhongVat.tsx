// Phòng thí nghiệm dùng chung cho xúc xắc và đồng xu: trang tự do và màn hình bài học (AI cấu hình sẵn).
// Hỗ trợ ba chế độ của lõi: phân phối (mặt/tổng), có điều kiện, so sánh dãy.
import {
  cacKhoaVat,
  gieoMotCon,
  motLuotVat,
  soMatHienThiVat,
  taoRng,
  taoSeed,
  moTaBienCo,
  moTaBienCoBaiToan,
  nhanVat,
  laSuKienBi,
  moTaSuKienBi,
  thoaBienCo,
  tongHopVat,
  type CauHinhVat,
  type KetQuaThiNghiem,
  type Rng,
  type SoLieuXucXac,
} from "@plab/core";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  Tooltip,
  type Plugin,
} from "chart.js";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CachTinh } from "./CachTinh";
import { Bar, Line } from "react-chartjs-2";
import { BoThe, HopBi, MatBi, MatThe, MatVatTQ, TapVatTQ } from "./MatBiThe";
import { SoChay } from "../hieu-ung";
import { MatDongXu } from "./MatDongXu";
import { MatXucXac } from "./MatXucXac";
import "./phong-thi-nghiem.css";

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const XANH_DAM = "#1e2a4a";
const XAM = "#c7cbd6";
const DO = "#dc2626";
const CO_CHU = 15;
/** Số lượt tối đa cho một lần chạy tùy chỉnh (đủ lớn để thấy hội tụ, vẫn mượt trên máy học sinh). */
const LO_TOI_DA = 100_000;

/**
 * Tốc độ chạy một lô lượt: số đợt cập nhật biểu đồ và thời gian giữa hai đợt (ms).
 * "msLe" dùng cho lô nhỏ (tối đa 10 lượt): mỗi lượt một nhịp để cả lớp kịp nhìn.
 * Chậm: lô 1.000 lượt mất khoảng 10 giây, biểu đồ lớn dần qua 80 đợt.
 */
const TOC_DO = {
  cham: { ten: "Chậm", dot: 80, ms: 130, msLe: 450 },
  vua: { ten: "Vừa", dot: 40, ms: 70, msLe: 250 },
  nhanh: { ten: "Nhanh", dot: 30, ms: 35, msLe: 150 },
} as const;
type TocDo = keyof typeof TOC_DO;

const pt = (x: number, so = 1) => `${(x * 100).toFixed(so).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

/** Chỉ lưu ảnh chụp số đếm tại các mốc để vẽ đường hội tụ, không lưu từng lượt. */
const laDiemGhi = (n: number) => n <= 100 || (n <= 1_000 && n % 10 === 0) || (n <= 10_000 && n % 100 === 0) || n % 1_000 === 0;

const nenTrang: Plugin = {
  id: "nen-trang",
  beforeDraw: (chart) => {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

/** Số liệu lưu được (gửi lên máy chủ và khôi phục khi mở lại nhóm). */
export interface SoLieuLuu extends SoLieuXucXac {
  lich_su: { n: number; dem: Record<string, number> }[];
}

const soLieuRong = (): SoLieuLuu => ({ so_luot: 0, so_ghi_nhan: 0, dem: {}, lich_su: [] });

/** Mẫu số để tính tần suất: chế độ dãy tính trên mọi lượt, các chế độ khác trên lượt được ghi nhận. */
const mauSo = (ch: CauHinhVat, sl: SoLieuXucXac) => (ch.che_do === "day" ? sl.so_luot : sl.so_ghi_nhan);

const chuMat = (m: number) => (m === 1 ? "N" : "S");
const tenMat = (m: number) => (m === 1 ? "ngửa" : "sấp");

function moTaLuotDongXu(ch: Extract<CauHinhVat, { loai: "dong_xu" }>, mat: number[], khoa: string | null | undefined): string {
  switch (ch.che_do) {
    case "phan_phoi":
      return ch.so_dong_xu === 1
        ? `Ra mặt ${tenMat(mat[0]!)}`
        : `${mat.map(tenMat).join(", ")} → ${mat.filter((m) => m === 1).length} mặt ngửa`;
    case "dieu_kien":
      if (khoa === null) return `Lượt bị loại: ra ${tenMat(mat[mat.length - 1]!)} ở lần thứ ${mat.length}`;
      return `${ch.so_lan_truoc} lần đầu đều ra ${ch.mat === "N" ? "ngửa" : "sấp"} → lần kế tiếp ra ${tenMat(mat[mat.length - 1]!)}`;
    case "day": {
      const s = mat.map(chuMat).join("");
      return khoa === "a" || khoa === "b" ? `Dãy ${s} – trùng dãy cần đếm!` : `Dãy ${s}`;
    }
  }
}

function moTaLuotBi(ch: Extract<CauHinhVat, { loai: "bi" }>, mat: number[], khoa: string | null | undefined): string {
  const ten = (m: number) => ch.hop[m - 1]?.ten ?? "?";
  if (ch.che_do === "dieu_kien") {
    if (khoa === null) return `Lượt bị loại: lấy bi ${ten(mat[mat.length - 1]!)} ở lần thứ ${mat.length}`;
    return `${ch.so_lan_truoc} lần đầu đều bi ${ch.mau_lap} → lần kế tiếp lấy được bi ${ten(mat[mat.length - 1]!)}`;
  }
  if (ch.so_lay === 1) return `Lấy được bi ${ten(mat[0]!)}`;
  if (laSuKienBi(ch)) return `${mat.map(ten).join(", ")} → ${khoa === "co" ? "thuận lợi" : "không thuận lợi"}: ${moTaSuKienBi(ch)}`;
  const dem = mat.filter((m) => ten(m) === ch.mau_muc_tieu).length;
  return `${mat.map(ten).join(", ")} → ${dem} bi ${ch.mau_muc_tieu}`;
}

function moTaLuotThe(ch: Extract<CauHinhVat, { loai: "the" }>, mat: number[], khoa: string | null | undefined): string {
  if (ch.che_do === "tung_so") return `Rút được thẻ số ${mat[0]}`;
  const ten = moTaBienCo(ch.bien_co);
  if (ch.che_do === "bien_co") return `Rút được thẻ ${mat[0]} – ${khoa === "co" ? "thuận lợi" : "không thuận lợi"} biến cố (${ten})`;
  return `Rút thẻ ${mat[0]} và ${mat[1]} → ${khoa} thẻ ${ten}`;
}

/** Tên cột/trục đầu tiên của biểu đồ và bảng, tùy vật và kiểu thí nghiệm. */
function nhanTrucCua(c: CauHinhVat): string {
  if (c.che_do === "dieu_kien") return "Lần kế tiếp";
  if (c.che_do === "day") return "Dãy";
  switch (c.loai) {
    case "xuc_xac":
      return c.che_do === "phan_phoi" && c.so_xuc_xac > 1 ? "Tổng" : "Mặt";
    case "dong_xu":
      return c.che_do === "phan_phoi" && c.so_dong_xu > 1 ? "Số mặt ngửa" : "Mặt";
    case "bi":
      return c.che_do === "phan_phoi" && c.so_lay > 1 ? (laSuKienBi(c) ? "Biến cố" : `Số bi ${c.mau_muc_tieu}`) : "Màu bi";
    case "the":
      return c.che_do === "tung_so" ? "Thẻ" : c.che_do === "bien_co" ? "Biến cố" : `Số thẻ ${moTaBienCo(c.bien_co)}`;
    case "bai_toan":
      return "Biến cố";
  }
}

/** Từ ngữ theo vật: động từ và tên gọi. */
const TU_NGU = {
  xuc_xac: { dong: "gieo", Dong: "Gieo", vat: "xúc xắc" },
  dong_xu: { dong: "tung", Dong: "Tung", vat: "đồng xu" },
  bi: { dong: "lấy", Dong: "Lấy", vat: "hộp bi" },
  the: { dong: "rút", Dong: "Rút", vat: "thẻ số" },
  bai_toan: { dong: "lấy", Dong: "Lấy", vat: "bài toán" },
} as const;

/** Số giá trị mặt có thể có, để tạo hình ngẫu nhiên khi đang lắc. */
const soGiaTriMat = (c: CauHinhVat) => (c.loai === "xuc_xac" ? 6 : c.loai === "dong_xu" ? 2 : c.loai === "bi" ? c.hop.length : c.loai === "bai_toan" ? c.vat.length : c.so_the);

/** Hình một "mặt" của lần lấy/gieo/rút, tùy vật. */
function VeMat({ cauHinh, mat, dangLac, soMat }: { cauHinh: CauHinhVat; mat: number; dangLac: boolean; soMat: number }) {
  switch (cauHinh.loai) {
    case "dong_xu":
      return <MatDongXu mat={mat} dangLac={dangLac} kichThuoc={soMat > 5 ? 64 : soMat > 3 ? 78 : soMat === 3 ? 96 : 120} />;
    case "bi":
      return <MatBi mat={mat} hop={cauHinh.hop} dangLac={dangLac} kichThuoc={soMat > 5 ? 56 : soMat > 3 ? 70 : soMat === 3 ? 84 : 100} />;
    case "bai_toan":
      return <MatVatTQ vat={cauHinh.vat[mat - 1]} dangLac={dangLac} kichThuoc={soMat > 3 ? 70 : soMat === 3 ? 84 : 100} />;
    case "the":
      return (
        <MatThe
          so={mat}
          dangLac={dangLac}
          thuanLoi={cauHinh.che_do === "tung_so" || mat === 0 ? undefined : thoaBienCo(cauHinh.bien_co, mat)}
          kichThuoc={soMat > 1 ? 96 : 120}
        />
      );
    default:
      return <MatXucXac mat={mat} dangLac={dangLac} kichThuoc={soMat > 3 ? 72 : soMat === 3 ? 96 : 120} />;
  }
}

function moTaLuot(ch: CauHinhVat, mat: number[], khoa: string | null | undefined): string {
  if (ch.loai === "dong_xu") return moTaLuotDongXu(ch, mat, khoa);
  if (ch.loai === "bi") return moTaLuotBi(ch, mat, khoa);
  if (ch.loai === "the") return moTaLuotThe(ch, mat, khoa);
  if (ch.loai === "bai_toan") return `(${mat.map((m) => nhanVat(ch.vat[m - 1]!)).join(", ")}) → ${khoa === "co" ? "thuận lợi" : "không thuận lợi"}: ${moTaBienCoBaiToan(ch)}`;
  switch (ch.che_do) {
    case "phan_phoi":
      return ch.so_xuc_xac === 1 ? `Ra mặt ${mat[0]}` : `${mat.join(" + ")} = ${mat.reduce((a, b) => a + b, 0)}`;
    case "dieu_kien":
      if (khoa === null) return `Lượt bị loại: đã ra mặt ${ch.mat} ở lần thứ ${mat.length}`;
      return `${ch.so_lan_truoc} lần đầu không ra mặt ${ch.mat} → lần kế tiếp ra mặt ${mat[mat.length - 1]}`;
    case "day": {
      const s = mat.join("-");
      if (khoa === "a" || khoa === "b") return `Dãy ${s} – trùng dãy cần đếm!`;
      return `Dãy ${s}`;
    }
  }
}

export function PhongVat({
  cauHinh,
  khoaCauHinh = false,
  khoiTao,
  onCapNhat,
  dieuKhienThem,
  ghiChu,
  motCot = false,
  hienCachTinh = true,
}: {
  cauHinh: CauHinhVat;
  /** true khi cấu hình do bài học/AI quyết định: hiện nhãn và làm nổi bật giá trị theo dõi. */
  khoaCauHinh?: boolean;
  khoiTao?: SoLieuLuu | null;
  onCapNhat?: (luu: SoLieuLuu, kq: KetQuaThiNghiem) => void;
  /** Phần điều khiển riêng của nơi dùng (ví dụ chọn 1 hay 2 con ở trang tự do). */
  dieuKhienThem?: ReactNode;
  ghiChu?: ReactNode;
  /** Xếp bảng điều khiển phía trên kết quả, khi phòng thí nghiệm nằm trong một cột hẹp. */
  motCot?: boolean;
  /** false trong tiết học cho tới khi nhóm trả lời xong câu hỏi gợi mở, để không lộ cách giải trước. */
  hienCachTinh?: boolean;
}) {
  const khoa = useMemo(() => cacKhoaVat(cauHinh), [cauHinh]);
  const theoDoiMacDinh = String(cauHinh.theo_doi[0]);
  const soMat = soMatHienThiVat(cauHinh);
  const tu = TU_NGU[cauHinh.loai];
  const dongTu = tu.dong;
  const DongTu = tu.Dong;
  const matBanDau = cauHinh.loai === "bi" || cauHinh.loai === "the" || cauHinh.loai === "bai_toan" ? 0 : 1;

  // Bộ sinh dùng seed của cấu hình (tái lập được); khi khôi phục số liệu cũ thì dùng seed mới để không lặp lại.
  const rng = useRef<Rng>(taoRng(khoiTao?.so_luot ? taoSeed() : cauHinh.seed));
  const [soLieu, setSoLieu] = useState<SoLieuLuu>(() => khoiTao ?? soLieuRong());
  const [mat, setMat] = useState<number[]>(() => Array(soMat).fill(matBanDau));
  const [khoaCuoi, setKhoaCuoi] = useState<string | null | undefined>(undefined);
  const [dangLac, setDangLac] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  const [hoatHinh, setHoatHinh] = useState(true);
  const [soTuyChinh, setSoTuyChinh] = useState("100");
  const [tocDo, setTocDo] = useState<TocDo>("cham");
  const dungRef = useRef(false);
  const henGio = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(henGio.current), []);
  const [theoDoi, setTheoDoi] = useState(theoDoiMacDinh);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const bieuDoCot = useRef<ChartJS<"bar"> | null>(null);

  // Báo số liệu cho nơi dùng sau mỗi lần thay đổi (bài học dùng để tạo phản hồi và lưu lên máy chủ).
  const onCapNhatRef = useRef(onCapNhat);
  onCapNhatRef.current = onCapNhat;
  useEffect(() => {
    if (soLieu.so_luot > 0 && !dangChay) onCapNhatRef.current?.(soLieu, tongHopVat(cauHinh, soLieu));
  }, [soLieu, dangChay, cauHinh]);

  function datLai() {
    rng.current = taoRng(taoSeed());
    setSoLieu(soLieuRong());
    setMat(Array(soMat).fill(matBanDau));
    setKhoaCuoi(undefined);
    setThongBao(null);
  }

  /** Chạy `n` lượt ngay lập tức, cộng dồn vào số liệu. */
  function chayLuot(n: number, sl: SoLieuLuu) {
    const dem = { ...sl.dem };
    const lichSu = [...sl.lich_su];
    let soLuot = sl.so_luot;
    let soGhiNhan = sl.so_ghi_nhan;
    let cuoi = { mat, khoa: khoaCuoi as string | null };
    for (let i = 0; i < n; i++) {
      const l = motLuotVat(cauHinh, rng.current);
      soLuot++;
      cuoi = l;
      if (l.khoa !== null) {
        soGhiNhan++;
        dem[l.khoa] = (dem[l.khoa] ?? 0) + 1;
      }
      const moc = cauHinh.che_do === "day" ? soLuot : soGhiNhan;
      if ((cauHinh.che_do === "day" || l.khoa !== null) && laDiemGhi(moc)) lichSu.push({ n: moc, dem: { ...dem } });
    }
    return { sl: { so_luot: soLuot, so_ghi_nhan: soGhiNhan, dem, lich_su: lichSu }, cuoi };
  }

  function apDung(r: ReturnType<typeof chayLuot>) {
    setSoLieu(r.sl);
    setMat(r.cuoi.mat);
    setKhoaCuoi(r.cuoi.khoa);
  }

  function gieoMotLan() {
    if (dangChay) return;
    setThongBao(null);
    if (!hoatHinh) return apDung(chayLuot(1, soLieu));
    setDangChay(true);
    setDangLac(true);
    // Mặt hiện trong lúc lắc chỉ để trang trí; kết quả thật lấy từ bộ sinh có seed.
    const trangTri = taoRng(taoSeed());
    const id = window.setInterval(() => setMat(Array.from({ length: soMat }, () => (cauHinh.loai === "xuc_xac" ? gieoMotCon(trangTri) : 1 + Math.floor(trangTri() * soGiaTriMat(cauHinh))))), 80);
    window.setTimeout(() => {
      window.clearInterval(id);
      apDung(chayLuot(1, soLieu));
      setDangLac(false);
      setDangChay(false);
    }, 700);
  }

  function gieoLo(n: number) {
    if (dangChay) return;
    if (!hoatHinh) {
      apDung(chayLuot(n, soLieu));
      setThongBao(`Đã ${dongTu} thêm ${so(n)} lượt`);
      return;
    }
    // Chia thành nhiều đợt nhỏ để biểu đồ lớn dần trước mắt cả lớp; tốc độ do giáo viên chọn.
    const td = TOC_DO[tocDo];
    setDangChay(true);
    dungRef.current = false;
    setThongBao(`Đang ${dongTu} ${so(n)} lượt…`);
    const soDot = n <= 10 ? n : Math.min(n, td.dot);
    const moiDot = Math.ceil(n / soDot);
    let conLai = n;
    let sl = soLieu;
    const buoc = () => {
      if (dungRef.current) {
        setDangChay(false);
        setThongBao(`Đã dừng: ${dongTu} thêm ${so(n - conLai)} lượt`);
        return;
      }
      const r = chayLuot(Math.min(moiDot, conLai), sl);
      sl = r.sl;
      conLai -= Math.min(moiDot, conLai);
      apDung(r);
      if (conLai > 0) henGio.current = window.setTimeout(buoc, n <= 10 ? td.msLe : td.ms);
      else {
        setDangChay(false);
        setThongBao(`Đã ${dongTu} thêm ${so(n)} lượt`);
      }
    };
    buoc();
  }

  function dungChay() {
    dungRef.current = true;
  }

  function taiPng() {
    const chart = bieuDoCot.current;
    if (!chart) return;
    const a = document.createElement("a");
    a.href = chart.toBase64Image("image/png", 1);
    a.download = `thuc-nghiem-ly-thuyet-${cauHinh.che_do}-${soLieu.so_luot}-luot.png`;
    a.click();
  }

  const soTuyChinhN = Number(soTuyChinh);
  const soHopLe = Number.isInteger(soTuyChinhN) && soTuyChinhN >= 1 && soTuyChinhN <= LO_TOI_DA;
  const n = mauSo(cauHinh, soLieu);
  const tanSuat = (k: string) => (n ? (soLieu.dem[k] ?? 0) / n : 0);
  const laTheoDoi = (k: string) => cauHinh.theo_doi.map(String).includes(k);
  const lechLonNhat = n ? Math.max(...khoa.map((k) => Math.abs(tanSuat(k.khoa) - k.xac_suat.soThuc()))) : 0;
  const kTheoDoi = khoa.find((k) => k.khoa === theoDoi) ?? khoa[0]!;
  const diemHoiTu = [
    ...soLieu.lich_su.map((l) => ({ x: l.n, y: (l.dem[kTheoDoi.khoa] ?? 0) / l.n })),
    ...(n && !laDiemGhi(n) ? [{ x: n, y: tanSuat(kTheoDoi.khoa) }] : []),
  ];
  const nhanTruc = nhanTrucCua(cauHinh);
  const tenKhoa = (k: string) => khoa.find((x) => x.khoa === k)?.nhan ?? k;
  const noiBat = khoaCauHinh && ["phan_phoi", "bien_co", "tung_so", "hai_the"].includes(cauHinh.che_do);
  const pMax = Math.max(...khoa.map((k) => k.xac_suat.soThuc()));

  return (
    <div className={`ptn${motCot ? " mot-cot" : ""}`}>
      {/* Bảng điều khiển */}
      <div className="the">
        <h2>
          <span className="bieu-tuong" aria-hidden="true">⚗</span> Thí nghiệm {tu.vat}
        </h2>
        {dieuKhienThem}
        {khoaCauHinh && (
          <div className="thong-bao tin" style={{ marginTop: "0.8rem" }}>
            Thí nghiệm đã được cấu hình theo giả thuyết của nhóm.
            {ghiChu && <div className="muted" style={{ marginTop: "0.3rem" }}>{ghiChu}</div>}
          </div>
        )}

        {cauHinh.loai === "bi" && <HopBi hop={cauHinh.hop} />}
        {cauHinh.loai === "bai_toan" && <TapVatTQ vat={cauHinh.vat} tenVat={cauHinh.ten_vat ?? "vật"} />}
        {cauHinh.loai === "the" && (
          <BoThe
            soThe={cauHinh.so_the}
            bienCo={cauHinh.che_do === "tung_so" ? undefined : cauHinh.bien_co}
            tenBienCo={cauHinh.che_do === "tung_so" ? undefined : moTaBienCo(cauHinh.bien_co)}
          />
        )}
        <div className="nhan-muc">{DongTu}</div>
        <button className="nut-gieo" onClick={gieoMotLan} disabled={dangChay}>
          ▶ {DongTu} 1 lượt{hoatHinh ? " (có hoạt hình)" : ""}
        </button>
        <div className="nut-lo">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={LO_TOI_DA}
            step={1}
            value={soTuyChinh}
            onChange={(e) => setSoTuyChinh(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && soHopLe && gieoLo(soTuyChinhN)}
            disabled={dangChay}
            aria-label={`Số lượt muốn ${dongTu}`}
            placeholder="Nhập số lượt"
          />
          <button className="vua-chon" onClick={() => gieoLo(soTuyChinhN)} disabled={dangChay || !soHopLe}>
            ▶ {DongTu}
          </button>
          <button className="dat-lai" onClick={datLai} disabled={dangChay} title="Đặt lại" aria-label="Đặt lại thí nghiệm">
            ↻
          </button>
        </div>
        {soTuyChinh !== "" && !soHopLe && (
          <p className="muted" style={{ marginTop: "0.4rem", color: "#b91c1c" }}>Nhập số nguyên từ 1 đến {so(LO_TOI_DA)}.</p>
        )}
        <div className="toc-do">
          <label htmlFor="toc-do">Tốc độ</label>
          <select id="toc-do" value={tocDo} onChange={(e) => setTocDo(e.target.value as TocDo)} disabled={dangChay}>
            {(Object.keys(TOC_DO) as TocDo[]).map((k) => (
              <option key={k} value={k}>
                {TOC_DO[k].ten}
              </option>
            ))}
          </select>
          {dangChay && !dangLac && (
            <button type="button" className="phu" onClick={dungChay}>
              ⏹ Dừng
            </button>
          )}
        </div>
        {khoaCauHinh && <p className="muted" style={{ marginTop: "0.6rem" }}>Gợi ý: {dongTu} khoảng {so(cauHinh.so_lan_goi_y)} lượt.</p>}

        <div className="dem">
          <div>
            <div className="so">
              <SoChay gia={soLieu.so_luot} />
            </div>
            <div className="muted">
              lượt đã {dongTu}
              {cauHinh.che_do === "dieu_kien" && ` · ${so(soLieu.so_ghi_nhan)} lượt thỏa điều kiện`}
            </div>
          </div>
          <label>
            <input type="checkbox" checked={hoatHinh} onChange={(e) => setHoatHinh(e.target.checked)} disabled={dangChay} />
            Hoạt hình
          </label>
        </div>
      </div>

      <div>
        {/* Sân khấu */}
        <div className="the">
          <div className="san-khau">
            <div className="hang-xx" style={{ gap: soMat > 3 ? "0.6rem" : "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              {/* Chế độ có điều kiện: lượt bị loại sớm vẫn hiện đủ ô, ô chưa gieo để trống (mặt 0) cho dễ theo dõi. */}
              {[...mat, ...Array(Math.max(0, soMat - mat.length)).fill(0)].map((m, i) => (
                <div key={i} className={cauHinh.che_do === "dieu_kien" && i === soMat - 1 ? "xx-ke-tiep" : ""}>
                  <VeMat cauHinh={cauHinh} mat={m} dangLac={dangLac} soMat={soMat} />
                </div>
              ))}
            </div>
            {dangLac ? (
              <div className="goi-y">Đang {dongTu}…</div>
            ) : soLieu.so_luot === 0 ? (
              <div className="goi-y">Bấm nút đỏ để {dongTu} một lượt</div>
            ) : (
              <div className="ket-qua">
                {khoaCuoi !== undefined ? moTaLuot(cauHinh, mat, khoaCuoi) : "Đã khôi phục số liệu của nhóm"}
                {thongBao && <span className="goi-y"> · {thongBao}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Thực nghiệm và lý thuyết */}
        <div className="the">
          <div className="dau-the">
            <div>
              <h2>
                <span className="bieu-tuong" aria-hidden="true">▮▮</span> Thực nghiệm và lý thuyết
              </h2>
              <p className="cong-thuc">
                Tần suất = số lần xuất hiện ÷{" "}
                {cauHinh.che_do === "dieu_kien" ? "số lượt thỏa điều kiện" : cauHinh.che_do === "day" ? "tổng số lượt" : `tổng số lần ${dongTu}`}
              </p>
            </div>
            <button className="phu" onClick={taiPng}>
              ⤓ PNG
            </button>
          </div>
          <div className="khung-bd">
            <Bar
              ref={bieuDoCot}
              plugins={[nenTrang]}
              data={{
                labels: khoa.map((k) => k.nhan),
                datasets: [
                  {
                    label: "Thực nghiệm",
                    data: khoa.map((k) => tanSuat(k.khoa)),
                    backgroundColor: khoa.map((k) => (!noiBat || laTheoDoi(k.khoa) ? XANH_DAM : XAM)),
                    borderRadius: 4,
                  },
                  {
                    label: "Lý thuyết",
                    data: khoa.map((k) => k.xac_suat.soThuc()),
                    backgroundColor: "rgba(220, 38, 38, 0.18)",
                    borderColor: DO,
                    borderWidth: 2,
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 250 },
                plugins: {
                  legend: { labels: { font: { size: CO_CHU } } },
                  tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${pt(Number(c.raw), 2)}` } },
                },
                scales: {
                  x: { title: { display: true, text: nhanTruc, font: { size: CO_CHU } }, ticks: { font: { size: CO_CHU } } },
                  y: {
                    beginAtZero: true,
                    suggestedMax: Math.min(1, pMax * 1.5),
                    title: { display: true, text: "Tần suất / xác suất", font: { size: CO_CHU } },
                    ticks: { font: { size: CO_CHU }, callback: (v) => pt(Number(v), pMax < 0.05 ? 1 : 0) },
                  },
                },
              }}
            />
          </div>
          {n > 0 && (
            <p className="muted" style={{ marginTop: "0.8rem" }}>
              Sau {so(soLieu.so_luot)} lượt, chênh lệch lớn nhất giữa thực nghiệm và lý thuyết là <strong>{pt(lechLonNhat, 2)}</strong>.
              {soLieu.so_luot < 100 ? ` ${DongTu} thêm nhiều lượt để xem chênh lệch thay đổi thế nào.` : ""}
            </p>
          )}
        </div>

        <div className="khung-phu-mo">
        {/* Hội tụ */}
        <div className="the">
          <div className="dau-the">
            <div>
              <h2>
                <span className="bieu-tuong" aria-hidden="true">〰</span> Tần suất thay đổi theo số lượt
              </h2>
              <p className="cong-thuc">Càng {dongTu} nhiều, tần suất càng tiến gần xác suất lý thuyết.</p>
            </div>
            <label className="hang" style={{ fontWeight: 600, gap: "0.5rem" }}>
              {nhanTruc}
              <select value={kTheoDoi.khoa} onChange={(e) => setTheoDoi(e.target.value)}>
                {khoa.map((k) => (
                  <option key={k.khoa} value={k.khoa}>
                    {k.nhan}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="khung-bd">
            {diemHoiTu.length < 2 ? (
              <p className="muted">{DongTu} vài lượt để thấy đường tần suất.</p>
            ) : (
              <Line
                data={{
                  datasets: [
                    {
                      label: `Tần suất: ${tenKhoa(kTheoDoi.khoa)}`,
                      data: diemHoiTu,
                      borderColor: XANH_DAM,
                      backgroundColor: XANH_DAM,
                      pointRadius: 0,
                      borderWidth: 2.5,
                    },
                    {
                      label: `Lý thuyết ${kTheoDoi.xac_suat.toString()}`,
                      data: [
                        { x: diemHoiTu[0]!.x, y: kTheoDoi.xac_suat.soThuc() },
                        { x: diemHoiTu[diemHoiTu.length - 1]!.x, y: kTheoDoi.xac_suat.soThuc() },
                      ],
                      borderColor: DO,
                      borderDash: [8, 6],
                      pointRadius: 0,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  parsing: false,
                  plugins: { legend: { labels: { font: { size: CO_CHU } } } },
                  scales: {
                    x: {
                      type: n >= 100 ? "logarithmic" : "linear",
                      title: { display: true, text: `Số lượt${n >= 100 ? " (thang logarit)" : ""}`, font: { size: CO_CHU } },
                      ticks: {
                        font: { size: CO_CHU },
                        autoSkip: n < 100,
                        callback: (v) => (n < 100 || Number.isInteger(Math.log10(Number(v))) ? so(Number(v)) : ""),
                      },
                    },
                    y: {
                      min: 0,
                      suggestedMax: Math.min(1, kTheoDoi.xac_suat.soThuc() * 3),
                      ticks: { font: { size: CO_CHU }, callback: (v) => pt(Number(v), kTheoDoi.xac_suat.soThuc() < 0.05 ? 1 : 0) },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Bảng số liệu */}
        <div className="the">
          <h2>
            <span className="bieu-tuong" aria-hidden="true">▦</span> Bảng số liệu
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>{nhanTruc}</th>
                  <th className="so">Số lần</th>
                  <th className="so">Tần suất</th>
                  <th className="so">Xác suất lý thuyết</th>
                  <th className="so">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {khoa.map((k) => {
                  const lech = tanSuat(k.khoa) - k.xac_suat.soThuc();
                  const bang = cauHinh.loai === "xuc_xac" && cauHinh.che_do === "phan_phoi" && cauHinh.so_xuc_xac > 1
                    ? `${Math.round(k.xac_suat.soThuc() * 6 ** cauHinh.so_xuc_xac)}/${6 ** cauHinh.so_xuc_xac}`
                    : k.xac_suat.toString();
                  return (
                    <tr key={k.khoa} style={noiBat && laTheoDoi(k.khoa) ? { background: "#fef2f2" } : undefined}>
                      <td>
                        <strong>{k.nhan}</strong>
                      </td>
                      <td className="so">{so(soLieu.dem[k.khoa] ?? 0)}</td>
                      <td className="so">{n ? pt(tanSuat(k.khoa), 2) : "–"}</td>
                      <td className="so">
                        {bang} ≈ {pt(k.xac_suat.soThuc(), 2)}
                      </td>
                      <td className={`so${n >= 1000 && Math.abs(lech) > 0.02 ? " lech-lon" : ""}`}>
                        {n ? (Math.abs(lech) < 0.00005 ? "0,00%" : `${lech > 0 ? "+" : "−"}${pt(Math.abs(lech), 2)}`) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {hienCachTinh && <CachTinh cauHinh={cauHinh} khoa={khoa} khoaChon={kTheoDoi.khoa} onChon={setTheoDoi} nhanTruc={nhanTruc} />}
        </div>
      </div>
    </div>
  );
}
