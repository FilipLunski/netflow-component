"use client";
import React from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { getVolumOverTime } from "@/lib/getNetFLowStats";
import { Granularity, Metric } from "@/lib/netFlowTypes";
import { SeriesValueFormatter } from "@mui/x-charts/internals";
import { start } from "repl";

const dateFormatter = (granularity: Granularity): ((date: Date) => string) => {
  return (d: Date) => {
    // console.log("datetime: "+d);
    const date = new Date(d);
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      if (date.getDate() === 1) {
        return date.toLocaleTimeString("UTC", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
      } else {
        return date.toLocaleTimeString("UTC", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
      }
    }
    if (["1m", "5m", "30m", "1h"].includes(granularity)) {
      return date.toLocaleTimeString("UTC", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleTimeString("UTC", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    }
  };
};

const NetFlowLineChart: React.FC<{
  granularity: Granularity;
  metric: Metric;
  startDate: Date;
  endDate: Date;
  ipAddress: string;
}> = ({ granularity, metric, startDate, endDate, ipAddress }) => {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    console.log(
      "Granularity: ",
      granularity,
      "; Metric: ",
      metric,
      "; Start Date: ",
      startDate,
      "; End Date: ",
      endDate,
      "; IP Address: ",
      ipAddress
    );
    getVolumOverTime(granularity, metric, startDate, endDate, ipAddress).then(setData);
  }, [granularity, metric, startDate, endDate, ipAddress]);

  const volumeFormatter: SeriesValueFormatter<number | null> = (
    value: number | null
  ) => {
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
      return `${(value / volumeReductionFactor).toFixed(2)} ${volumeUnit}`;
    }
  };

  return (
    <LineChart
      dataset={data}
      xAxis={[
        {
          dataKey: "time",
          valueFormatter: dateFormatter(granularity),
          min: startDate,
          max: endDate,
        },
      ]}
      series={[
        {
          dataKey: "inbound",
          area: true,
          valueFormatter: volumeFormatter,
          showMark: false,
          stack: "total",
          label: "Inbound",
        },
        {
          dataKey: "outbound",
          area: true,
          valueFormatter: volumeFormatter,
          showMark: false,
          stack: "total",
          label: "Outbound",
        },
        {
          dataKey: "internal",
          area: true,
          valueFormatter: volumeFormatter,
          showMark: false,
          stack: "total",
          label: "Internal",
        },
      ]}
      height={300}
      width={800}
      grid={{ vertical: true, horizontal: true }}
    />
  );
};

export default NetFlowLineChart;
