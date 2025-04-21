import React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import { get } from "http";
import { getProtocolStats } from "@/lib/getNetFLowStats";


const NetFlowPieChart: React.FC = async () => {

  const data = await getProtocolStats("app", "volume", )
  console.log(data);
  return (
    <PieChart className="h-screen w-screen" 
      series={[
        {
          data: data,
          innerRadius: 13,
      outerRadius: 100,
      paddingAngle: 2,
      cornerRadius: 4,
      startAngle: -45,
      endAngle: 315,
        }
        
      ]}
      width={200}
      height={200}
    />
  );
};

export default NetFlowPieChart;
