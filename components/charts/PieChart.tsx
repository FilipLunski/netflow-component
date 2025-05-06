import React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import { get } from "http";
import { getProtocolStats } from "@/lib/getNetFLowStats";
import { Metric, ProtocolType } from "@/lib/netFlowTypes";
import { SeriesValueFormatter } from "@mui/x-charts/internals";
import { PieValueType } from "@mui/x-charts";

const NetFlowPieChart: React.FC<{
  protocolType: ProtocolType;
  metric: Metric;
  startDate: Date;
  endDate: Date;
}> = ({ protocolType, metric, startDate, endDate }) => {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    getProtocolStats(protocolType, metric, startDate, endDate).then((data) => {
      setData(data);
      console.log(data);
    });
  }, [metric, startDate, endDate]);

  const volumeFormatter: SeriesValueFormatter<PieValueType> = (
    pieValue: PieValueType
  ) => {
    const value = pieValue.value;
    if (value === null) {
      return null;
    }
    if (metric === "packets") {
      if (value < 1000) {
        return value.toString();
      }
      if (value < 1000000) {
        return `${(value / 1000).toFixed(2)}K`;
      }
      return `${(value / 1000000).toFixed(2)}M`;
    } else {
      let volumeUnit = "";
      let volumeReductionFactor = 1;
      if (value < 1000) {
        volumeUnit = "B";
      } else if (value < 1000000) {
        volumeUnit = "KB";
        volumeReductionFactor = 1000;
      } else if (value < 1000000000) {
        volumeUnit = "MB";
        volumeReductionFactor = 1000000;
      } else if (value < 1000000000000) {
        volumeUnit = "GB";
        volumeReductionFactor = 1000000000;
      } else if (value < 1000000000000000) {
        volumeUnit = "TB";
        volumeReductionFactor = 1000000000000;
      } else if (value < 1000000000000000000) {
        volumeUnit = "PB";
        volumeReductionFactor = 1000000000000000;
      }
      console.log(
        `${(value / volumeReductionFactor).toFixed(2)} ${volumeUnit}`
      );
      return `${(value / volumeReductionFactor).toFixed(2)} ${volumeUnit}`;
    }
  };

  return (
    <PieChart
      className="h-screen w-screen"
      series={[
        {
          arcLabelMinAngle: 35,
          arcLabelRadius: "60%",
          valueFormatter: volumeFormatter,
          data: data,
          highlightScope: { fade: "global", highlight: "item" },
          innerRadius: 13,
          outerRadius: 100,
          paddingAngle: 1,
          cornerRadius: 4,
          // startAngle: 90,
          // endAngle: 450,
        },
      ]}
      width={200}
      height={200}
    />
  );
};

export default NetFlowPieChart;
