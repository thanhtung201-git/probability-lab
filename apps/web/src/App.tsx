// Một giao diện duy nhất cho giáo viên, trình chiếu trên máy chiếu.
// Điều hướng bằng hash: #/ (trang chủ) và #/phien/<MÃ PHIÊN>.
import type { ThuVienNgoNhan, ThuVienTinhHuong } from "@plab/core";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Banner, NenDong, useMoDauTrang, useNghiengSanKhau, useNoPhao, useThanhDieuHuong, useVaoTrang } from "./hieu-ung";
import { BaiMo } from "./giao-vien/BaiMo";
import { Phien } from "./giao-vien/Phien";
import { PhongThiNghiem } from "./phong-thi-nghiem/PhongThiNghiem";
import { TrangChu } from "./giao-vien/TrangChu";

export interface ThuVien {
  ngo_nhan: ThuVienNgoNhan;
  tinh_huong: ThuVienTinhHuong;
}

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const doi = () => setHash(window.location.hash);
    window.addEventListener("hashchange", doi);
    return () => window.removeEventListener("hashchange", doi);
  }, []);
  return hash;
}

const GIOI_THIEU = {
  phong: { tieuDe: "Phòng thí nghiệm xác suất", moTa: "Tung, gieo, rút hàng nghìn lần chỉ trong vài giây, rồi xem sự thật hiện ra!" },
  "tiet-hoc": { tieuDe: "Tiết học với AI", moTa: "Dự đoán trước, thử nghiệm sau, rồi cùng khám phá xem ai đúng!" },
  "bai-mo": { tieuDe: "Bài toán mở", moTa: "Cứ nhập đề bất kỳ: hệ thống dựng thí nghiệm, giải từng bước và bắt lỗi sai giúp bạn." },
  phien: { tieuDe: "Phiên học trên lớp", moTa: "Theo dõi từng nhóm và chốt kiến thức khi cả lớp đã thử xong." },
} as const;

export function App() {
  const hash = useHash();
  const [thuVien, setThuVien] = useState<ThuVien | null>(null);
  const [ai, setAi] = useState<{ llm_bat: boolean; mo_hinh: string | null } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const taiThuVien = () => api.thuVien().then(setThuVien).catch((e) => setLoi(`Không kết nối được máy chủ: ${e.message}`));

  useEffect(() => {
    taiThuVien();
    api.trangThai().then(setAi).catch(() => {});
  }, []);

  const maPhien = hash.match(/^#\/phien\/([A-Za-z0-9]+)/)?.[1]?.toUpperCase();
  const trang: "phong" | "tiet-hoc" | "bai-mo" | "phien" = maPhien
    ? "phien"
    : hash.startsWith("#/bai-mo") || hash.startsWith("#/them-bai")
      ? "bai-mo"
      : hash.startsWith("#/tiet-hoc")
        ? "tiet-hoc"
        : "phong";

  const dauTrang = useRef<HTMLElement>(null);
  const dieuHuong = useRef<HTMLElement>(null);
  const noiDung = useRef<HTMLElement>(null);
  useMoDauTrang(dauTrang);
  useThanhDieuHuong(dieuHuong, trang);
  // Đổi trang, đổi phiên hoặc dữ liệu vừa tải xong thì các thẻ vào lại lần lượt.
  useVaoTrang(noiDung, [trang, maPhien, !!thuVien]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [trang, maPhien]);
  useNghiengSanKhau(noiDung);
  useNoPhao();
  const gioiThieu = GIOI_THIEU[trang];

  return (
    <>
      <NenDong />
      <header className="dau-trang" ref={dauTrang}>
        <div className="hang" style={{ gap: "1.5rem" }}>
          <a className="ten" href="#/">
            Probability Lab AI
          </a>
          <nav className="dieu-huong" ref={dieuHuong}>
            <span className="vet-nav" aria-hidden="true" />
            <a href="#/" className={trang === "phong" ? "dang-o" : ""}>
              Phòng thí nghiệm
            </a>
            <a href="#/tiet-hoc" className={trang === "tiet-hoc" || trang === "phien" ? "dang-o" : ""}>
              Tiết học với AI
            </a>
            <a href="#/bai-mo" className={trang === "bai-mo" ? "dang-o" : ""}>
              Bài toán mở
            </a>
          </nav>
        </div>
        {ai && trang !== "phong" && (
          <span className={`huy-hieu ${ai.llm_bat ? "M0" : "cho"}`}>
            {ai.llm_bat ? `AI: Groq · ${ai.mo_hinh}` : "AI chưa bật · đang dùng bộ luật dự phòng"}
          </span>
        )}
      </header>
      <Banner khoa={trang} tieuDe={gioiThieu.tieuDe} moTa={gioiThieu.moTa} />
      <main className="khung" ref={noiDung}>
        {trang === "phong" ? (
          // Phòng thí nghiệm chạy hoàn toàn trên trình duyệt, không cần máy chủ.
          <PhongThiNghiem />
        ) : (
          <>
            {loi && <div className="thong-bao loi">{loi}</div>}
            {!thuVien && !loi && <p className="dang-tai">Đang tải</p>}
            {thuVien &&
              (maPhien ? (
                <Phien key={maPhien} maPhien={maPhien} thuVien={thuVien} />
              ) : trang === "bai-mo" ? (
                <BaiMo thuVien={thuVien} aiBat={ai?.llm_bat ?? false} onDaLuu={taiThuVien} />
              ) : (
                <TrangChu thuVien={thuVien} aiBat={ai?.llm_bat ?? false} />
              ))}
          </>
        )}
      </main>
    </>
  );
}
