// =====================================================
// BACKFILL DATA HOTSPOT HISTORIS
// BPHL XI BANJARBARU
// =====================================================

const { spawnSync } = require("child_process");
const path = require("path");

const TZ = "Asia/Makassar";

function tanggalLokalSekarang() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function parseTanggal(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        throw new Error("Tanggal harus YYYY-MM-DD: " + s);
    }
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function formatTanggal(d) {
    return d.toISOString().slice(0, 10);
}

function tambahHari(d, n = 1) {
    const x = new Date(d.getTime());
    x.setUTCDate(x.getUTCDate() + n);
    return x;
}

const hariIni = tanggalLokalSekarang();
const kemarin = formatTanggal(
    tambahHari(parseTanggal(hariIni), -1)
);

const start = process.env.START_DATE || "2026-01-01";
const end = process.env.END_DATE || kemarin;

const startDate = parseTanggal(start);
const endDate = parseTanggal(end);

if (startDate > endDate) {
    throw new Error("START_DATE tidak boleh lebih besar dari END_DATE.");
}

console.log("========================================");
console.log("BACKFILL HOTSPOT SIPONGI");
console.log("Mulai :", start);
console.log("Selesai:", end);
console.log("========================================");

const script = path.join(__dirname, "update-hotspot.js");

let current = startDate;
let berhasil = 0;
let gagal = 0;

while (current <= endDate) {
    const tanggal = formatTanggal(current);
    console.log("\n>>> Memproses " + tanggal);

    let ok = false;

    for (let percobaan = 1; percobaan <= 3; percobaan++) {
        const result = spawnSync(
            process.execPath,
            [script],
            {
                stdio: "inherit",
                env: {
                    ...process.env,
                    HOTSPOT_DATE: tanggal
                }
            }
        );

        if (result.status === 0) {
            ok = true;
            break;
        }

        console.warn(
            "Percobaan " + percobaan +
            " gagal untuk " + tanggal
        );

        if (percobaan < 3) {
            spawnSync(
                process.execPath,
                ["-e", "setTimeout(()=>{},5000)"],
                { stdio: "inherit" }
            );
        }
    }

    if (ok) {
        berhasil++;
    } else {
        gagal++;
        console.error("GAGAL PERMANEN:", tanggal);
    }

    current = tambahHari(current);
}

console.log("\n========================================");
console.log("BACKFILL SELESAI");
console.log("Berhasil:", berhasil);
console.log("Gagal   :", gagal);
console.log("========================================");

if (gagal > 0) {
    process.exit(1);
}
