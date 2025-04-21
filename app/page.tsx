import Image from "next/image";
import NetFlowPieChart from "../components/charts/PieChart";

export default function Home() {
  return (
      <main className="h-screen w-screen bg-white">
        <NetFlowPieChart />
      </main>
      /* <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer> */
  );
}
