import Image from "next/image";
import NetFlowPieChart from "../components/charts/PieChart";
import Link from "next/link";
import { Button } from "@mui/material";

export default function Home() {
  return (
    <main className="h-screen w-screen bg-white text-black ">
      <div className="flex flex-row gap-4 py-3 items-center justify-center">
        <Button variant="contained">
          <Link href="/protocol_pie">Protocol distribution</Link>
        </Button>
        <Button variant="contained">
          <Link href="/aggregate_line">Trafic over time</Link>
        </Button>
      </div>
    </main>
    /* <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer> */
  );
}
