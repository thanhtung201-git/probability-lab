// Chạy thí nghiệm ngay trên trình duyệt (không cần mạng) và trình bày kết quả cho cả lớp xem.
import { chayThiNghiem, type CauHinhThiNghiem, type KetQuaThiNghiem, type TinhHuong } from "@plab/core";
import { useEffect, useMemo, useState } from "react";
import { BieuDoCot, BieuDoDuong } from "./BieuDo";

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

function phanSo(s: string) {
  const [t, m] = s.split("/").map(Number);
  return m ? t! / m : t!;
}

/** Mô tả thí nghiệm bằng lời, để giáo viên đọc cho cả lớp. */
export function moTaThiNghiem(ch: CauHinhThiNghiem, th: TinhHuong): string {
  const n = th.nhan;
  switch (ch.loai) {
    case "xuc_xac":
    case "dong_xu":
    case "bi":
    case "the":
    case "bai_toan":
      return "Thí nghiệm này được thực hiện trong phòng thí nghiệm tương tác.";
    case "co_dieu_kien":
      return `Máy tạo thật nhiều chuỗi, giữ lại ${so(ch.so_chuoi)} chuỗi có ${ch.so_lan_truoc} lần "${n[ch.ket_qua_lap]}" liên tiếp, rồi xem lần kế tiếp có ra "${n[ch.bien_co]}" thường xuyên hơn không.`;
    case "hoi_tu":
      return `Máy thực hiện ${so(Math.max(...ch.moc))} lần, theo dõi tần suất "${n.N}" sau ${ch.moc.map(so).join(", ")} lần.`;
    case "so_sanh_day":
      return `Máy thực hiện ${so(ch.so_lan)} lần, mỗi lần tung ${ch.day_a.length} đồng xu, đếm xem dãy ${ch.day_a} và dãy ${ch.day_b} xuất hiện bao nhiêu lần.`;
    case "xac_suat_lap":
      return `Máy mô phỏng ${so(ch.so_ngay)} ngày, mỗi ngày khả năng "${n.N}" là ${pt(ch.xac_suat.tu / ch.xac_suat.mau)}, rồi đếm số ngày "${n.N}" và "${n.S}".`;
  }
}

function OSo({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="o-so">
      <div className="nhan">{nhan}</div>
      <div className="so-lon">{giaTri}</div>
    </div>
  );
}

function KetQua({ kq, th, soDiemHien }: { kq: KetQuaThiNghiem; th: TinhHuong; soDiemHien: number }) {
  const ch = kq.cau_hinh;
  const n = th.nhan;
  const diem = kq.du_lieu_bieu_do.slice(0, Math.max(2, soDiemHien));

  switch (ch.loai) {
    case "co_dieu_kien": {
      const khac = ch.bien_co === "N" ? "S" : "N";
      return (
        <>
          <div className="luoi-3">
            <OSo nhan="Số chuỗi máy đã tạo" giaTri={so(Number(kq.chi_tiet.so_chuoi_da_tao))} />
            <OSo nhan={`Chuỗi có ${ch.so_lan_truoc} lần "${n[ch.ket_qua_lap]}" liên tiếp`} giaTri={so(Number(kq.chi_tiet.so_chuoi_thoa_dieu_kien))} />
            <OSo nhan={`Lần kế tiếp ra "${n[ch.bien_co]}"`} giaTri={pt(kq.tan_suat)} />
          </div>
          <div className="luoi-2" style={{ marginTop: "1rem" }}>
            <BieuDoCot
              tieuDe="Số lần ở lượt kế tiếp"
              nhan={[`"${n[ch.bien_co]}"`, `"${n[khac]}"`]}
              giaTri={[kq.tan_so[ch.bien_co] ?? 0, kq.tan_so[khac] ?? 0]}
            />
            <BieuDoDuong diem={diem} lyThuyet={kq.ly_thuyet_so} nhanTruc={`Tần suất "${n[ch.bien_co]}"`} nhanX="Số chuỗi thỏa điều kiện" />
          </div>
        </>
      );
    }
    case "hoi_tu": {
      const moc = [...ch.moc].sort((a, b) => a - b);
      return (
        <>
          <div className="luoi-3">
            {moc.map((m) => (
              <OSo key={m} nhan={`Tần suất "${n.N}" sau ${so(m)} lần`} giaTri={pt(Number(kq.chi_tiet[`tan_suat_${m}`]))} />
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <BieuDoDuong diem={diem} lyThuyet={kq.ly_thuyet_so} nhanTruc={`Tần suất "${n.N}"`} nhanX="Số lần thực hiện (thang logarit)" logX />
          </div>
        </>
      );
    }
    case "so_sanh_day":
      return (
        <>
          <div className="luoi-3">
            <OSo nhan={`Dãy ${ch.day_a} xuất hiện`} giaTri={`${so(kq.tan_so[ch.day_a] ?? 0)} lần`} />
            <OSo nhan={`Dãy ${ch.day_b} xuất hiện`} giaTri={`${so(kq.tan_so[ch.day_b] ?? 0)} lần`} />
            <OSo nhan="Tổng số lần thử" giaTri={so(ch.so_lan)} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <BieuDoCot tieuDe="Số lần xuất hiện" nhan={[ch.day_a, ch.day_b]} giaTri={[kq.tan_so[ch.day_a] ?? 0, kq.tan_so[ch.day_b] ?? 0]} />
          </div>
        </>
      );
    case "xac_suat_lap":
      return (
        <>
          <div className="luoi-3">
            <OSo nhan={`Số ngày "${n.N}"`} giaTri={so(kq.tan_so.xay_ra ?? 0)} />
            <OSo nhan={`Số ngày "${n.S}"`} giaTri={so(kq.tan_so.khong_xay_ra ?? 0)} />
            <OSo nhan={`Tỷ lệ ngày "${n.S}"`} giaTri={pt(Number(kq.chi_tiet.ty_le_khong_xay_ra))} />
          </div>
          <div className="luoi-2" style={{ marginTop: "1rem" }}>
            <BieuDoCot tieuDe="Số ngày" nhan={[`"${n.N}"`, `"${n.S}"`]} giaTri={[kq.tan_so.xay_ra ?? 0, kq.tan_so.khong_xay_ra ?? 0]} />
            <BieuDoDuong diem={diem} lyThuyet={kq.ly_thuyet_so} nhanTruc={`Tỷ lệ ngày "${n.N}"`} nhanX="Số ngày" />
          </div>
        </>
      );
  }
}

/**
 * `daChay`: thí nghiệm đã chạy trước đó (mở lại trang) thì hiện ngay kết quả;
 * vì cùng seed nên kết quả tính lại giống hệt lần trước.
 */
export function ThiNghiem({
  cauHinh,
  tinhHuong,
  daChay,
  onXong,
}: {
  cauHinh: CauHinhThiNghiem;
  tinhHuong: TinhHuong;
  daChay: boolean;
  onXong: (kq: KetQuaThiNghiem) => void;
}) {
  const kq = useMemo(() => chayThiNghiem(cauHinh), [cauHinh]);
  const [batDau, setBatDau] = useState(daChay);
  const [soDiem, setSoDiem] = useState(daChay ? kq.du_lieu_bieu_do.length : 0);
  const xong = batDau && soDiem >= kq.du_lieu_bieu_do.length;

  // Hiện dần đường tần suất trong khoảng 2 giây để cả lớp theo dõi.
  useEffect(() => {
    if (!batDau || xong) return;
    const tong = kq.du_lieu_bieu_do.length;
    const buoc = Math.max(1, Math.ceil(tong / 40));
    const id = window.setInterval(() => setSoDiem((s) => Math.min(tong, s + buoc)), 50);
    return () => window.clearInterval(id);
  }, [batDau, xong, kq]);

  useEffect(() => {
    if (xong && !daChay) onXong(kq);
    // chỉ báo một lần khi vừa chạy xong
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xong]);

  return (
    <div>
      <p>{moTaThiNghiem(cauHinh, tinhHuong)}</p>
      {!batDau ? (
        <button onClick={() => setBatDau(true)}>▶ Chạy thí nghiệm</button>
      ) : (
        <>
          <KetQua kq={kq} th={tinhHuong} soDiemHien={soDiem} />
          {xong && (
            <p className="muted" style={{ marginTop: "0.8rem" }}>
              Xác suất lý thuyết: <strong>{kq.ly_thuyet}</strong> ({pt(phanSo(kq.ly_thuyet))}) · Mã thí nghiệm (seed): {cauHinh.seed}
            </p>
          )}
        </>
      )}
    </div>
  );
}
