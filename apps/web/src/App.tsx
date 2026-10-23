// Một giao diện duy nhất cho giáo viên, trình chiếu trên máy chiếu.
// Điều hướng bằng hash: #/ (trang chủ) và #/phien/<MÃ PHIÊN>.
import type { ThuVienNgoNhan, ThuVienTinhHuong } from "@plab/core";
import { useEffect, useState } from "react";
import { api } from "./api";
import { Phien } from "./giao-vien/Phien";
import { PhongThiNghiem } from "./phong-thi-nghiem/PhongThiNghiem";
import { ThemBai } from "./giao-vien/ThemBai";
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
  const trang: "phong" | "tiet-hoc" | "them-bai" | "phien" = maPhien
    ? "phien"
    : hash.startsWith("#/them-bai")
      ? "them-bai"
      : hash.startsWith("#/tiet-hoc")
        ? "tiet-hoc"
        : "phong";

  return (
    <>
      <header className="dau-trang">
        <div className="hang" style={{ gap: "1.5rem" }}>
          <a className="ten" href="#/">
            Probability Lab AI
          </a>
          <nav className="dieu-huong">
            <a href="#/" className={trang === "phong" ? "dang-o" : ""}>
              Phòng thí nghiệm
            </a>
            <a href="#/tiet-hoc" className={trang === "tiet-hoc" || trang === "phien" ? "dang-o" : ""}>
              Tiết học với AI
            </a>
            <a href="#/them-bai" className={trang === "them-bai" ? "dang-o" : ""}>
              Thêm bài toán
            </a>
          </nav>
        </div>
        {ai && trang !== "phong" && (
          <span className={`huy-hieu ${ai.llm_bat ? "M0" : "cho"}`}>
            {ai.llm_bat ? `AI: Groq · ${ai.mo_hinh}` : "AI chưa bật · đang dùng bộ luật dự phòng"}
          </span>
        )}
      </header>
      <main className="khung">
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
              ) : trang === "them-bai" ? (
                <ThemBai thuVien={thuVien} aiBat={ai?.llm_bat ?? false} onDoi={taiThuVien} />
              ) : (
                <TrangChu thuVien={thuVien} aiBat={ai?.llm_bat ?? false} />
              ))}
          </>
        )}
      </main>
    </>
  );
}
