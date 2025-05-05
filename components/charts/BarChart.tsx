"use client";
import React from "react";
import {
  getTopTalkers,
} from "@/lib/getNetFLowStats";
import { Metric } from "@/lib/netFlowTypes";
import { SeriesValueFormatter } from "@mui/x-charts/internals";
import { BarChart } from "@mui/x-charts";

const NetFlowBarChart: React.FC<{
  metric: Metric;
  startDate: Date;
  endDate: Date;
}> = ({ metric, startDate, endDate }) => {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    console.log(
      "Start Date: ",
      startDate,
      "; End Date: ",
      endDate,
      "; Metric: ",
      metric
    );
    getTopTalkers(10, metric, startDate, endDate).then(setData);
  }, [startDate, endDate, metric]);

  React.useEffect(() => {
    console.log("Data: ", data);
  }
  , [data]);

  const volumeFormatter: SeriesValueFormatter<number | null> = (
    value: number | null
  ) => {
    if (value === null) {
      return null;
    }
    if (metric === "count") {
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
      return `${(value / volumeReductionFactor).toFixed(2)} ${volumeUnit}`;
    }
  };

  return (
    <BarChart
      dataset={data}
      xAxis={[
        {
          label: metric === "count" ? "Count" : "Volume",
        },
      ]}
      yAxis={[{ scaleType: "band", dataKey: "address", width: 100 }]}
      series={[
        {
          dataKey: "amount",
          valueFormatter: volumeFormatter,
        },
      ]}
      layout="horizontal"
      height={300}
      width={800}
    />
  );
};

export default NetFlowBarChart;
