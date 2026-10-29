// Màn hình một tiết học: tình huống, danh sách nhóm, làm việc với từng nhóm, tổng quan lớp.
import type { TinhHuong } from "@plab/core";
import { useCallback, useEffect, useState } from "react";
import type { ThuVien } from "../App";
import { laThiNghiemVat, type CauHinhVat } from "@plab/core";
import { api, type TongQuan } from "../api";
import { docGhiChuPhien, moTaCheDo } from "../mo-ta-che-do";
import { tenNhom } from "../ten-nhom";
import { BaiHocVat } from "./BaiHocVat";
import { LuongNhom } from "./LuongNhom";
import { luuPhienGanDay } from "./TrangChu";
import { PhieuTongKet } from "./PhieuTongKet";
import { TongQuanLop } from "./TongQuanLop";

export function Phien({ maPhien, thuVien }: { maPhien: string; thuVien: ThuVien }) {
  const [tinhHuong, setTinhHuong] = useState<TinhHuong | null>(null);
  const [tongQuan, setTongQuan] = useState<TongQuan | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [che, setChe] = useState<"nhom" | "lop" | "phieu">("nhom");
  const [nhomChon, setNhomChon] = useState<string | null>(null);
  const [tenNhomMoi, setTenNhomMoi] = useState("");
  const [loiNhom, setLoiNhom] = useState<string | null>(null);

  const taiTongQuan = useCallback(() => {
    api.tongQuan(maPhien).then(setTongQuan).catch(() => {});
  }, [maPhien]);

  useEffect(() => {
    api
      .phien(maPhien)
      .then((d) => {
        setTinhHuong(d.tinh_huong);
        luuPhienGanDay(maPhien);
      })
      .catch((e) => setLoi(e.message));
    taiTongQuan();
    // Tự làm mới để bản đồ ngộ nhận và số cần duyệt luôn mới khi nhiều nhóm cùng làm.
    const id = window.setInterval(taiTongQuan, 5000);
    return () => window.clearInterval(id);
  }, [maPhien, taiTongQuan]);

  async function themNhom(e: React.FormEvent) {
    e.preventDefault();
    const ten = tenNhomMoi.trim();
    if (!ten) {
      setLoiNhom("Nhập tên nhóm, ví dụ: Nhóm 1");
      return;
    }
    try {
      const l = await api.vaoLuot(maPhien, ten);
      setTenNhomMoi("");
      setLoiNhom(null);
      setNhomChon(l.luot.id);
      setChe("nhom");
      taiTongQuan();
    } catch (err) {
      setLoiNhom((err as Error).message);
    }
  }

  if (loi)
    return (
      <div className="thong-bao loi">
        {loi} <a href="#/tiet-hoc">Về danh sách tình huống</a>
      </div>
    );
  if (!tinhHuong || !tongQuan) return <p className="dang-tai">Đang tải phiên</p>;
  const laXucXac = laThiNghiemVat(tinhHuong.chinh);
  const ghiChu = docGhiChuPhien(maPhien);
  const hangNhom = (
            <div className="hang-nhom">
              {tongQuan.nhom.map((n) => (
                <button key={n.id} className={n.id === nhomChon ? "" : "phu"} onClick={() => setNhomChon(n.id)}>
                  {tenNhom(n.ma_nhom)} <span>{n.lan3 ? "✓" : n.lan1 ? "…" : ""}</span>
                </button>
              ))}
              <form className="hang" onSubmit={themNhom} style={{ gap: "0.4rem" }}>
                <input style={{ width: 170 }} placeholder="Tên nhóm mới" value={tenNhomMoi} onChange={(e) => setTenNhomMoi(e.target.value)} />
                <button type="submit">+ Thêm nhóm</button>
              </form>
              {loiNhom && <span className="muted" style={{ color: "var(--loi)" }}>{loiNhom}</span>}
            </div>
  );

  return (
    <>
      <div className="hang" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <div className="hang" style={{ gap: "0.6rem", alignItems: "baseline" }}>
          <span className="muted">Mã phiên</span>
          <span className="ma-phien">{maPhien}</span>
        </div>
        <div className="hang">
          <a className="nut phu" href={`/api/phien/${maPhien}/xuat-csv`} download title="Tải nhật ký học tập của các nhóm, mở được bằng Excel">
            Xuất nhật ký (CSV)
          </a>
          <button className={che === "phieu" ? "" : "phu"} onClick={() => { setChe("phieu"); taiTongQuan(); }}>
            Phiếu tổng kết
          </button>
          <button className={che === "nhom" ? "" : "phu"} onClick={() => setChe("nhom")}>
            Làm việc với nhóm
          </button>
          <button
            className={che === "lop" ? "" : "phu"}
            onClick={() => {
              setChe("lop");
              taiTongQuan();
            }}
          >
            Tổng quan lớp {tongQuan.hang_cho.length > 0 && `(${tongQuan.hang_cho.length} cần duyệt)`}
          </button>
        </div>
      </div>

      <div className="the">
        <h2>{tinhHuong.tieu_de}</h2>
        <div className="tinh-huong">{tinhHuong.noi_dung}</div>
        {laXucXac && (
          <p className="muted" style={{ marginTop: "0.7rem" }}>
            <strong>Thí nghiệm:</strong> {moTaCheDo(tinhHuong.thi_nghiem[tinhHuong.chinh] as unknown as CauHinhVat)}
            {ghiChu?.nguon === "ai" && " · do AI chọn"}
            {ghiChu?.ly_do && ghiChu.nguon === "ai" ? ` (${ghiChu.ly_do})` : ""}
          </p>
        )}
        {ghiChu?.canh_bao && <div className="thong-bao canh-bao" style={{ marginTop: "0.7rem", marginBottom: 0 }}>{ghiChu.canh_bao}</div>}
      </div>

      {che === "phieu" ? (
        <PhieuTongKet maPhien={maPhien} tieuDe={tinhHuong.tieu_de} tongQuan={tongQuan} thuVien={thuVien} onQuayLai={() => setChe("lop")} />
      ) : che === "lop" ? (
        <TongQuanLop
          maPhien={maPhien}
          tongQuan={tongQuan}
          thuVien={thuVien}
          onThayDoi={taiTongQuan}
          onChonNhom={(id) => {
            setNhomChon(id);
            setChe("nhom");
          }}
        />
      ) : laXucXac ? (
        // Bài toán xúc xắc: chọn nhóm theo hàng ngang, bên dưới là các bước và phòng thí nghiệm cạnh nhau.
        <>
          {nhomChon ? (
            <BaiHocVat key={nhomChon} luotId={nhomChon} tinhHuong={tinhHuong} thuVien={thuVien} onThayDoi={taiTongQuan} hangNhom={hangNhom} />
          ) : (
            <>
              {hangNhom}
              <div className="the">
                <p className="muted">Thêm một nhóm hoặc chọn nhóm ở hàng trên để bắt đầu.</p>
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 240px) 1fr", gap: "1.2rem", alignItems: "start" }}>
          <div className="the">
            <h3>Các nhóm</h3>
            <div style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>
              {tongQuan.nhom.map((n) => (
                <button key={n.id} className={n.id === nhomChon ? "" : "phu"} onClick={() => setNhomChon(n.id)} style={{ justifyContent: "space-between" }}>
                  {tenNhom(n.ma_nhom)}
                  <span>{n.lan3 ? "✓" : n.lan1 ? "…" : ""}</span>
                </button>
              ))}
            </div>
            <form onSubmit={themNhom}>
              <input placeholder="Tên nhóm mới" value={tenNhomMoi} onChange={(e) => setTenNhomMoi(e.target.value)} />
              {loiNhom && <div className="muted" style={{ color: "var(--loi)" }}>{loiNhom}</div>}
              <button type="submit" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
                + Thêm nhóm
              </button>
            </form>
          </div>
          <div>
            {nhomChon ? (
              <LuongNhom luotId={nhomChon} tinhHuong={tinhHuong} thuVien={thuVien} onThayDoi={taiTongQuan} />
            ) : (
              <div className="the">
                <p className="muted">Thêm một nhóm hoặc chọn nhóm ở bên trái để bắt đầu.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
