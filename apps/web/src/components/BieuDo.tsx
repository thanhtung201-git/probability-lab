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
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { DiemBieuDo } from "@plab/core";

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const MAU_CHINH = "#1f4fd1";
const MAU_LY_THUYET = "#d1495b";
const CO_CHU = 16;

/** `ngang`: cột nằm ngang, hợp với nhãn dài (ví dụ tên ngộ nhận) để không bị xoay chữ. */
export function BieuDoCot({
  nhan,
  giaTri,
  tieuDe,
  ngang = false,
}: {
  nhan: string[];
  giaTri: number[];
  tieuDe: string;
  ngang?: boolean;
}) {
  const trucGiaTri = {
    beginAtZero: true,
    ticks: { font: { size: CO_CHU }, precision: 0 },
    title: { display: true, text: tieuDe, font: { size: CO_CHU } },
  };
  const trucNhan = { ticks: { font: { size: CO_CHU } } };
  return (
    <div className="bieu-do" style={ngang ? { height: Math.max(220, nhan.length * 44) } : undefined}>
      <Bar
        data={{ labels: nhan, datasets: [{ label: tieuDe, data: giaTri, backgroundColor: MAU_CHINH, borderRadius: 6 }] }}
        options={{
          indexAxis: ngang ? "y" : "x",
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600 },
          plugins: { legend: { display: false } },
          scales: ngang ? { x: trucGiaTri, y: trucNhan } : { x: trucNhan, y: trucGiaTri },
        }}
      />
    </div>
  );
}

export function BieuDoDuong({
  diem,
  lyThuyet,
  nhanTruc,
  nhanX,
  logX = false,
}: {
  diem: DiemBieuDo[];
  lyThuyet: number;
  nhanTruc: string;
  nhanX: string;
  logX?: boolean;
}) {
  const xMax = diem.length ? diem[diem.length - 1]!.x : 1;
  const xMin = diem.length ? diem[0]!.x : 1;
  return (
    <div className="bieu-do">
      <Line
        data={{
          datasets: [
            {
              label: "Tần suất thực nghiệm",
              data: diem,
              borderColor: MAU_CHINH,
              backgroundColor: MAU_CHINH,
              pointRadius: 0,
              borderWidth: 3,
              tension: 0.15,
            },
            {
              label: "Xác suất lý thuyết",
              data: [
                { x: xMin, y: lyThuyet },
                { x: xMax, y: lyThuyet },
              ],
              borderColor: MAU_LY_THUYET,
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
              type: logX ? "logarithmic" : "linear",
              min: xMin,
              max: xMax,
              title: { display: true, text: nhanX, font: { size: CO_CHU } },
              ticks: { font: { size: CO_CHU } },
            },
            y: {
              min: 0,
              max: 1,
              title: { display: true, text: nhanTruc, font: { size: CO_CHU } },
              ticks: { font: { size: CO_CHU }, callback: (v) => `${Math.round(Number(v) * 100)}%` },
            },
          },
        }}
      />
    </div>
  );
}
