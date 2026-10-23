// Bản đồ ngộ nhận cả lớp, chỉ số chuyển đổi, hàng chờ duyệt và xuất dữ liệu.
import type { MaNgoNhan } from "@plab/core";
import { useState } from "react";
import type { ThuVien } from "../App";
import { api, type NhomTongQuan, type TongQuan } from "../api";
import { BieuDoCot } from "../components/BieuDo";
import { tenNhom } from "../ten-nhom";

const MA: MaNgoNhan[] = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"];

function DuyetChanDoan({ n, onXong }: { n: NhomTongQuan; onXong: () => void }) {
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  if (!n.chan_doan_id) return <span className="muted">Chưa có</span>;

  const gui = async (ketLuan: "dung" | "sai", maSua?: MaNgoNhan) => {
    setDang(true);
    setLoi(null);
    try {
      await api.danhGia(n.chan_doan_id!, ketLuan, maSua ?? null);
      onXong();
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDang(false);
    }
  };

  return (
    <div className="hang" style={{ gap: "0.4rem" }}>
      {n.ket_luan === "dung" && <span className="huy-hieu M0">GV xác nhận đúng</span>}
      {n.ket_luan === "sai" && <span className="huy-hieu cho">GV sửa thành {n.ma_sua}</span>}
      {n.ket_luan !== "dung" && (
        <button className="nho tot" disabled={dang} onClick={() => gui("dung")}>
          Đúng
        </button>
      )}
      <select
        aria-label="Sửa mã ngộ nhận"
        style={{ width: "auto", padding: "0.25rem 0.4rem", fontSize: "0.85rem" }}
        value=""
        disabled={dang}
        onChange={(e) => e.target.value && gui("sai", e.target.value as MaNgoNhan)}
      >
        <option value="">Sửa thành…</option>
        {MA.filter((m) => m !== n.ma_cuoi).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {loi && <span className="huy-hieu loi">{loi}</span>}
    </div>
  );
}

export function TongQuanLop({
  maPhien,
  tongQuan,
  thuVien,
  onThayDoi,
  onChonNhom,
}: {
  maPhien: string;
  tongQuan: TongQuan;
  thuVien: ThuVien;
  onThayDoi: () => void;
  onChonNhom: (id: string) => void;
}) {
  const ten = (m: MaNgoNhan) => thuVien.ngo_nhan.ngo_nhan.find((n) => n.ma === m)?.ten ?? m;
  const coDuLieu = MA.some((m) => tongQuan.ban_do[m] > 0);
  const cd = tongQuan.chuyen_doi;

  return (
    <>
      <div className="the">
        <h2>Bản đồ ngộ nhận của lớp</h2>
        {coDuLieu ? (
          <BieuDoCot ngang tieuDe="Số nhóm" nhan={MA.map((m) => `${m} · ${ten(m)}`)} giaTri={MA.map((m) => tongQuan.ban_do[m])} />
        ) : (
          <p className="muted">Chưa có nhóm nào gửi dự đoán.</p>
        )}
      </div>
      <div>
        <div className="the">
          <h2>Tiến trình nhận thức</h2>
          <div className="luoi-3">
            <div className="o-so">
              <div className="nhan">Số nhóm</div>
              <div className="so-lon">{tongQuan.nhom.length}</div>
            </div>
            <div className="o-so">
              <div className="nhan">Cần duyệt</div>
              <div className="so-lon">{tongQuan.hang_cho.length}</div>
            </div>
            <div className="o-so">
              <div className="nhan">Tăng mức từ lần 1 → 3</div>
              <div className="so-lon">{cd.so_nhom ? `${cd.so_tang}/${cd.so_nhom}` : "–"}</div>
            </div>
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Chỉ số chuyển đổi tính trên các nhóm đã có mức rubric ở cả lần 1 và lần 3.
          </p>
          <a className="nut phu" href={`/api/phien/${maPhien}/xuat-csv`}>
            Xuất dữ liệu ẩn danh (CSV)
          </a>
        </div>
      </div>

      <div className="the">
        <h2>Các nhóm</h2>
        {tongQuan.nhom.length === 0 ? (
          <p className="muted">Chưa có nhóm.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Nhóm</th>
                  <th>Dự đoán ban đầu</th>
                  <th>Nhận định</th>
                  <th>Mức 1 → 2 → 3</th>
                  <th>Duyệt của giáo viên</th>
                </tr>
              </thead>
              <tbody>
                {tongQuan.nhom.map((n) => (
                  <tr key={n.id} className={n.can_duyet && !n.ket_luan ? "cho-duyet" : ""}>
                    <td>
                      <button className="nho phu" onClick={() => onChonNhom(n.id)}>
                        {tenNhom(n.ma_nhom)}
                      </button>
                    </td>
                    <td>{n.lan1 ?? <span className="muted">Chưa gửi</span>}</td>
                    <td>
                      {n.ma_cuoi ? (
                        <>
                          <span className={`huy-hieu ${n.ma_cuoi === "M0" ? "M0" : n.ma_cuoi === "KXD" ? "KXD" : "loi"}`}>{n.ma_cuoi}</span>{" "}
                          <span className="muted">
                            {n.nguon === "lai" ? "luật + AI" : n.nguon === "llm" ? "AI" : "bộ luật"}
                            {n.do_tin_cay != null && ` · ${Math.round(n.do_tin_cay * 100)}%`}
                          </span>
                          {n.can_duyet && !n.ket_luan && <div className="muted">⚠ {n.ly_do_duyet}</div>}
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td>{[n.muc1, n.muc2, n.muc3].map((m) => m ?? "–").join(" → ")}</td>
                    <td>
                      <DuyetChanDoan n={n} onXong={onThayDoi} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
