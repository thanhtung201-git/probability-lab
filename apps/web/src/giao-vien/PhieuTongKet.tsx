// Phiếu tổng kết tiết học: in hoặc lưu PDF để nộp minh chứng, kèm tải nhật ký học tập (CSV mở bằng Excel).
import type { MaNgoNhan } from "@plab/core";
import type { ThuVien } from "../App";
import type { NhomTongQuan, TongQuan } from "../api";
import { BieuDoCot } from "../components/BieuDo";
import { tenNhom } from "../ten-nhom";

const MA: MaNgoNhan[] = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"];

type TrangThaiNhom = "dieu_chinh" | "hieu_dung" | "ho_tro" | "dang_lam";

/** Một nhóm: đã điều chỉnh (mức tăng từ lần 1 đến lần 3), hiểu đúng, cần hỗ trợ thêm hoặc đang làm. */
function trangThaiNhom(n: NhomTongQuan): TrangThaiNhom {
  if (n.muc3 == null) return "dang_lam";
  if (n.muc1 != null && n.muc3 > n.muc1) return "dieu_chinh";
  return n.muc3 >= 3 ? "hieu_dung" : "ho_tro";
}

const NHAN: Record<TrangThaiNhom, string> = {
  dieu_chinh: "Đã điều chỉnh cách hiểu",
  hieu_dung: "Hiểu đúng",
  ho_tro: "Cần hỗ trợ thêm",
  dang_lam: "Đang làm",
};

export function PhieuTongKet({
  maPhien,
  tieuDe,
  tongQuan,
  thuVien,
  onQuayLai,
}: {
  maPhien: string;
  tieuDe: string;
  tongQuan: TongQuan;
  thuVien: ThuVien;
  onQuayLai: () => void;
}) {
  const ten = (m: MaNgoNhan) => thuVien.ngo_nhan.ngo_nhan.find((n) => n.ma === m)?.ten ?? m;
  const ngoNhan = MA.filter((m) => m !== "M0" && m !== "KXD").sort((a, b) => tongQuan.ban_do[b] - tongQuan.ban_do[a]);
  const phoBien = ngoNhan[0] && tongQuan.ban_do[ngoNhan[0]] > 0 ? ngoNhan[0] : null;
  const trangThai = tongQuan.nhom.map(trangThaiNhom);
  const dem = (t: TrangThaiNhom) => trangThai.filter((x) => x === t).length;
  const coDuLieu = MA.some((m) => tongQuan.ban_do[m] > 0);

  return (
    <div className="phieu">
      <div className="hang khong-in" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <button className="phu" onClick={onQuayLai}>
          ← Quay lại
        </button>
        <div className="hang">
          <a className="nut phu" href={`/api/phien/${maPhien}/xuat-csv`} download>
            Tải nhật ký học tập (CSV, mở bằng Excel)
          </a>
          <button onClick={() => window.print()}>In phiếu / lưu PDF</button>
        </div>
      </div>

      <div className="the">
        <h2>Phiếu tổng kết tiết học</h2>
        <p style={{ margin: 0 }}>
          <strong>Tình huống:</strong> {tieuDe}
        </p>
        <p className="muted" style={{ margin: "0.2rem 0 0" }}>
          Mã phiên {maPhien} · ngày {new Date().toLocaleDateString("vi-VN")} · dữ liệu ẩn danh, chỉ có tên nhóm
        </p>
      </div>

      <div className="luoi-3 phieu-chi-so">
        <div className="o-so">
          <div className="nhan">Số nhóm tham gia</div>
          <div className="so-lon">{tongQuan.nhom.length}</div>
        </div>
        <div className="o-so">
          <div className="nhan">Ngộ nhận phổ biến nhất</div>
          <div className="so-lon" style={{ fontSize: "1.5rem" }}>
            {phoBien ? `${phoBien} · ${tongQuan.ban_do[phoBien]} nhóm` : "–"}
          </div>
          {phoBien && <div className="muted">{ten(phoBien)}</div>}
        </div>
        <div className="o-so">
          <div className="nhan">Nhóm đã điều chỉnh (mức tăng lần 1 → 3)</div>
          <div className="so-lon">
            {tongQuan.chuyen_doi.so_nhom ? `${tongQuan.chuyen_doi.so_tang}/${tongQuan.chuyen_doi.so_nhom}` : "–"}
          </div>
        </div>
        <div className="o-so">
          <div className="nhan">Nhóm cần hỗ trợ thêm</div>
          <div className="so-lon">{dem("ho_tro")}</div>
        </div>
      </div>

      <div className="the">
        <h2>Bản đồ ngộ nhận của lớp</h2>
        {coDuLieu ? (
          <BieuDoCot ngang tieuDe="Số nhóm" nhan={MA.map((m) => `${m} · ${ten(m)}`)} giaTri={MA.map((m) => tongQuan.ban_do[m])} />
        ) : (
          <p className="muted">Chưa có nhóm nào gửi dự đoán.</p>
        )}
      </div>

      <div className="the">
        <h2>Tiến trình từng nhóm</h2>
        {tongQuan.nhom.length === 0 ? (
          <p className="muted">Chưa có nhóm.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Dự đoán ban đầu</th>
                <th>Ngộ nhận</th>
                <th>Mức 1 → 2 → 3</th>
                <th>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {tongQuan.nhom.map((n, i) => (
                <tr key={n.id}>
                  <td>{tenNhom(n.ma_nhom)}</td>
                  <td>{n.lan1 ?? "–"}</td>
                  <td>{n.ma_cuoi ?? "–"}</td>
                  <td>{[n.muc1, n.muc2, n.muc3].map((m) => m ?? "–").join(" → ")}</td>
                  <td>
                    <span className={`huy-hieu ${trangThai[i] === "ho_tro" ? "cho" : trangThai[i] === "dang_lam" ? "KXD" : "M0"}`}>{NHAN[trangThai[i]!]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ marginTop: "0.8rem" }}>
          Mức rubric: 1 chưa hiểu đúng · 2 hiểu một phần · 3 hiểu đúng nhưng chưa đầy đủ · 4 hiểu đúng và có lập luận.
        </p>
      </div>
    </div>
  );
}
